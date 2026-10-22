import time
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.date import DateTrigger

class LectureSlotSchedule:
    """Represents a scheduled lecture slot with randomized attendance trigger windows."""

    def __init__(
        self,
        slot_id: str,
        subject: str,
        branch: str,
        year: int,
        section: str,
        start_time_str: str,  # "HH:MM" e.g. "09:00"
        end_time_str: str,    # "HH:MM" e.g. "10:00"
        min_offset_min: int = 10,
        max_offset_min: int = 25,
        min_presence_duration_min: int = 15,
        room: str = "ROOM_101"
    ):
        self.slot_id = slot_id
        self.subject = subject
        self.branch = branch
        self.year = year
        self.section = section
        self.start_time_str = start_time_str
        self.end_time_str = end_time_str
        self.min_offset_min = min_offset_min
        self.max_offset_min = max_offset_min
        self.min_presence_duration_min = min_presence_duration_min
        self.room = room

        # Compute randomized trigger offset in minutes
        self.random_offset_min = random.randint(min_offset_min, max(min_offset_min, max_offset_min))
        self.created_at = datetime.utcnow().isoformat()
        self.status = "PENDING"  # PENDING -> TRIGGERED -> MONITORING -> COMPLETED
        self.session_id: Optional[str] = None
        self.trigger_time_iso: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "slot_id": self.slot_id,
            "subject": self.subject,
            "branch": self.branch,
            "year": self.year,
            "section": self.section,
            "start_time": self.start_time_str,
            "end_time": self.end_time_str,
            "random_offset_min": self.random_offset_min,
            "min_presence_duration_min": self.min_presence_duration_min,
            "status": self.status,
            "session_id": self.session_id,
            "trigger_time_iso": self.trigger_time_iso,
            "patent_claims": ["Claim 1c (Randomized Trigger)", "Claim 1d (Adaptive Reactivation)", "Claim 1g (Deferred Sync)"]
        }


class RandomizedScheduleManager:
    """
    Patent-Compliant APScheduler Automation Module (Patent Claim 1c, Claim 3 & Claim 10c).
    Dynamically schedules attendance-capture jobs based on institutional class schedules,
    employing a randomized triggering algorithm that initiates capture at unpredictable intervals
    within the scheduled class hour to prevent premeditated presence and proxy manipulation.
    """

    def __init__(self):
        self.scheduler = BackgroundScheduler(daemon=True)
        self.scheduled_slots: Dict[str, LectureSlotSchedule] = {}
        self.trigger_callbacks: List[Callable[[LectureSlotSchedule], None]] = []
        self._is_running = False

    def start(self):
        """Starts the background APScheduler."""
        if not self._is_running:
            self.scheduler.start()
            self._is_running = True
            print("[+] APScheduler Automation Engine running (VisOra Patent Claim 1c/3).")

    def register_trigger_callback(self, callback: Callable[[LectureSlotSchedule], None]):
        """Registers a callback function to be executed when a randomized capture triggers."""
        self.trigger_callbacks.append(callback)

    def schedule_lecture(
        self,
        slot_id: str,
        subject: str,
        branch: str,
        year: int,
        section: str,
        start_time_str: str,
        end_time_str: str,
        min_offset_min: int = 10,
        max_offset_min: int = 25,
        min_presence_duration_min: int = 15,
        room: str = "ROOM_101",
        run_relative_seconds: Optional[int] = None
    ) -> LectureSlotSchedule:
        """
        Schedules a lecture with a randomized trigger.
        If run_relative_seconds is given, schedules trigger X seconds from now (ideal for testing/simulations).
        Otherwise, computes stochastic trigger relative to today's start_time_str.
        """
        self.start()

        slot = LectureSlotSchedule(
            slot_id=slot_id,
            subject=subject,
            branch=branch,
            year=year,
            section=section,
            start_time_str=start_time_str,
            end_time_str=end_time_str,
            min_offset_min=min_offset_min,
            max_offset_min=max_offset_min,
            min_presence_duration_min=min_presence_duration_min,
            room=room
        )

        now = datetime.now()

        if run_relative_seconds is not None:
            # Demonstration / test mode: trigger after run_relative_seconds
            trigger_dt = now + timedelta(seconds=run_relative_seconds)
        else:
            # Real production timetable mode
            try:
                start_h, start_m = map(int, start_time_str.split(":"))
                slot_start_dt = now.replace(hour=start_h, minute=start_m, second=0, microsecond=0)
                # Stochastic trigger: Slot Start + Random Offset
                trigger_dt = slot_start_dt + timedelta(minutes=slot.random_offset_min)
                if trigger_dt < now:
                    # If already passed today, schedule for next occurrence or immediate demonstration
                    trigger_dt = now + timedelta(seconds=10)
            except Exception:
                trigger_dt = now + timedelta(minutes=slot.random_offset_min)

        slot.trigger_time_iso = trigger_dt.isoformat()
        self.scheduled_slots[slot_id] = slot

        # Schedule the APScheduler Job
        job_id = f"job_capture_{slot_id}"
        self.scheduler.add_job(
            func=self._execute_capture_trigger,
            trigger=DateTrigger(run_date=trigger_dt),
            args=[slot_id],
            id=job_id,
            replace_existing=True
        )

        print(f"[*] [APScheduler] Lecture '{subject}' ({branch} Year {year}-{section}) scheduled. "
              f"Randomized trigger window: +{slot.random_offset_min}m -> Trigger at: {trigger_dt.strftime('%H:%M:%S')}")

        return slot

    def _execute_capture_trigger(self, slot_id: str):
        """Fired by APScheduler when the randomized trigger time is reached."""
        slot = self.scheduled_slots.get(slot_id)
        if not slot:
            return

        slot.status = "TRIGGERED"
        session_id = f"SESSION_{slot.branch}_{slot.year}{slot.section}_{slot.slot_id}_{int(time.time())}"
        slot.session_id = session_id

        print(f"\n=======================================================")
        print(f"  [*] [APSCHEDULER RANDOMIZED TRIGGER FIRED]")
        print(f"  Slot: {slot.subject} ({slot.branch}-{slot.section})")
        print(f"  Random Offset Applied: +{slot.random_offset_min} minutes")
        print(f"  Session Created: {session_id}")
        print(f"  Patent Spec: Claim 1c / Claim 3 (Anti-Proxy Protection)")
        print(f"=======================================================\n")

        # Notify callbacks (e.g. auditor session initialization)
        for cb in self.trigger_callbacks:
            try:
                cb(slot)
            except Exception as e:
                print(f"[!] Error in trigger callback: {e}")

    def trigger_now(self, slot_id: str) -> Optional[LectureSlotSchedule]:
        """Manually forces an immediate randomized capture execution for testing."""
        slot = self.scheduled_slots.get(slot_id)
        if slot:
            self._execute_capture_trigger(slot_id)
            return slot
        return None

    def get_all_slots(self) -> List[Dict[str, Any]]:
        return [slot.to_dict() for slot in self.scheduled_slots.values()]

    def get_slot(self, slot_id: str) -> Optional[LectureSlotSchedule]:
        return self.scheduled_slots.get(slot_id)


# Singleton Instance
schedule_manager = RandomizedScheduleManager()
