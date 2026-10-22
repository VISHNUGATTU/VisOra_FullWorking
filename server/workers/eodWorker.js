import FacultySchedule from "../models/FacultySchedule.js";
import Attendance from "../models/Attendance.js";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import neuralService from "../services/neuralService.js";
import telegramService from "../services/telegramService.js";
import { logAction } from "../configs/logger.js";
import crypto from "crypto";

/**
 * End-of-Day (EOD) Auto-Finalization Worker (Patent Claim 6, 7 & 10h).
 * Scans for classes held today where faculty did not perform manual overrides,
 * retrieves the accumulated in-memory neural session buffer, and commits
 * attendance directly to permanent institutional records.
 */
let lastExecutedDate = null;

export const runEODFinalization = async (customDate = null) => {
  const d = customDate ? new Date(customDate) : new Date();
  const dateStr = d.toISOString().slice(0, 10);
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

  console.log(`\n[*] [EODWorker] Starting End-of-Day Auto-Finalization for ${dayName}, ${dateStr}...`);

  // Find all faculty schedules scheduled on this weekday
  const schedules = await FacultySchedule.find({ day: dayName });
  console.log(`[*] [EODWorker] Found ${schedules.length} timetable slot(s) for ${dayName}.`);

  const results = {
    date: dateStr,
    day: dayName,
    totalScheduled: schedules.length,
    autoCommitted: 0,
    alreadyFinalized: 0,
    noNeuralData: 0,
    classes: []
  };

  const startOfDay = new Date(dateStr);
  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  for (const schedule of schedules) {
    const classId = schedule._id;
    const branch = schedule.branch;
    const year = schedule.year;
    const section = schedule.section || schedule.batch;
    const subject = schedule.subject;

    // Check if attendance already exists in MongoDB
    const existing = await Attendance.findOne({
      scheduleId: classId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existing) {
      results.alreadyFinalized++;
      results.classes.push({
        subject,
        classCode: `${branch}-${year}${section}`,
        status: "ALREADY_FINALIZED",
        mode: existing.consolidationMode || "MANUAL_OVERRIDE"
      });
      continue;
    }

    // Query Neural Engine temporary storage buffer for this class
    const neuralRes = await neuralService.getConsolidatedAttendance({
      branch,
      year,
      section,
      subject
    });

    if (!neuralRes.success || !neuralRes.data?.found) {
      results.noNeuralData++;
      results.classes.push({
        subject,
        classCode: `${branch}-${year}${section}`,
        status: "NO_NEURAL_DATA_SKIPPED"
      });
      continue;
    }

    const summary = neuralRes.data.summary;
    const students = await Student.find({ branch, year, section });

    const verifiedRollSet = new Set(
      (summary.present_students || []).map(s => (s.rollno || "").toUpperCase())
    );
    const verifiedIdSet = new Set(
      (summary.present_students || []).map(s => String(s.student_id || ""))
    );

    const absentStudentIds = [];
    const absentRollNos = [];

    students.forEach(std => {
      const isVerified = (std.rollno && verifiedRollSet.has(std.rollno.toUpperCase())) ||
                         verifiedIdSet.has(std._id.toString());
      if (!isVerified) {
        absentStudentIds.push(std._id);
        if (std.rollno) absentRollNos.push(std.rollno);
      }
    });

    const presentCount = students.length - absentStudentIds.length;
    const absentCount = absentStudentIds.length;

    // Generate cryptographic verification signature (Patent Claim 8)
    const verificationPayload = `${classId}_${dateStr}_${presentCount}_${absentCount}`;
    const cryptographicSignature = crypto.createHash("sha256").update(verificationPayload).digest("hex").slice(0, 16);

    // Commit attendance record to MongoDB (Patent Claim 7, 10h)
    await Attendance.create({
      scheduleId: classId,
      facultyId: schedule.facultyId,
      date: startOfDay,
      branch,
      year,
      section,
      absentees: absentStudentIds,
      isConsolidated: true,
      consolidationMode: "EOD_AUTO_COMMIT",
      telegramDispatched: true,
      cryptographicSignature,
      patentRef: "202641036876"
    });

    // Bulk update student cumulative records
    const classWeight = schedule.type === "Lab" ? 2 : 1;
    const bulkOps = students.map(std => {
      const isAbsent = absentStudentIds.includes(std._id);
      let records = std.attendanceRecord ? JSON.parse(JSON.stringify(std.attendanceRecord)) : [];
      let subIdx = records.findIndex(r => r.subject === subject);
      let subRec = subIdx !== -1 ? records[subIdx] : { subject, totalClasses: 0, presentClasses: 0, percentage: 0 };

      subRec.totalClasses += classWeight;
      if (!isAbsent) subRec.presentClasses += classWeight;
      subRec.percentage = subRec.totalClasses > 0 ? (subRec.presentClasses / subRec.totalClasses) * 100 : 100;

      if (subIdx === -1) records.push(subRec);
      else records[subIdx] = subRec;

      const gTotal = records.reduce((acc, c) => acc + (Number(c.totalClasses) || 0), 0);
      const gPresent = records.reduce((acc, c) => acc + (Number(c.presentClasses) || 0), 0);

      return {
        updateOne: {
          filter: { _id: std._id },
          update: {
            $set: {
              attendanceRecord: records,
              attendanceSummary: {
                totalClasses: gTotal,
                presentClasses: gPresent,
                percentage: gTotal > 0 ? (gPresent / gTotal) * 100 : 100
              }
            }
          }
        }
      };
    });

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    // Fetch faculty info for reporting
    const faculty = await Faculty.findById(schedule.facultyId);

    // Autonomously dispatch Telegram report (Patent Claim 1f, 8, 10g)
    await telegramService.sendAttendanceReport({
      subject,
      branch,
      year,
      section,
      facultyName: faculty?.name || "Faculty Member",
      presentCount,
      absentCount,
      totalStudents: students.length,
      absentRollNumbers: absentRollNos,
      randomOffsetMin: summary.random_offset_min || 15,
      date: dateStr,
      timeSlot: schedule.time || "Scheduled Slot"
    });

    // 📝 Log Audit Action
    await logAction({
      actionType: 'EOD_AUTO_FINALIZATION',
      title: 'End-of-Day Auto-Commit Executed',
      message: `Patent Claim 7 auto-finalized ${subject} (${branch}-${year}${section}): ${presentCount} Present, ${absentCount} Absent.`,
      actor: { role: 'VisOra_Automated_Worker' },
      metadata: {
        scheduleId: classId,
        date: dateStr,
        presentCount,
        absentCount,
        cryptographicSignature,
        patentRef: "202641036876"
      }
    });

    results.autoCommitted++;
    results.classes.push({
      subject,
      classCode: `${branch}-${year}${section}`,
      status: "EOD_AUTO_COMMITTED",
      presentCount,
      absentCount,
      cryptographicSignature
    });
  }

  console.log(`[+] [EODWorker] Auto-Finalization complete: ${results.autoCommitted} committed, ${results.alreadyFinalized} already finalized.`);
  return results;
};

/**
 * Initializes the background scheduler checking once every 60 seconds for 23:59 EOD window.
 */
export const initEODWorker = () => {
  console.log("[+] [EODWorker] Initializing VisOra End-of-Day Auto-Commit Scheduler (Patent Claim 6, 7 & 10h)...");

  setInterval(async () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const todayStr = now.toISOString().slice(0, 10);

    // Run at 23:59 (11:59 PM) once per day
    if (hours === 23 && minutes === 59 && lastExecutedDate !== todayStr) {
      lastExecutedDate = todayStr;
      try {
        await runEODFinalization(todayStr);
      } catch (err) {
        console.error("[!] [EODWorker] Error during automatic EOD finalization:", err.message);
      }
    }
  }, 60000);
};

export default { runEODFinalization, initEODWorker };
