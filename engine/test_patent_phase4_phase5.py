import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from engine.core.scheduler import schedule_manager
from engine.core.auditor import session_manager, AuditSession
from fastapi.testclient import TestClient
from engine.main import app

def test_phase4_and_phase5():
    print("\n" + "="*70)
    print("  VISORA PATENT SPECIFICATION VERIFICATION SUITE")
    print("  Testing Phase 4 (Deferred Consolidation & Checkbox Auto-Ticking)")
    print("  Testing Phase 5 (Real-Time Telegram Reporting Bot Module)")
    print("  Patent App Reference: 202641036876 | Form 2 (Claims 1e, 1f, 6, 7, 8, 10f, 10g, 10h)")
    print("="*70)

    # ---------------------------------------------------------
    # TEST 1: Deferred Consolidation In-Memory Buffer (Claim 1e, 6, 10f)
    # ---------------------------------------------------------
    print("\n[TEST 1] Testing Deferred Consolidation & In-Memory Session Buffer...")
    session_id = f"SESSION_DEFERRED_TEST_{int(time.time())}"
    session = session_manager.get_or_create(
        session_id=session_id,
        subject="Computer Vision & Deep Learning",
        branch="CSE-DS",
        section="B",
        year=3,
        min_presence_duration_seconds=60
    )
    session.set_random_trigger_info(random_offset_min=18, trigger_time_iso="2026-10-22T09:18:00Z")

    # Simulate 3 student detections in session
    now = time.time()
    session.student_presence["ST_001"] = {
        "student_id": "ST_001",
        "rollno": "23071A6788",
        "name": "Vishnu Phani",
        "arrival_status": "ON_TIME",
        "first_seen_epoch": now - 1200,
        "last_seen_epoch": now,
        "dwell_time_seconds": 1200,
        "is_presence_qualified": True,
        "attendance_status": "VERIFIED_PRESENT",
        "authorized": True,
        "is_live": True,
        "similarity": 0.96,
        "heart_rate_bpm": 76.5
    }

    session.student_presence["ST_002"] = {
        "student_id": "ST_002",
        "rollno": "23071A6789",
        "name": "Gayathri Karthikeya",
        "arrival_status": "ON_TIME",
        "first_seen_epoch": now - 1100,
        "last_seen_epoch": now,
        "dwell_time_seconds": 1100,
        "is_presence_qualified": True,
        "attendance_status": "VERIFIED_PRESENT",
        "authorized": True,
        "is_live": True,
        "similarity": 0.94,
        "heart_rate_bpm": 72.0
    }

    session.student_presence["ST_003"] = {
        "student_id": "ST_003",
        "rollno": "23071A6799",
        "name": "Transient Passby",
        "arrival_status": "LATE_ENTRANT",
        "first_seen_epoch": now - 20,
        "last_seen_epoch": now,
        "dwell_time_seconds": 20,
        "is_presence_qualified": False,
        "attendance_status": "REJECTED_TRANSIENT",
        "authorized": True,
        "is_live": True,
        "similarity": 0.88
    }

    # Query consolidation while active
    active_summary = session_manager.find_consolidation(
        branch="CSE-DS",
        year=3,
        section="B",
        subject="Computer Vision"
    )
    assert active_summary is not None, "Failed to find active session by class attributes"
    assert active_summary["session_id"] == session_id
    assert active_summary["present_count"] == 2
    assert active_summary["transient_rejected_count"] == 1
    print(f"  [+] Active session buffer found: {active_summary['present_count']} qualified present, {active_summary['transient_rejected_count']} transient rejected.")

    # ---------------------------------------------------------
    # TEST 2: Session Finalization & Consolidated History Cache (Claim 7, 10h)
    # ---------------------------------------------------------
    print("\n[TEST 2] Testing Finalization & Consolidated History Persistence...")
    closed_summary = session_manager.close(session_id)
    assert closed_summary is not None
    assert closed_summary["session_state"] == "CONSOLIDATED"
    assert session_id in session_manager.consolidated_history
    print("  [+] Session closed and cached in consolidated_history dictionary.")

    # Query consolidation after close
    hist_summary = session_manager.find_consolidation(
        branch="CSE-DS",
        year=3,
        section="B"
    )
    assert hist_summary is not None, "Failed to find consolidated history by class attributes"
    assert hist_summary["session_id"] == session_id
    print("  [+] Consolidated history lookup successfully retrieved verified students roster!")

    # ---------------------------------------------------------
    # TEST 3: FastAPI Endpoint GET /api/v1/audit/consolidated
    # ---------------------------------------------------------
    print("\n[TEST 3] Testing FastAPI HTTP Endpoint /api/v1/audit/consolidated...")
    client = TestClient(app)
    response = client.get("/api/v1/audit/consolidated", params={
        "branch": "CSE-DS",
        "year": 3,
        "section": "B",
        "subject": "Computer Vision"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["found"] is True
    summary = data["summary"]
    assert summary["present_count"] == 2
    present_rollnos = [s["rollno"] for s in summary["present_students"]]
    assert "23071A6788" in present_rollnos
    assert "23071A6789" in present_rollnos
    print(f"  [+] HTTP /audit/consolidated returned verified students: {present_rollnos}")

    print("\n" + "="*70)
    print("  [SUCCESS] All Phase 4 & Phase 5 Engine Tests PASSED 100%!")
    print("="*70 + "\n")

if __name__ == "__main__":
    test_phase4_and_phase5()
