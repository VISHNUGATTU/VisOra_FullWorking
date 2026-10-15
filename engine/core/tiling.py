import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional

class AdaptiveTiler:
    """
    Adaptive Tiling Engine for High-Resolution & Crowded Classroom Feeds.
    Slices large frames (1080p, 2K, 4K) into overlapping tiles to detect small,
    distant student faces without choking the CPU, and merges results via NMS.
    """

    @staticmethod
    def calculate_tiles(
        img_w: int,
        img_h: int,
        tile_w: int = 640,
        tile_h: int = 640,
        overlap_ratio: float = 0.20
    ) -> List[Tuple[int, int, int, int]]:
        """
        Calculates overlapping (x1, y1, x2, y2) tile coordinates.
        Ensures full coverage with an overlap margin so faces at boundaries aren't clipped.
        """
        step_x = int(tile_w * (1.0 - overlap_ratio))
        step_y = int(tile_h * (1.0 - overlap_ratio))

        tiles = []
        y = 0
        while y < img_h:
            y1 = y
            y2 = min(y1 + tile_h, img_h)
            if y2 - y1 < tile_h and y1 > 0:
                y1 = max(0, img_h - tile_h)
                y2 = img_h

            x = 0
            while x < img_w:
                x1 = x
                x2 = min(x1 + tile_w, img_w)
                if x2 - x1 < tile_w and x1 > 0:
                    x1 = max(0, img_w - tile_w)
                    x2 = img_w

                tiles.append((x1, y1, x2, y2))
                if x2 >= img_w:
                    break
                x += step_x

            if y2 >= img_h:
                break
            y += step_y

        # Remove duplicate tile slices
        unique_tiles = []
        for t in tiles:
            if t not in unique_tiles:
                unique_tiles.append(t)
        return unique_tiles

    @staticmethod
    def compute_iou(box1: List[float], box2: List[float]) -> float:
        """Calculates Intersection-over-Union (IoU) between two bounding boxes."""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])

        intersection = max(0.0, x2 - x1) * max(0.0, y2 - y1)
        area1 = max(0.0, box1[2] - box1[0]) * max(0.0, box1[3] - box1[1])
        area2 = max(0.0, box2[2] - box2[0]) * max(0.0, box2[3] - box2[1])

        union = area1 + area2 - intersection
        if union <= 0.0:
            return 0.0
        return intersection / union

    @classmethod
    def merge_detections(cls, detections: List[Dict], iou_threshold: float = 0.45) -> List[Dict]:
        """
        Non-Maximum Suppression (NMS) across tile seams to merge duplicate face detections.
        Prioritizes detections with higher confidence scores.
        """
        if not detections:
            return []

        # Sort detections descending by detection score
        sorted_dets = sorted(detections, key=lambda d: d.get("det_score", 0.0), reverse=True)
        kept = []

        while sorted_dets:
            best = sorted_dets.pop(0)
            kept.append(best)

            remaining = []
            for d in sorted_dets:
                iou = cls.compute_iou(best["bbox"], d["bbox"])
                if iou < iou_threshold:
                    remaining.append(d)
            sorted_dets = remaining

        return kept

    @classmethod
    def process_adaptive(
        cls,
        pipeline,
        img_bgr: np.ndarray,
        tile_size: Tuple[int, int] = (640, 640),
        overlap_ratio: float = 0.20,
        min_dim_for_tiling: int = 900
    ) -> List[Dict]:
        """
        Adaptive Inference:
        - If image dimensions are within standard range, runs standard full-frame detection.
        - If image is high-resolution (e.g. 1080p, 4K panorama), runs full-frame + tile-based
          detection, maps tile boxes to global coordinates, and merges them with NMS.
        """
        h, w = img_bgr.shape[:2]

        # 1. Base full-frame pass (captures medium to large faces)
        all_detections = pipeline.process_image(img_bgr)

        # 2. Check if image is large enough to benefit from tiling
        if max(h, w) < min_dim_for_tiling:
            return all_detections

        # 3. Generate adaptive tiles
        tiles = cls.calculate_tiles(w, h, tile_w=tile_size[0], tile_h=tile_size[1], overlap_ratio=overlap_ratio)

        for (x1, y1, x2, y2) in tiles:
            tile_crop = img_bgr[y1:y2, x1:x2]
            # Detect on tile crop
            tile_dets = pipeline.process_image(tile_crop)

            # Map local tile coordinates to global frame
            for det in tile_dets:
                bx1, by1, bx2, by2 = det["bbox"]
                det["bbox"] = [
                    float(bx1 + x1),
                    float(by1 + y1),
                    float(bx2 + x1),
                    float(by2 + y1)
                ]

                # Map 5-point landmarks
                if "landmarks" in det and det["landmarks"]:
                    det["landmarks"] = [
                        [float(pt[0] + x1), float(pt[1] + y1)]
                        for pt in det["landmarks"]
                    ]

                all_detections.append(det)

        # 4. Global NMS merge across tile seams
        merged_detections = cls.merge_detections(all_detections, iou_threshold=0.45)
        return merged_detections

adaptive_tiler = AdaptiveTiler()
