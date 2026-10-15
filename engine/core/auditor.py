import time
from datetime import datetime
from typing import Dict, List, Optional
import numpy as np

from engine.core.pipeline import pipeline
from engine.core.tiling import adaptive_tiler
from engine.core.tracking import OpticalFaceTracker
from engine.core.sensor_fusion import SensorTelemetry

class AuditSession:
    """Represents an active classroom or lecture attendance audit session."""

    def __init__(self, session_id: str, subject: str = "", branch: str = "", section: str = "", year: int = None):
        self.session_id = session_id
        self.subject = subject
        self.branch = branch
        self.section = section
        self.year = year
        self.created_at = datetime.utcnow().isoformat()

        self.tracker = OpticalFaceTracker(max_age=30, min_hits=2)
        # Aggregated student presence: rollno -> details
        self.student_presence: Dict[str, Dict] = {}
        self.total_frames_processed: int = 0
        self.detection_interval: int = 5  # Run heavy detection every 5th frame

    def process_frame(
        self,
        frame_bgr: np.ndarray,
        force_detection: bool = False,
        use_adaptive_tiling: bool = True,
        telemetry: Optional[SensorTelemetry] = None
    ) -> Dict:
        """
        Processes a single video stream frame:
        - Runs heavy neural detection periodically (or forced) vs optical tracking.
        - Analyzes rPPG capillary pulse across facial ROIs.
        - Fuses telemetry (PIR motion + Thermal surface temperature).
        """
        self.total_frames_processed += 1
        is_detection_frame = force_detection or (self.total_frames_processed % self.detection_interval == 0) or (self.total_frames_processed == 1)

        detections = None
        if is_detection_frame:
            if use_adaptive_tiling:
                detections = adaptive_tiler.process_adaptive(pipeline, frame_bgr)
            else:
                detections = pipeline.process_image(frame_bgr)

        filter_criteria = {}
        if self.branch:
            filter_criteria["branch"] = self.branch
        if self.section:
            filter_criteria["section"] = self.section
        if self.year:
            filter_criteria["year"] = self.year

        tracked_faces = self.tracker.update(
            frame_bgr=frame_bgr,
            detections=detections,
            is_detection_frame=is_detection_frame,
            pipeline=pipeline,
            filter_criteria=filter_criteria if filter_criteria else None,
            telemetry=telemetry
        )

        # Update presence and security registry
        now_ts = datetime.utcnow().isoformat()
        for face in tracked_faces:
            ident = face.get("identity", {})
            liveness = face.get("liveness", {})
            fusion = face.get("fusion", {})

            if ident.get("identified") and ident.get("rollno"):
                rollno = ident["rollno"]
                if rollno not in self.student_presence:
                    self.student_presence[rollno] = {
                        "student_id": ident.get("student_id"),
                        "rollno": rollno,
                        "name": ident.get("name"),
                        "branch": ident.get("branch"),
                        "year": ident.get("year"),
                        "section": ident.get("section"),
                        "first_seen": now_ts,
                        "last_seen": now_ts,
                        "frame_count": 1,
                        "max_similarity": ident.get("similarity", 0.0),
                        "heart_rate_bpm": liveness.get("heart_rate_bpm", 0.0),
                        "liveness_score": liveness.get("liveness_score", 0.0),
                        "fused_confidence": fusion.get("fused_confidence", 0.0),
                        "security_verdict": fusion.get("security_verdict", "INITIALIZING"),
                        "is_live": liveness.get("is_live", False),
                        "authorized": fusion.get("authorized", False)
                    }
                else:
                    rec = self.student_presence[rollno]
                    rec["frame_count"] += 1
                    rec["last_seen"] = now_ts
                    rec["max_similarity"] = max(rec["max_similarity"], ident.get("similarity", 0.0))
                    if liveness.get("heart_rate_bpm", 0.0) > 0:
                        rec["heart_rate_bpm"] = liveness.get("heart_rate_bpm")
                    rec["liveness_score"] = max(rec["liveness_score"], liveness.get("liveness_score", 0.0))
                    rec["fused_confidence"] = max(rec["fused_confidence"], fusion.get("fused_confidence", 0.0))
                    rec["security_verdict"] = fusion.get("security_verdict", rec["security_verdict"])
                    rec["is_live"] = rec["is_live"] or liveness.get("is_live", False)
                    rec["authorized"] = rec["authorized"] or fusion.get("authorized", False)

        return {
            "session_id": self.session_id,
            "frame_index": self.total_frames_processed,
            "is_detection_frame": is_detection_frame,
            "tracked_faces_count": len(tracked_faces),
            "tracked_faces": tracked_faces,
            "verified_students_count": len([s for s in self.student_presence.values() if s.get("authorized")])
        }

    def get_summary(self, min_frames_threshold: int = 3) -> Dict:
        """
        Returns audited attendance list for this session, separating authenticated
        living students from spoof attempts or unverified tracks.
        """
        present_students = []
        flagged_spoof_attempts = []

        for s in self.student_presence.values():
            if s["frame_count"] >= min_frames_threshold:
                if s.get("authorized", False):
                    present_students.append(s)
                elif "REJECTED" in s.get("security_verdict", "") or not s.get("is_live", True):
                    flagged_spoof_attempts.append(s)
                else:
                    # Still borderline
                    present_students.append(s)

        return {
            "session_id": self.session_id,
            "subject": self.subject,
            "branch": self.branch,
            "section": self.section,
            "year": self.year,
            "total_frames_processed": self.total_frames_processed,
            "present_count": len(present_students),
            "spoof_flags_count": len(flagged_spoof_attempts),
            "present_students": present_students,
            "flagged_spoofs": flagged_spoof_attempts
        }


class SessionManager:
    """Manages active auditing sessions."""

    def __init__(self):
        self.sessions: Dict[str, AuditSession] = {}

    def get_or_create(
        self,
        session_id: str,
        subject: str = "",
        branch: str = "",
        section: str = "",
        year: int = None
    ) -> AuditSession:
        if session_id not in self.sessions:
            self.sessions[session_id] = AuditSession(
                session_id=session_id,
                subject=subject,
                branch=branch,
                section=section,
                year=year
            )
        return self.sessions[session_id]

    def get(self, session_id: str) -> Optional[AuditSession]:
        return self.sessions.get(session_id)

    def close(self, session_id: str) -> Optional[Dict]:
        session = self.sessions.pop(session_id, None)
        if session:
            return session.get_summary()
        return None

session_manager = SessionManager()
