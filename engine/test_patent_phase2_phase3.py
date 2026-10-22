import sys
import time
from pathlib import Path
import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from engine.core.scheduler import schedule_manager, LectureSlotSchedule
from engine.core.auditor import session_manager, AuditSession
from engine.core.vector_store import vector_store

def test_patent_phase2_and_3():
    print("\n" + "="*70)
    print("  VISORA PATENT SPECIFICATION VERIFICATION SUITE")
    print("  Testing Phase 2 (Randomized Scheduler) & Phase 3 (Adaptive Reactivation)")
    print("  Patent App Reference: 202641036876 | Form 2 (Claims 1c, 1d, 3, 4, 10c, 10d)")
    print("="*70)

    # ---------------------------------------------------------
    # TEST 1: APScheduler Randomized Capture Trigger (Claim 1c, 3, 10c)
    # ---------------------------------------------------------
    print("\n[TEST 1] Registering Timetable Slot with Randomized Window...")
    slot = schedule_manager.schedule_lecture(
        slot_id="SLOT_CSE_DS_3B_DL",
        subject="Deep Learning & Neural Networks",
        branch="CSE-DS",
        year=3,
        section="B",
        start_time_str="09:00",
        end_time_str="10:00",
        min_offset_min=10,
        max_offset_min=25,
        min_presence_duration_min=15,
        room="LAB_602"
    )

    print(f"  [+] Slot registered: {slot.subject} ({slot.branch}-{slot.section})")
    print(f"  [+] Randomized offset computed: +{slot.random_offset_min} minutes (Range: [10, 25]m)")
    assert 10 <= slot.random_offset_min <= 25, f"Offset {slot.random_offset_min} not in range [10, 25]"
    assert slot.status == "PENDING"

    # Fire trigger via simulation / trigger_now
    print("  [*] Firing randomized capture trigger...")
    schedule_manager.trigger_now("SLOT_CSE_DS_3B_DL")
    assert slot.status == "TRIGGERED"
    assert slot.session_id is not None
    print(f"  [+] APScheduler successfully triggered session: {slot.session_id}")

    # Verify session was automatically initialized in SessionManager via callback
    active_session = session_manager.get(slot.session_id)
    assert active_session is not None, "SessionManager failed to create session from trigger callback"
    assert active_session.subject == "Deep Learning & Neural Networks"
    assert active_session.random_offset_min == slot.random_offset_min
    print("  [+] SessionManager bound to randomized APScheduler trigger verified!")

    # ---------------------------------------------------------
    # TEST 2: Adaptive Reactivation & Dwell-Time Duration (Claim 1d, 4, 10d)
    # ---------------------------------------------------------
    print("\n[TEST 2] Testing Adaptive Reactivation & Presence Duration...")
    # Create test session with a compact presence requirement for automated testing (0.5s dwell threshold)
    test_session_id = f"TEST_AUDIT_{int(time.time())}"
    session = session_manager.get_or_create(
        session_id=test_session_id,
        subject="Computer Vision",
        branch="CSE-DS",
        section="B",
        year=3,
        min_presence_duration_seconds=1  # 1 second for fast unit test validation
    )
    # Fast-forward initial capture duration so session enters MONITORING_WINDOW
    session.initial_capture_duration_seconds = 0.05
    time.sleep(0.06)

    # Synthetic frame: 640x480 black image
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)

    # Frame 1: Triggers transition to MONITORING_WINDOW
    res1 = session.process_frame(dummy_frame)
    print(f"  [+] Session state after initial burst: {res1['session_state']}")
    assert res1["session_state"] == "MONITORING_WINDOW"

    # Frame 2: Introduce an unknown tracklet -> Adaptive Reactivation MUST trigger!
    print("  [*] Simulating new entrant arriving in classroom during monitoring window...")
    from engine.core.tracking import Tracklet
    new_entrant_tracklet = Tracklet([100, 100, 250, 250], det_score=0.95)
    new_entrant_tracklet.kalman.hits = 2  # confirmed track
    session.tracker.tracklets.append(new_entrant_tracklet)

    res2 = session.process_frame(dummy_frame)
    print(f"  [+] Frame 2 Detection Response: state={res2['session_state']}, "
          f"reactivated={res2['is_reactivation_frame']}, count={res2['reactivation_count']}")
    assert res2["is_reactivation_frame"] is True or res2["session_state"] == "REACTIVATED"
    assert res2["reactivation_count"] >= 1
    print("  [+] Adaptive Reactivation triggered on new entrant verified! (Claim 1d)")

    # ---------------------------------------------------------
    # TEST 3: Dwell Time Duration & Transient Passerby Rejection (Claim 1d & 4)
    # ---------------------------------------------------------
    print("\n[TEST 3] Testing Dwell Time & Presence Duration Criteria...")
    # Inject 2 students:
    # Student A: On-Time (Enters at start)
    # Student B: Late Entrant who stays only 0.2s (Transient Passerby -> Should be REJECTED)
    # Student C: Late Entrant who stays >= 1.0s (Genuine Latecomer -> Should be VERIFIED)
    now_epoch = time.time()
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    # Student A: On-time
    session.student_presence["23071A6788"] = {
        "student_id": "698c244927b9fdd9c02561cf",
        "rollno": "23071A6788",
        "name": "GATTU VISHNU PHANI",
        "branch": "CSE-DS",
        "year": 3,
        "section": "B",
        "first_seen": now_iso,
        "first_seen_epoch": now_epoch - 30,
        "last_seen": now_iso,
        "last_seen_epoch": now_epoch,
        "dwell_time_seconds": 30.0,
        "confirmed_presence_frames": 15,
        "frame_count": 15,
        "max_similarity": 0.88,
        "heart_rate_bpm": 72.0,
        "liveness_score": 0.95,
        "fused_confidence": 0.92,
        "security_verdict": "VERIFIED_LIVING_IDENTITY",
        "is_live": True,
        "arrival_status": "ON_TIME",
        "is_presence_qualified": True,
        "attendance_status": "VERIFIED_PRESENT",
        "authorized": True
    }

    # Student B: Transient passerby (leaves after 0.1s, required is 1.0s)
    session.student_presence["23071A6700"] = {
        "student_id": "temp_transient_01",
        "rollno": "23071A6700",
        "name": "TRANSIENT PASSERBY",
        "branch": "CSE-DS",
        "year": 3,
        "section": "B",
        "first_seen": now_iso,
        "first_seen_epoch": now_epoch,
        "last_seen": now_iso,
        "last_seen_epoch": now_epoch + 0.1,  # 0.1s dwell
        "dwell_time_seconds": 0.1,
        "confirmed_presence_frames": 2,
        "frame_count": 2,
        "max_similarity": 0.85,
        "heart_rate_bpm": 70.0,
        "liveness_score": 0.90,
        "fused_confidence": 0.88,
        "security_verdict": "VERIFIED_LIVING_IDENTITY",
        "is_live": True,
        "arrival_status": "LATE_ENTRANT",
        "is_presence_qualified": False,
        "attendance_status": "BORDERLINE_MONITORING",
        "authorized": True
    }

    # Student C: Genuine latecomer (dwell 1.2s >= 1.0s)
    session.student_presence["23071A6792"] = {
        "student_id": "698c230827b9fdd9c02561cc",
        "rollno": "23071A6792",
        "name": "GUMUDAVELLI MANI SAI",
        "branch": "CSE-DS",
        "year": 3,
        "section": "B",
        "first_seen": now_iso,
        "first_seen_epoch": now_epoch - 1.2,
        "last_seen": now_iso,
        "last_seen_epoch": now_epoch,
        "dwell_time_seconds": 1.2,
        "confirmed_presence_frames": 10,
        "frame_count": 10,
        "max_similarity": 0.86,
        "heart_rate_bpm": 74.0,
        "liveness_score": 0.92,
        "fused_confidence": 0.90,
        "security_verdict": "VERIFIED_LIVING_IDENTITY",
        "is_live": True,
        "arrival_status": "LATE_ENTRANT",
        "is_presence_qualified": True,
        "attendance_status": "VERIFIED_PRESENT",
        "authorized": True
    }

    # Consolidate session
    summary = session.get_summary(min_frames_threshold=2)
    print("\n[+] Consolidated Session Summary:")
    print(f"  - Present Count: {summary['present_count']}")
    print(f"  - Transient Rejects: {summary['transient_rejected_count']}")
    print(f"  - Reactivations Triggered: {summary['reactivations_triggered']}")

    present_rolls = [p["rollno"] for p in summary["present_students"]]
    transient_rolls = [t["rollno"] for t in summary["transient_rejects"]]
    print(f"  - Final Present Students: {present_rolls}")
    print(f"  - Final Rejected Transients: {transient_rolls}")

    # Assertions
    assert "23071A6788" in present_rolls, "On-Time student should be present"
    assert "23071A6792" in present_rolls, "Qualified Late Entrant should be present"
    assert "23071A6700" in transient_rolls, "Transient passerby must be rejected (Patent Claim 1d)"
    assert summary["transient_rejected_count"] == 1

    print("\n" + "="*70)
    print("  >>> ALL PHASE 2 & PHASE 3 PATENT CLAIMS 1c, 1d, 3, 4 VERIFIED! <<<")
    print("="*70 + "\n")

if __name__ == "__main__":
    test_patent_phase2_and_3()
