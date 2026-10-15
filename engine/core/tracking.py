import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
from scipy.optimize import linear_sum_assignment
from engine.core.kalman import KalmanBoxTracker
from engine.core.tiling import AdaptiveTiler
from engine.core.vector_store import vector_store
from engine.core.rppg import rppg_detector
from engine.core.sensor_fusion import sensor_fusion_engine, SensorTelemetry

class Tracklet:
    """Represents a single continuous face track over time with biometric & liveness telemetry."""

    def __init__(self, bbox: list, det_score: float = 0.9, landmarks: list = None):
        self.kalman = KalmanBoxTracker(bbox)
        self.track_id = self.kalman.id
        self.det_score = det_score
        self.landmarks = landmarks or []

        # Identity info (once identified via ArcFace + FAISS)
        self.identity: Dict = {
            "identified": False,
            "similarity": 0.0,
            "student_id": None,
            "rollno": None,
            "name": "Unknown"
        }
        self.embedding: Optional[np.ndarray] = None
        self.best_sharpness: float = 0.0
        self.total_frames_seen: int = 1
        self.confirmed: bool = False

        # Phase 3: rPPG & Sensor Fusion Buffers
        self.rppg_buffer: List[np.ndarray] = []
        self.max_rppg_buffer: int = 50
        self.liveness: Dict = {
            "is_live": False,
            "liveness_score": 0.0,
            "heart_rate_bpm": 0.0,
            "snr_db": -99.0,
            "status": "BUFFERING",
            "message": "Collecting initial facial pulse frames"
        }
        self.fusion: Dict = {
            "authorized": False,
            "fused_confidence": 0.0,
            "security_verdict": "INITIALIZING",
            "breakdown": {}
        }

    def predict(self) -> list:
        return self.kalman.predict()

    def update(self, bbox: list, det_score: float, landmarks: list = None):
        self.kalman.update(bbox)
        self.det_score = det_score
        if landmarks:
            self.landmarks = landmarks
        self.total_frames_seen += 1
        if self.kalman.hits >= 2:
            self.confirmed = True

    def get_bbox(self) -> list:
        return self.kalman.get_state()

    def update_liveness_and_fusion(self, frame_bgr: np.ndarray, telemetry: Optional[SensorTelemetry] = None):
        """
        Extracts facial capillary RGB signal from the current frame, updates the
        temporal rPPG buffer, and runs multi-sensor fusion.
        """
        box = self.get_bbox()
        roi = rppg_detector.extract_skin_roi(frame_bgr, box, self.landmarks)
        if roi is not None:
            mean_rgb = rppg_detector.compute_roi_mean_rgb(roi)
            self.rppg_buffer.append(mean_rgb)
            if len(self.rppg_buffer) > self.max_rppg_buffer:
                self.rppg_buffer.pop(0)

        # Run pulse analysis once sufficient frames are buffered
        if len(self.rppg_buffer) >= 20:
            buffer_arr = np.array(self.rppg_buffer, dtype=np.float32)
            self.liveness = rppg_detector.analyze_pulse(buffer_arr)

        # Multi-sensor fusion
        fusion_res = sensor_fusion_engine.fuse(
            face_similarity=self.identity.get("similarity", 0.0),
            rppg_liveness=self.liveness,
            telemetry=telemetry
        )
        self.fusion = fusion_res.dict()

    @staticmethod
    def calculate_sharpness(face_crop: np.ndarray) -> float:
        """Calculates image sharpness via variance of Laplacian."""
        if face_crop is None or face_crop.size == 0:
            return 0.0
        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        return float(cv2.Laplacian(gray, cv2.CV_64F).var())

