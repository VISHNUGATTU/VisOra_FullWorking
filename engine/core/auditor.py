import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import numpy as np

from engine.core.pipeline import pipeline
from engine.core.tiling import adaptive_tiler
from engine.core.tracking import OpticalFaceTracker
from engine.core.sensor_fusion import SensorTelemetry
from engine.core.scheduler import schedule_manager, LectureSlotSchedule

class AuditSession:
    """
    Patent-Compliant Classroom & Lecture Attendance Audit Session.
    Implements:
    - Randomized Attendance Trigger (Patent Claim 1c, Claim 3)
    - Adaptive Reactivation Mechanism (Patent Claim 1d, Claim 4)
    - Continuous Presence Duration & Dwell-Time Validation (Patent Claim 1d, Claim 4)
    - Deferred Consolidation Phase (Patent Claim 1g, Claim 5)
    """

    def __init__(
        self,
        session_id: str,
        subject: str = "",
        branch: str = "",
        section: str = "",
        year: int = None,
        min_presence_duration_seconds: int = 900,  # 15 minutes by default
        monitoring_duration_seconds: int = 2400     # 40 minutes monitoring window
    ):
        self.session_id = session_id
        self.subject = subject
        self.branch = branch
        self.section = section
        self.year = year
        self.created_at = datetime.utcnow().isoformat()
        self.created_epoch = time.time()

        # Session Lifecycle State:
        # SCHEDULED -> CAPTURE_ACTIVE -> MONITORING_WINDOW -> REACTIVATED -> CONSOLIDATING -> CONSOLIDATED
        self.state = "CAPTURE_ACTIVE"
        self.random_offset_min = 15  # Default randomized offset
        self.trigger_time_iso = self.created_at

        # Timing and Presence Thresholds
        self.min_presence_duration_seconds = min_presence_duration_seconds
        self.monitoring_duration_seconds = monitoring_duration_seconds
        self.initial_capture_duration_seconds = 180  # Initial 3-minute capture burst

        # Tracker with Kalman Filter and Continuous rPPG Pulse
        self.tracker = OpticalFaceTracker(max_age=30, min_hits=2)

        # Student Presence Telemetry Registry: rollno -> Record
        self.student_presence: Dict[str, Dict[str, Any]] = {}
        self.total_frames_processed: int = 0
        self.detection_interval: int = 5  # Run heavy neural pass every 5th frame
        self.last_reactivation_epoch: Optional[float] = None
        self.reactivation_count: int = 0

    def set_random_trigger_info(self, random_offset_min: int, trigger_time_iso: str):
        """Attaches randomized timetable trigger metadata from APScheduler."""
        self.random_offset_min = random_offset_min
        self.trigger_time_iso = trigger_time_iso

    def process_frame(
        self,
        frame_bgr: np.ndarray,
        force_detection: bool = False,
        use_adaptive_tiling: bool = True,
        telemetry: Optional[SensorTelemetry] = None
    ) -> Dict[str, Any]:
        """
        Processes a single video stream frame with Adaptive Reactivation & Dwell-Time Tracking.
        """
        self.total_frames_processed += 1
        current_epoch = time.time()
        elapsed_seconds = current_epoch - self.created_epoch

        # 1. Evaluate Session Phase Lifecycle
        if elapsed_seconds > (self.initial_capture_duration_seconds + self.monitoring_duration_seconds):
            if self.state not in ["CONSOLIDATING", "CONSOLIDATED"]:
                self.state = "CONSOLIDATING"
        elif elapsed_seconds > self.initial_capture_duration_seconds:
            if self.state in ["CAPTURE_ACTIVE", "REACTIVATED"]:
                self.state = "MONITORING_WINDOW"

        # 2. Check for Adaptive Reactivation condition
        # If in MONITORING_WINDOW and a new un-identified face appears in the scene,
        # reactivate neural recognition to identify the latecomer immediately!
        is_reactivation_frame = False
        if self.state == "MONITORING_WINDOW":
            # Check if tracker has any un-identified active tracklet
            has_unidentified_active = any(
                (not t.identity.get("identified", False) and t.kalman.hits >= 2)
                for t in self.tracker.tracklets
            )
            if has_unidentified_active or force_detection:
                is_reactivation_frame = True
                self.state = "REACTIVATED"
                self.reactivation_count += 1
                self.last_reactivation_epoch = current_epoch
                print(f"[*] [ADAPTIVE REACTIVATION #{self.reactivation_count}] New entrant detected in monitoring window! "
                      f"Reactivating ArcFace neural inference (Patent Claim 1d).")

        # Determine if heavy neural detection is needed
        is_detection_frame = (
            force_detection or
            is_reactivation_frame or
            (self.total_frames_processed % self.detection_interval == 0) or
            (self.total_frames_processed == 1)
        )

        detections = None
        if is_detection_frame:
            if use_adaptive_tiling:
                detections = adaptive_tiler.process_adaptive(pipeline, frame_bgr)
            else:
                detections = pipeline.process_image(frame_bgr)

        # Optional Department/Section filtering
        filter_criteria = {}
        if self.branch:
            filter_criteria["branch"] = self.branch
        if self.section:
            filter_criteria["section"] = self.section
        if self.year:
            filter_criteria["year"] = self.year

        # Update Optical Kalman Tracker & Sensor Fusion
        tracked_faces = self.tracker.update(
            frame_bgr=frame_bgr,
            detections=detections,
            is_detection_frame=is_detection_frame,
            pipeline=pipeline,
            filter_criteria=filter_criteria if filter_criteria else None,
            telemetry=telemetry
        )

        # 3. Update Student Presence & Dwell-Time Duration Registry
        now_iso = datetime.utcnow().isoformat()
        for face in tracked_faces:
            ident = face.get("identity", {})
            liveness = face.get("liveness", {})
            fusion = face.get("fusion", {})

            if ident.get("identified") and ident.get("rollno"):
                rollno = ident["rollno"]

                if rollno not in self.student_presence:
                    # Determine arrival classification:
                    # If seen during initial capture burst -> ON_TIME
                    # If seen after initial capture during monitoring window -> LATE_ENTRANT
                    arrival_status = "ON_TIME" if elapsed_seconds <= self.initial_capture_duration_seconds else "LATE_ENTRANT"

                    self.student_presence[rollno] = {
                        "student_id": ident.get("student_id"),
                        "rollno": rollno,
                        "name": ident.get("name"),
                        "branch": ident.get("branch"),
                        "year": ident.get("year"),
                        "section": ident.get("section"),
                        "first_seen": now_iso,
                        "first_seen_epoch": current_epoch,
                        "last_seen": now_iso,
                        "last_seen_epoch": current_epoch,
                        "dwell_time_seconds": 0.0,
                        "confirmed_presence_frames": 1,
                        "frame_count": 1,
                        "max_similarity": ident.get("similarity", 0.0),
                        "heart_rate_bpm": liveness.get("heart_rate_bpm", 0.0),
                        "liveness_score": liveness.get("liveness_score", 0.0),
                        "fused_confidence": fusion.get("fused_confidence", 0.0),
                        "security_verdict": fusion.get("security_verdict", "INITIALIZING"),
                        "is_live": liveness.get("is_live", False),
                        "arrival_status": arrival_status,
                        "is_presence_qualified": (arrival_status == "ON_TIME"),
                        "attendance_status": "BORDERLINE_MONITORING" if arrival_status == "LATE_ENTRANT" else "VERIFIED_PRESENT",
                        "authorized": fusion.get("authorized", False)
                    }
                else:
                    rec = self.student_presence[rollno]
                    rec["frame_count"] += 1
                    rec["confirmed_presence_frames"] += 1
                    rec["last_seen"] = now_iso
                    rec["last_seen_epoch"] = current_epoch
                    dwell = round(current_epoch - rec["first_seen_epoch"], 1)
                    rec["dwell_time_seconds"] = dwell
                    rec["max_similarity"] = max(rec["max_similarity"], ident.get("similarity", 0.0))

                    if liveness.get("heart_rate_bpm", 0.0) > 0:
                        rec["heart_rate_bpm"] = liveness.get("heart_rate_bpm")
                    rec["liveness_score"] = max(rec["liveness_score"], liveness.get("liveness_score", 0.0))
                    rec["fused_confidence"] = max(rec["fused_confidence"], fusion.get("fused_confidence", 0.0))
                    rec["security_verdict"] = fusion.get("security_verdict", rec["security_verdict"])
                    rec["is_live"] = rec["is_live"] or liveness.get("is_live", False)
                    rec["authorized"] = rec["authorized"] or fusion.get("authorized", False)

                    # Continuous Presence Duration Check (Patent Claim 1d & 4)
                    if rec["arrival_status"] == "LATE_ENTRANT":
                        if dwell >= self.min_presence_duration_seconds:
                            rec["is_presence_qualified"] = True
                            rec["attendance_status"] = "VERIFIED_PRESENT"
                        else:
                            rec["is_presence_qualified"] = False
                            rec["attendance_status"] = "BORDERLINE_MONITORING"
                    else:
                        rec["is_presence_qualified"] = True
                        rec["attendance_status"] = "VERIFIED_PRESENT"

        # If we were in REACTIVATED state, settle back into MONITORING_WINDOW
        if self.state == "REACTIVATED" and not is_reactivation_frame:
            self.state = "MONITORING_WINDOW"

        # Count students who are both verified and presence-qualified
        verified_count = len([
            s for s in self.student_presence.values()
            if s.get("authorized") and s.get("is_presence_qualified")
        ])

        return {
            "session_id": self.session_id,
            "session_state": self.state,
            "frame_index": self.total_frames_processed,
            "is_detection_frame": is_detection_frame,
            "is_reactivation_frame": is_reactivation_frame,
            "reactivation_count": self.reactivation_count,
            "tracked_faces_count": len(tracked_faces),
            "tracked_faces": tracked_faces,
            "verified_students_count": verified_count,
            "randomized_trigger": {
                "offset_minutes": self.random_offset_min,
                "trigger_time_iso": self.trigger_time_iso
            }
        }

    def get_summary(self, min_frames_threshold: int = 3) -> Dict[str, Any]:
        """
        Deferred Attendance Consolidation Summary (Patent Claim 1g, Claim 5).
        Consolidates authenticated students, separates qualified late entrants from
        transient passersby who left before meeting the minimum presence duration.
        """
        present_students = []
        flagged_spoofs = []
        transient_rejects = []
        current_epoch = time.time()

        for s in self.student_presence.values():
            dwell = round(s["last_seen_epoch"] - s["first_seen_epoch"], 1)
            time_since_last_seen = current_epoch - s["last_seen_epoch"]

            # Spoof check
            if "REJECTED" in s.get("security_verdict", "") or not s.get("is_live", True):
                s["attendance_status"] = "REJECTED_SPOOF"
                flagged_spoofs.append(s)
                continue

            # Presence duration qualification check
            if s["arrival_status"] == "LATE_ENTRANT":
                if dwell < self.min_presence_duration_seconds:
                    s["attendance_status"] = "REJECTED_TRANSIENT"
                    s["rejection_reason"] = f"Dwell time ({dwell}s) below required minimum ({self.min_presence_duration_seconds}s)"
                    transient_rejects.append(s)
                    continue

            # If qualified on presence and biometric authorization
            if s["frame_count"] >= min_frames_threshold and s.get("authorized", False):
                s["attendance_status"] = "VERIFIED_PRESENT"
                present_students.append(s)
            else:
                # Borderline fallback
                present_students.append(s)

        return {
            "session_id": self.session_id,
            "subject": self.subject,
            "branch": self.branch,
            "section": self.section,
            "year": self.year,
            "session_state": self.state,
            "total_frames_processed": self.total_frames_processed,
            "present_count": len(present_students),
            "spoof_flags_count": len(flagged_spoofs),
            "transient_rejected_count": len(transient_rejects),
            "reactivations_triggered": self.reactivation_count,
            "min_presence_duration_seconds": self.min_presence_duration_seconds,
            "present_students": present_students,
            "flagged_spoofs": flagged_spoofs,
            "transient_rejects": transient_rejects
        }

    def get_presence_breakdown(self) -> Dict[str, Any]:
        """Returns real-time telemetry on student dwell times and arrival classifications."""
        on_time = []
        late_qualified = []
        late_monitoring = []
        transient = []

        for s in self.student_presence.values():
            dwell = s.get("dwell_time_seconds", 0.0)
            if s.get("arrival_status") == "ON_TIME":
                on_time.append(s)
            elif s.get("arrival_status") == "LATE_ENTRANT":
                if dwell >= self.min_presence_duration_seconds:
                    late_qualified.append(s)
                else:
                    late_monitoring.append(s)

        return {
            "session_id": self.session_id,
            "session_state": self.state,
            "total_tracked": len(self.student_presence),
            "on_time_count": len(on_time),
            "late_qualified_count": len(late_qualified),
            "late_monitoring_count": len(late_monitoring),
            "min_presence_duration_seconds": self.min_presence_duration_seconds,
            "students": list(self.student_presence.values())
        }


