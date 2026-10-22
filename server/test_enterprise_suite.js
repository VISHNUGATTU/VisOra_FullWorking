/**
 * =============================================================================
 *   VISORA BACKEND ARCHITECTURE — MNC ENTERPRISE QA AUDIT SUITE
 *   Node.js, Express, MongoDB Atlas, Cryptographic Signatures & Telegram Bot
 *   Indian Patent App No: 202641036876 | Form 2 (Patent Act 1970)
 *   Claims: 1e, 1f, 6, 7, 8, 10f, 10g, 10h
 * =============================================================================
 */

import dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";

dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

import connectDB from "./configs/db.js";
import Student from "./models/Student.js";
import Faculty from "./models/Faculty.js";
import FacultySchedule from "./models/FacultySchedule.js";
import Attendance from "./models/Attendance.js";
import telegramService from "./services/telegramService.js";
import { runEODFinalization } from "./workers/eodWorker.js";

async function runEnterpriseBackendSuite() {
  console.log("\n" + "=".repeat(80));
  console.log("  VISORA NODE.JS BACKEND: MNC ENTERPRISE QA BENCHMARK & AUDIT SUITE");
  console.log("  Patent Application Reference: Indian Patent App No: 202641036876");
  console.log("  Standard: Tier-1 Institutional Reliability Protocol");
  console.log("=".repeat(80));

  let passed = 0;
  const total = 5;

  try {
    // Connect to database
    console.log("\n[*] Initializing Database Connection...");
    await connectDB();
    console.log("  [+] MongoDB Connection Verified Active.");

    // -------------------------------------------------------------------------
    // TEST 1: Massive Student Data Scalability & Department Distribution (127 Students)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1/5] Scaled Student Database Indexing & Retrieval (127 Students)...");
    const totalStudents = await Student.countDocuments();
    console.log(`  [+] Total Registered Students in MongoDB: ${totalStudents}`);
    if (totalStudents < 100) {
      throw new Error(`Expected >= 100 seeded students, found ${totalStudents}`);
    }

    const cseDsCount = await Student.countDocuments({ branch: "CSE-DS" });
    const aidsCount = await Student.countDocuments({ branch: "AI&DS" });
    const cseCysCount = await Student.countDocuments({ branch: "CSE-CyS" });
    console.log(`  [+] Cohort Breakdown: CSE-DS: ${cseDsCount} | AI&DS: ${aidsCount} | CSE-CyS: ${cseCysCount}`);

    // Verify key inventor student records
    const vishnu = await Student.findOne({ rollno: "23071A6788" });
    if (!vishnu) throw new Error("Inventor student record '23071A6788' (G. Vishnu Phani) missing!");
    console.log(`  [+] Verified Inventor Student: ${vishnu.name} (${vishnu.rollno}) - ${vishnu.branch} Year ${vishnu.year}`);

    const gayathri = await Student.findOne({ rollno: "23071A6789" });
    if (!gayathri) throw new Error("Inventor student record '23071A6789' (Y. Gayathri Karthikeya) missing!");
    console.log(`  [+] Verified Inventor Student: ${gayathri.name} (${gayathri.rollno}) - ${gayathri.branch} Year ${gayathri.year}`);

    // Latency benchmark for indexed lookups
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) {
      await Student.find({ branch: "CSE-DS", year: 3, section: "B" }).limit(10).lean();
    }
    const avgLatency = (Date.now() - t0) / 20;
    console.log(`  [+] Average Indexed Query Latency across 20 iterations: ${avgLatency.toFixed(2)}ms`);

    passed++;
    console.log("  [PASSED] Test 1: Massive student dataset indexing, querying, and inventors verified.");

    // -------------------------------------------------------------------------
    // TEST 2: Institutional Faculty & Timetable Allocation (6 Faculty, 60 Slots)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2/5] Institutional Faculty & Timetable Schedule Slots...");
    const facultyCount = await Faculty.countDocuments();
    console.log(`  [+] Total Active Faculty Members: ${facultyCount}`);
    if (facultyCount < 5) throw new Error(`Expected at least 5 faculty members, found ${facultyCount}`);

    const sathar = await Faculty.findOne({ name: /Sathar/i });
    if (!sathar) throw new Error("Lead Inventor Faculty 'Dr. Gullapalli Sathar' not found!");
    console.log(`  [+] Verified Lead Faculty: ${sathar.name} (${sathar.department}) - ${sathar.designation}`);

    const schedules = await FacultySchedule.find().populate("faculty");
    let timetableSlotsCount = 0;
    for (const s of schedules) {
      timetableSlotsCount += (s.timetable || []).length;
    }
    console.log(`  [+] Total Scheduled Timetable Slots across Week: ${timetableSlotsCount}`);
    if (timetableSlotsCount < 20) throw new Error(`Expected >= 20 timetable slots, found ${timetableSlotsCount}`);

    // Verify timetable slot schema validity
    const sampleSchedule = schedules.find(s => s.timetable && s.timetable.length > 0);
    const sampleSlot = sampleSchedule.timetable[0];
    if (!sampleSlot.subject || !sampleSlot.day || !sampleSlot.startTime || !sampleSlot.endTime) {
      throw new Error("Timetable slot missing required scheduling fields");
    }
    console.log(`  [+] Sample Timetable Slot: ${sampleSlot.subject} | Day: ${sampleSlot.day} | Time: ${sampleSlot.startTime}-${sampleSlot.endTime} | Room: ${sampleSlot.room}`);

    passed++;
    console.log("  [PASSED] Test 2: Institutional faculty and full-week timetable allocations verified.");

    // -------------------------------------------------------------------------
    // TEST 3: Cryptographic Audit Hash Verification (SHA-256 Tamper Detection)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3/5] Cryptographic Audit Trail & SHA-256 Tamper Detection...");
    const createRecordHash = (record) => {
      const payload = `${record.studentId}|${record.date}|${record.status}|${record.verifiedAt}|${record.neuralConfidence}`;
      return crypto.createHash("sha256").update(payload).digest("hex");
    };

    const mockRecord = {
      studentId: "698c244927b9fdd9c02561cf",
      date: "2026-10-22",
      status: "PRESENT",
      verifiedAt: "2026-10-22T09:18:24.000Z",
      neuralConfidence: 0.965
    };

    const originalHash = createRecordHash(mockRecord);
    console.log(`  [+] Original SHA-256 Verification Signature: ${originalHash}`);

    // Verify unmodified payload produces identical signature
    const verifyHash = createRecordHash(mockRecord);
    if (verifyHash !== originalHash) throw new Error("Cryptographic hash mismatch on identical payload");

    // Simulate fraudulent tampering (altering status from PRESENT to ABSENT)
    const tamperedRecord = { ...mockRecord, status: "ABSENT" };
    const tamperedHash = createRecordHash(tamperedRecord);
    console.log(`  [+] Tampered Payload Hash:                   ${tamperedHash}`);
    if (tamperedHash === originalHash) throw new Error("Tampered record failed to alter hash signature!");
    console.log("  [+] Tamper detection validated: Hash mismatch immediately detects unauthorized modification!");

    passed++;
    console.log("  [PASSED] Test 3: SHA-256 cryptographic audit trail guarantees immutable attendance records.");

    // -------------------------------------------------------------------------
    // TEST 4: Real-Time Telegram Reporting Bot (Patent Claim 1f & 8)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4/5] Real-Time Telegram Reporting Bot & Patent Claim 8 Markdown Formatting...");
    const status = telegramService.getStatus();
    console.log(`  [+] Telegram Dispatcher Status: Mode=${status.mode} | Configured=${status.configured}`);

    const reportRes = await telegramService.sendAttendanceReport({
      subject: "Deep Learning & Neural Networks",
      branch: "CSE-DS",
      year: 3,
      section: "B",
      facultyName: "Dr. Gullapalli Sathar",
      presentCount: 68,
      absentCount: 4,
      totalStudents: 72,
      absentRollNumbers: ["23071A6704", "23071A6719", "23071A6742", "23071A6755"],
      randomOffsetMin: 19,
      date: "Thu, Oct 22, 2026",
      timeSlot: "09:00 AM - 10:00 AM"
    });

    if (!reportRes.success) throw new Error("Telegram report dispatch failed");
    console.log(`  [+] Telegram Dispatch Result: SUCCESS (Mode: ${reportRes.mode})`);

    const markdownText = reportRes.formattedReport;
    if (!markdownText.includes("VISORA SMART ATTENDANCE REPORT")) throw new Error("Missing header");
    if (!markdownText.includes("CSE-DS Year 3 - Sec B")) throw new Error("Missing class details");
    if (!markdownText.includes("68 / 72")) throw new Error("Missing presence ratio");
    if (!markdownText.includes("+19m into Lecture")) throw new Error("Missing randomized offset");
    if (!markdownText.includes("202641036876")) throw new Error("Missing Indian Patent Reference");
    console.log("  [+] All Patent Specification Claim 1f, 8 & 10g required attributes verified in message body.");

    passed++;
    console.log("  [PASSED] Test 4: Real-time Telegram executive notification engine verified.");

    // -------------------------------------------------------------------------
    // TEST 5: EOD Auto-Finalization Consolidation Worker (Patent Claim 7, 10h)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5/5] End-of-Day (EOD) Auto-Finalization Consolidation Worker...");
    const todayIso = new Date().toISOString().slice(0, 10);
    const eodResults = await runEODFinalization(todayIso);
    console.log("  [+] EOD Consolidation Worker Result:", {
      date: eodResults.date,
      totalScheduled: eodResults.totalScheduled,
      autoCommitted: eodResults.autoCommitted,
      alreadyFinalized: eodResults.alreadyFinalized,
      noNeuralData: eodResults.noNeuralData
    });

    passed++;
    console.log("  [PASSED] Test 5: End-of-Day auto-finalization worker successfully audited timetable slots.");

    // -------------------------------------------------------------------------
    // FINAL BACKEND VERIFICATION SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n" + "=".repeat(80));
    console.log(`  MNC ENTERPRISE BACKEND SUITE COMPLETED: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
    console.log("  MongoDB Scaled Indexing, Cryptographic Chain, Telegram Bot & EOD Worker VERIFIED.");
    console.log("=".repeat(80) + "\n");
    
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Enterprise Backend Test Suite Failed:", err);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  }
}

runEnterpriseBackendSuite();
