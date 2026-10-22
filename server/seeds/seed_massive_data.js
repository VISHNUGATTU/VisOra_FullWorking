import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Student from "../models/Student.js";
import Faculty from "../models/Faculty.js";
import FacultySchedule from "../models/FacultySchedule.js";
import connectDB from "../configs/db.js";

const INDIAN_FIRST_NAMES = [
  "Aarav", "Aditi", "Akhil", "Ananya", "Bhavya", "Chaitanya", "Deepak", "Divya",
  "Gautam", "Harini", "Ishaan", "Kavya", "Madhav", "Meera", "Nikhil", "Pooja",
  "Pranav", "Rahul", "Rhea", "Rohan", "Sahil", "Sanjana", "Shreya", "Siddharth",
  "Sneha", "Surya", "Tanvi", "Tejas", "Varun", "Veda", "Vikas", "Yash",
  "Abhishek", "Aishwarya", "Aniket", "Ankita", "Avinash", "Harsh", "Keerthi", "Manish"
];

const INDIAN_LAST_NAMES = [
  "Reddy", "Sharma", "Verma", "Rao", "Kumar", "Patel", "Goud", "Nair",
  "Iyer", "Chowdhury", "Deshmukh", "Joshi", "Bose", "Kulkarni", "Mehta", "Bhat"
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPhone() {
  const prefixes = ["98", "99", "97", "96", "94", "91", "88", "87", "79", "78"];
  const prefix = getRandomItem(prefixes);
  const remaining = Math.floor(10000000 + Math.random() * 90000000).toString();
  return prefix + remaining.slice(0, 8);
}

export async function seedMassiveInstitutionalData() {
  console.log("\n" + "=".repeat(70));
  console.log("  VISORA ENTERPRISE MASSIVE DATA SEEDER");
  console.log("  Generating 120+ Students, 6 Faculty, and Full Week Timetables");
  console.log("  Patent App Reference: 202641036876 (Form 2, Patent Act 1970)");
  console.log("=".repeat(70));

  await connectDB();
  console.log("  [+] MongoDB Connection Established.");

  const hashedPassword = await bcrypt.hash("student123", 10);
  const hashedFacultyPass = await bcrypt.hash("faculty123", 10);

  // ---------------------------------------------------------
  // 1. SEED FACULTY MEMBERS
  // ---------------------------------------------------------
  console.log("\n[*] Seeding Institutional Faculty Members...");
  const facultyDefinitions = [
    {
      name: "Dr. Gullapalli Sathar",
      facultyId: "FAC_CSE_DS_001",
      department: "CSE-DS",
      designation: "Assistant Professor",
      mail: "sathar_cse_ds@vnrvjiet.in",
      phno: "9848012345"
    },
    {
      name: "Dr. N. Sunanda",
      facultyId: "FAC_CSE_DS_002",
      department: "CSE-DS",
      designation: "Assistant Professor",
      mail: "sunanda_cse_ds@vnrvjiet.in",
      phno: "9848012346"
    },
    {
      name: "Dr. Pagadala Veeranjaneyulu",
      facultyId: "FAC_AIDS_003",
      department: "AI&DS",
      designation: "Assistant Professor",
      mail: "veeran_aids@vnrvjiet.in",
      phno: "9848012347"
    },
    {
      name: "Dr. K. Radhika",
      facultyId: "FAC_CY_004",
      department: "CSE-CyS",
      designation: "Professor & Head",
      mail: "radhika_cys@vnrvjiet.in",
      phno: "9848012348"
    },
    {
      name: "Prof. M. Suresh",
      facultyId: "FAC_CSE_DS_005",
      department: "CSE-DS",
      designation: "Associate Professor",
      mail: "suresh_cse_ds@vnrvjiet.in",
      phno: "9848012349"
    },
    {
      name: "Dr. B. Anitha",
      facultyId: "FAC_AIDS_006",
      department: "AI&DS",
      designation: "Assistant Professor",
      mail: "anitha_aids@vnrvjiet.in",
      phno: "9848012350"
    }
  ];

  const facultyDocs = [];
  for (const f of facultyDefinitions) {
    const existing = await Faculty.findOne({ facultyId: f.facultyId });
    if (!existing) {
      const doc = await Faculty.create({
        ...f,
        password: hashedFacultyPass,
        image: ""
      });
      facultyDocs.push(doc);
      console.log(`  [+] Created Faculty: ${f.name} (${f.department})`);
    } else {
      facultyDocs.push(existing);
      console.log(`  [*] Faculty exists: ${f.name}`);
    }
  }

  // ---------------------------------------------------------
  // 2. SEED TIMETABLES FOR FACULTY
  // ---------------------------------------------------------
  console.log("\n[*] Seeding Timetable Schedules for Faculty...");
  const sampleSubjects = [
    { subject: "Deep Learning & Neural Networks", branch: "CSE-DS", year: 3, section: "B", room: "LAB_602", type: "Lab" },
    { subject: "Computer Vision & Visual AI", branch: "CSE-DS", year: 3, section: "B", room: "ROOM_401", type: "Lecture" },
    { subject: "Distributed Cloud Architectures", branch: "CSE-DS", year: 3, section: "A", room: "ROOM_402", type: "Lecture" },
    { subject: "Big Data Engineering with Spark", branch: "CSE-DS", year: 4, section: "A", room: "LAB_601", type: "Lab" },
    { subject: "Machine Learning Foundations", branch: "AI&DS", year: 2, section: "A", room: "ROOM_301", type: "Lecture" },
    { subject: "Cyber Defense & Threat Hunting", branch: "CSE-CyS", year: 3, section: "A", room: "ROOM_501", type: "Lecture" }
  ];

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periods = [
    { periodIndex: 1, startTime: "09:00", endTime: "10:00" },
    { periodIndex: 2, startTime: "10:00", endTime: "11:00" },
    { periodIndex: 3, startTime: "11:15", endTime: "12:15" },
    { periodIndex: 4, startTime: "13:00", endTime: "14:00" },
    { periodIndex: 5, startTime: "14:00", endTime: "15:00" },
    { periodIndex: 6, startTime: "15:00", endTime: "16:00" }
  ];

  for (let i = 0; i < facultyDocs.length; i++) {
    const fDoc = facultyDocs[i];
    let sched = await FacultySchedule.findOne({ faculty: fDoc._id });
    if (!sched) {
      const timetable = [];
      days.forEach((day, dayIdx) => {
        const slotConfig = sampleSubjects[(i + dayIdx) % sampleSubjects.length];
        timetable.push({
          day,
          periodIndex: 1,
          startTime: periods[0].startTime,
          endTime: periods[0].endTime,
          branch: slotConfig.branch,
          year: slotConfig.year,
          section: slotConfig.section,
          subject: slotConfig.subject,
          room: slotConfig.room,
          type: slotConfig.type
        });

        // Add a second afternoon period
        const slotConfig2 = sampleSubjects[(i + dayIdx + 2) % sampleSubjects.length];
        timetable.push({
          day,
          periodIndex: 4,
          startTime: periods[3].startTime,
          endTime: periods[3].endTime,
          branch: slotConfig2.branch,
          year: slotConfig2.year,
          section: slotConfig2.section,
          subject: slotConfig2.subject,
          room: slotConfig2.room,
          type: slotConfig2.type
        });
      });

      sched = await FacultySchedule.create({
        faculty: fDoc._id,
        semester: "2026-ODD",
        timetable
      });
      console.log(`  [+] Created 10 timetable slots for ${fDoc.name}`);
    } else {
      console.log(`  [*] Timetable exists for ${fDoc.name} (${sched.timetable.length} slots)`);
    }
  }

  // ---------------------------------------------------------
  // 3. SEED MASSIVE STUDENT COHORTS (120+ STUDENTS)
  // ---------------------------------------------------------
  console.log("\n[*] Seeding 120+ Student Records across Cohorts...");

  const cohorts = [
    { branch: "CSE-DS", year: 3, section: "B", count: 40, rollPrefix: "23071A67" },
    { branch: "CSE-DS", year: 3, section: "A", count: 30, rollPrefix: "23071A67A" },
    { branch: "AI&DS", year: 2, section: "A", count: 30, rollPrefix: "24071A54" },
    { branch: "CSE-CyS", year: 4, section: "A", count: 25, rollPrefix: "21071A62" }
  ];

  let totalSeeded = 0;
  let totalExisting = 0;

  // Include primary inventors / key students explicitly
  const specialStudents = [
    {
      rollno: "23071A6788",
      name: "G. Vishnu Phani",
      branch: "CSE-DS",
      year: 3,
      section: "B",
      mail: "23071a6788@vnrvjiet.in",
      phno: "9988776655"
    },
    {
      rollno: "23071A6789",
      name: "Y. Gayathri Karthikeya",
      branch: "CSE-DS",
      year: 3,
      section: "B",
      mail: "23071a6789@vnrvjiet.in",
      phno: "9988776656"
    }
  ];

  for (const sp of specialStudents) {
    const exists = await Student.findOne({ rollno: sp.rollno });
    if (!exists) {
      await Student.create({
        ...sp,
        username: sp.rollno,
        password: hashedPassword,
        biometricEnrolled: true,
        biometricEnrolledAt: new Date(),
        attendanceSummary: { totalClasses: 45, presentClasses: 43, percentage: 95.5 },
        attendanceRecord: [
          { subject: "Deep Learning & Neural Networks", totalClasses: 20, presentClasses: 19, percentage: 95.0 },
          { subject: "Computer Vision & Visual AI", totalClasses: 25, presentClasses: 24, percentage: 96.0 }
        ]
      });
      console.log(`  [+] Registered Inventor/Student: ${sp.name} (${sp.rollno})`);
      totalSeeded++;
    } else {
      totalExisting++;
    }
  }

  for (const cohort of cohorts) {
    console.log(`  [*] Generating ${cohort.count} students for ${cohort.branch} Year ${cohort.year} Sec ${cohort.section}...`);
    for (let i = 1; i <= cohort.count; i++) {
      const padNum = i < 10 ? `0${i}` : `${i}`;
      const rollno = `${cohort.rollPrefix}${padNum}`;

      const existing = await Student.findOne({ rollno });
      if (existing) {
        totalExisting++;
        continue;
      }

      const firstName = getRandomItem(INDIAN_FIRST_NAMES);
      const lastName = getRandomItem(INDIAN_LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const mail = `${rollno.toLowerCase()}@vnrvjiet.in`;
      const phno = getRandomPhone();

      const totalClasses = 40 + Math.floor(Math.random() * 15);
      const presentClasses = Math.floor(totalClasses * (0.75 + Math.random() * 0.23));
      const percentage = Number(((presentClasses / totalClasses) * 100).toFixed(1));

      await Student.create({
        name,
        username: rollno,
        rollno,
        password: hashedPassword,
        year: cohort.year,
        branch: cohort.branch,
        section: cohort.section,
        mail,
        phno,
        biometricEnrolled: true,
        biometricEnrolledAt: new Date(),
        attendanceSummary: { totalClasses, presentClasses, percentage },
        attendanceRecord: [
          { subject: "Deep Learning & Neural Networks", totalClasses: 22, presentClasses: Math.floor(22 * (percentage / 100)), percentage },
          { subject: "Computer Vision & Visual AI", totalClasses: 20, presentClasses: Math.floor(20 * (percentage / 100)), percentage }
        ]
      });

      totalSeeded++;
    }
  }

  console.log(`\n[+] Institutional Data Seeding Complete!`);
  console.log(`    - Newly Seeded Students: ${totalSeeded}`);
  console.log(`    - Pre-Existing Students: ${totalExisting}`);
  console.log(`    - Total Active Students in System: ${totalSeeded + totalExisting}`);
  console.log(`    - Total Faculty Members: ${facultyDocs.length}`);
  console.log("=".repeat(70) + "\n");

  await mongoose.disconnect();
  return {
    totalSeeded,
    totalExisting,
    totalActive: totalSeeded + totalExisting,
    totalFaculty: facultyDocs.length
  };
}

if (process.argv[1]?.endsWith("seed_massive_data.js")) {
  seedMassiveInstitutionalData().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
  });
}