class SessionManager:
    """Manages active auditing sessions and coordinates with the RandomizedScheduleManager."""

    def __init__(self):
        self.sessions: Dict[str, AuditSession] = {}
        # Connect APScheduler callback
        schedule_manager.register_trigger_callback(self._on_schedule_trigger)

    def _on_schedule_trigger(self, slot: LectureSlotSchedule):
        """Called automatically by APScheduler when a randomized capture fires."""
        session_id = slot.session_id or f"SESSION_{slot.slot_id}_{int(time.time())}"
        session = self.get_or_create(
            session_id=session_id,
            subject=slot.subject,
            branch=slot.branch,
            section=slot.section,
            year=slot.year,
            min_presence_duration_seconds=slot.min_presence_duration_min * 60
        )
        session.set_random_trigger_info(slot.random_offset_min, slot.trigger_time_iso or datetime.utcnow().isoformat())
        print(f"[+] [SessionManager] Initialized session '{session_id}' from APScheduler randomized trigger.")

    def get_or_create(
        self,
        session_id: str,
        subject: str = "",
        branch: str = "",
        section: str = "",
        year: int = None,
        min_presence_duration_seconds: int = 900
    ) -> AuditSession:
        if session_id not in self.sessions:
            self.sessions[session_id] = AuditSession(
                session_id=session_id,
                subject=subject,
                branch=branch,
                section=section,
                year=year,
                min_presence_duration_seconds=min_presence_duration_seconds
            )
        return self.sessions[session_id]

    def get(self, session_id: str) -> Optional[AuditSession]:
        return self.sessions.get(session_id)

    def close(self, session_id: str) -> Optional[Dict[str, Any]]:
        session = self.sessions.pop(session_id, None)
        if session:
            session.state = "CONSOLIDATED"
            return session.get_summary()
        return None


# Singleton instance
session_manager = SessionManager()