class OpticalFaceTracker:
    """
    High-Throughput Optical Face Tracker with Dual-Layer Anti-Spoofing.
    Bypasses CPU bottlenecks by separating high-rate spatial tracking (30-60+ FPS)
    from heavy neural inference, while continuously computing rPPG pulse dynamics.
    """

    def __init__(
        self,
        max_age: int = 20,
        min_hits: int = 2,
        iou_threshold: float = 0.30,
        sharpness_threshold: float = 50.0
    ):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.sharpness_threshold = sharpness_threshold
        self.tracklets: List[Tracklet] = []
        self.frame_count = 0

    def update(
        self,
        frame_bgr: np.ndarray,
        detections: Optional[List[Dict]] = None,
        is_detection_frame: bool = True,
        pipeline = None,
        filter_criteria: Optional[Dict] = None,
        telemetry: Optional[SensorTelemetry] = None
    ) -> List[Dict]:
        """
        Updates the tracker for the current video frame.
        - Associates observed detections on detection frames.
        - Predicts bounding boxes via Kalman Filter on intermediate frames.
        - Updates continuous rPPG liveness buffer and multi-sensor fusion on EVERY frame!
        """
        self.frame_count += 1
        h, w = frame_bgr.shape[:2]

        # 1. Predict new positions for all existing tracks
        for t in self.tracklets:
            t.predict()

        if is_detection_frame and detections is not None:
            # 2. Match detections to predicted track bounding boxes
            matched, unmatched_dets, unmatched_tracks = self._associate_detections_to_tracks(
                detections, self.tracklets
            )

            # 3. Update matched tracks
            for track_idx, det_idx in matched:
                det = detections[det_idx]
                track = self.tracklets[track_idx]
                track.update(det["bbox"], det["det_score"], det.get("landmarks"))

                # Check if we should extract/refresh ArcFace 512D embedding
                self._evaluate_and_identify_track(track, frame_bgr, det.get("embedding"), pipeline, filter_criteria)

            # 4. Create new tracks for unmatched detections
            for det_idx in unmatched_dets:
                det = detections[det_idx]
                new_track = Tracklet(det["bbox"], det["det_score"], det.get("landmarks"))
                self._evaluate_and_identify_track(new_track, frame_bgr, det.get("embedding"), pipeline, filter_criteria)
                self.tracklets.append(new_track)

        # 5. Continuous Liveness & Multi-Sensor Fusion update across ALL tracks
        for t in self.tracklets:
            t.update_liveness_and_fusion(frame_bgr, telemetry)

        # 6. Cull dead tracks (not seen for > max_age frames)
        alive_tracklets = []
        for t in self.tracklets:
            if t.kalman.time_since_update <= self.max_age:
                box = t.get_bbox()
                if (box[2] - box[0]) > 10 and (box[3] - box[1]) > 10:
                    alive_tracklets.append(t)
        self.tracklets = alive_tracklets

        # 7. Format results
        output = []
        for t in self.tracklets:
            if t.kalman.hits >= self.min_hits or not is_detection_frame:
                box = t.get_bbox()
                clamped_box = [
                    max(0.0, min(float(box[0]), float(w))),
                    max(0.0, min(float(box[1]), float(h))),
                    max(0.0, min(float(box[2]), float(w))),
                    max(0.0, min(float(box[3]), float(h)))
                ]

                output.append({
                    "track_id": t.track_id,
                    "bbox": clamped_box,
                    "det_score": round(t.det_score, 4),
                    "landmarks": t.landmarks,
                    "frames_tracked": t.total_frames_seen,
                    "time_since_update": t.kalman.time_since_update,
                    "is_interpolated": t.kalman.time_since_update > 0,
                    "identity": t.identity,
                    "liveness": t.liveness,
                    "fusion": t.fusion
                })

        return output

    def _associate_detections_to_tracks(
        self,
        detections: List[Dict],
        tracklets: List[Tracklet]
    ) -> Tuple[List[Tuple[int, int]], List[int], List[int]]:
        """Hungarian algorithm matching based on IoU cost matrix."""
        if len(tracklets) == 0:
            return [], list(range(len(detections))), []

        if len(detections) == 0:
            return [], [], list(range(len(tracklets)))

        iou_matrix = np.zeros((len(tracklets), len(detections)), dtype=np.float32)
        for t_idx, t in enumerate(tracklets):
            t_box = t.get_bbox()
            for d_idx, d in enumerate(detections):
                iou_matrix[t_idx, d_idx] = AdaptiveTiler.compute_iou(t_box, d["bbox"])

        row_ind, col_ind = linear_sum_assignment(-iou_matrix)

        matched = []
        unmatched_dets = list(range(len(detections)))
        unmatched_tracks = list(range(len(tracklets)))

        for r, c in zip(row_ind, col_ind):
            if iou_matrix[r, c] >= self.iou_threshold:
                matched.append((r, c))
                if c in unmatched_dets:
                    unmatched_dets.remove(c)
                if r in unmatched_tracks:
                    unmatched_tracks.remove(r)

        return matched, unmatched_dets, unmatched_tracks

    def _evaluate_and_identify_track(
        self,
        track: Tracklet,
        frame_bgr: np.ndarray,
        precomputed_emb: Optional[np.ndarray],
        pipeline,
        filter_criteria: Optional[Dict]
    ):
        """Extracts/refreshes ArcFace 512D embedding when quality is high."""
        box = [int(v) for v in track.get_bbox()]
        h, w = frame_bgr.shape[:2]
        x1, y1 = max(0, box[0]), max(0, box[1])
        x2, y2 = min(w, box[2]), min(h, box[3])

        if x2 - x1 < 20 or y2 - y1 < 20:
            return

        crop = frame_bgr[y1:y2, x1:x2]
        sharpness = Tracklet.calculate_sharpness(crop)

        should_identify = (
            not track.identity["identified"] or
            (sharpness > track.best_sharpness * 1.25 and sharpness > self.sharpness_threshold)
        )

        if not should_identify:
            return

        track.best_sharpness = max(track.best_sharpness, sharpness)

        emb = precomputed_emb
        if emb is None and pipeline is not None:
            try:
                emb, _, _ = pipeline.extract_enrollment_embedding(crop)
            except Exception:
                emb = None

        if emb is not None:
            track.embedding = emb
            match_res = vector_store.search_face(
                query_embedding=emb,
                top_k=1,
                filter_criteria=filter_criteria
            )
            track.identity = match_res
