import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
// import Schedule from "../models/Schedule.js"; // ❌ Removed
import FacultySchedule from "../models/FacultySchedule.js"; // ✅ Added
import Attendance from "../models/Attendance.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";

/* ============================
   LOGIN FACULTY - UNCHANGED
============================ */
export const loginFaculty = async (req, res) => {
  try {
    const { mail, password } = req.body;

    const faculty = await Faculty.findOne({ mail });
    if (!faculty) {
      return res.json({ success: false, message: "Faculty not found" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: faculty._id, role: "FACULTY" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, message: "Login successful", faculty });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ============================
   IS AUTH - UNCHANGED
============================ */
export const isFacultyAuth = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.userId).select("-password");
    if (!faculty) return res.json({ success: false, message: "Faculty not found" });
    res.json({ success: true, faculty });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ============================
   LOGOUT - UNCHANGED
============================ */
export const logoutFaculty = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    res.json({ success: true, message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Logout failed", error: error.message });
  }
};

/* ============================
   ADD FACULTY (Admin Action) - UNCHANGED
============================ */
export const addFaculty = async (req, res) => {
  try {
    const { name, password, department, facultyId, mail, phno, designation, image } = req.body;

    // --- Validation ---
    if (!name || !password || !department || !facultyId || !mail || !phno || !designation) {
      return res.status(400).json({ success: false, message: "All required fields are mandatory" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) return res.status(400).json({ success: false, message: "Invalid email" });

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phno)) return res.status(400).json({ success: false, message: "Phone must be 10 digits" });

    if (password.length < 6) return res.status(400).json({ success: false, message: "Password too short" });

    // --- Duplicate Check ---
    const exists = await Faculty.findOne({ $or: [{ facultyId }, { mail }, { phno }] });
    if (exists) return res.status(400).json({ success: false, message: "Faculty details already exist" });

    // --- Image Upload ---
    let imageUrl = "";
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream({ folder: "faculty" }, (error, result) => {
          if (error) reject(error); else resolve(result);
        });
        stream.end(req.file.buffer);
      });
      imageUrl = uploadResult.secure_url;
    } else if (image) {
      imageUrl = image;
    }

    const faculty = await Faculty.create({
      name, password, department, facultyId, mail, phno, designation, image: imageUrl,
    });

    res.status(201).json({ success: true, message: "Faculty added successfully", faculty: { _id: faculty._id, name: faculty.name } });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   SEARCH FACULTY - UNCHANGED
============================ */
export const searchFaculty = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === "") {
        return res.json({ success: true, faculty: [] });
    }

    // Search by Name OR FacultyID OR Email
    // 'i' makes it case-insensitive
    const faculty = await Faculty.find({
        $or: [
            { name: { $regex: q, $options: "i" } },
            { facultyId: { $regex: q, $options: "i" } },
            { mail: { $regex: q, $options: "i" } }
        ]
    })
    .select("name facultyId department designation image mail phno") // Select only needed fields
    .limit(10); // Limit results for performance

    res.json({ success: true, faculty });

  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
};

/* ============================
   UPDATE FACULTY - UNCHANGED
============================ */
export const updateFaculty = async (req, res) => {
  try {
    // 1. Identify the Faculty to update
    // We expect the ID in params (from /update/:facultyId)
    const { facultyId } = req.params; 
    
    if (!facultyId) {
        return res.status(400).json({ success: false, message: "Faculty ID is missing" });
    }

    // 2. Prepare Update Object
    // We manually pick fields to avoid 'adminId' or other immutable fields being injected
    const { name, phno, mail, designation, password } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (phno) updates.phno = phno;
    if (designation) updates.designation = designation;
    
    // 3. Email & Duplicate Check
    if (mail) {
        updates.mail = mail.toLowerCase();
        // Check if this NEW email is already used by someone else
        const duplicate = await Faculty.findOne({ 
            mail: updates.mail, 
            facultyId: { $ne: facultyId } // Exclude current user from check
        });
        if (duplicate) {
            return res.status(409).json({ success: false, message: "Email already in use by another faculty" });
        }
    }

    // 4. Password Handling
    // NOTE: findOneAndUpdate does NOT trigger Schema pre('save') hooks.
    // We must hash manually here.
    if (password && password.trim().length > 0) {
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }
        updates.password = await bcrypt.hash(password, 10);
    }

    // 5. Image Upload (Stream)
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "faculty_profiles", resource_type: "image" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
        updates.image = uploadResult.secure_url;
      } catch (uploadError) {
         return res.status(500).json({ success: false, message: "Image upload failed" });
      }
    }

    // 6. Perform Update
    const updatedFaculty = await Faculty.findOneAndUpdate(
      { facultyId: facultyId }, // Find by custom ID (String)
      { $set: updates },
      { new: true, runValidators: true } // Return new doc, run schema checks
    );

    if (!updatedFaculty) {
        return res.status(404).json({ success: false, message: "Faculty member not found" });
    }

    res.json({ 
        success: true, 
        message: "Profile updated successfully", 
        faculty: {
            name: updatedFaculty.name,
            facultyId: updatedFaculty.facultyId,
            image: updatedFaculty.image
        }
    });

  } catch (err) {
    console.error("Update Error:", err);
    if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "Duplicate details found (Email or Phone)" });
    }
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   DELETE FACULTY - UNCHANGED
============================ */
export const deleteFacultyById = async (req, res) => {
  try {
    const { facultyId } = req.params; // Expecting custom ID like "FAC001"

    // 1. Find and Delete Faculty
    const deletedFaculty = await Faculty.findOneAndDelete({ facultyId });

    if (!deletedFaculty) {
      return res.status(404).json({ success: false, message: "Faculty member not found" });
    }

    // 2. Cascade Delete: Remove their Schedule
    // usage: { faculty: ObjectId }
    await FacultySchedule.findOneAndDelete({ faculty: deletedFaculty._id });

    // 3. Optional: Remove Attendance records taken by them? 
    // Usually, we KEEP attendance records for history even if faculty leaves.
    // So we will SKIP deleting attendance.

    res.json({ 
      success: true, 
      message: `Faculty ${deletedFaculty.name} and their schedule deleted successfully.` 
    });

  } catch (err) {
    console.error("Delete Faculty Error:", err);
    res.status(500).json({ success: false, message: "Server error during deletion" });
  }
};


const timeToMinutes = (timeStr) => {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (hours === 12) hours = 0;
  if (modifier === "PM") hours += 12;
  return hours * 60 + minutes;
};

export const addScheduleSlot = async (req, res) => {
  try {
    const facultyId = req.userId;
    const { 
      day, branch, year, section, subject, room, type, batch, 
      startTime, endTime, startMinutes, duration, periodIndex 
    } = req.body;

    // 1. Fetch the teacher's current schedule
    let scheduleDoc = await FacultySchedule.findOne({ faculty: facultyId });
    if (!scheduleDoc) {
      scheduleDoc = new FacultySchedule({ faculty: facultyId, timetable: [] });
    }

    // 2. UNIFIED MATH CONFLICT CHECK
    // We use the raw minutes sent from the frontend config
    const newStart = Number(startMinutes);
    const newEnd = newStart + Number(duration);

    // Filter slots for the same day
    const daySlots = scheduleDoc.timetable.filter(s => s.day === day);

    for (const slot of daySlots) {
      // We need to ensure the existing slots also have minute data. 
      // Since your schema stores strings, we'll use a helper to match the frontend math.
      const existingStart = timeToMinutes(slot.startTime); 
      const existingEnd = existingStart + getDurationInMinutes(slot.startTime, slot.endTime);

      // Overlap Logic: (StartA < EndB) AND (EndA > StartB)
      if (newStart < existingEnd && newEnd > existingStart) {
        return res.status(409).json({
          success: false,
          message: `Conflict! Slot overlaps with "${slot.subject}" (${slot.startTime} - ${slot.endTime})`
        });
      }
    }

    // 3. ATOMIC PUSH
    const newSlot = {
      day,
      branch: branch.toUpperCase(),
      year: Number(year),
      section,
      subject: type === 'Leisure' ? 'Leisure' : subject,
      room: type === 'Leisure' ? 'N/A' : room,
      type,
      batch: type === 'Lab' ? Number(batch) : null,
      startTime, // "09:00 AM"
      endTime,   // "10:00 AM"
      periodIndex: Number(periodIndex)
    };

    const updated = await FacultySchedule.findOneAndUpdate(
      { faculty: facultyId },
      { $push: { timetable: newSlot } },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: "Schedule added successfully",
      slot: updated.timetable[updated.timetable.length - 1]
    });

  } catch (error) {
    console.error("Add Schedule Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- HELPERS TO MATCH FRONTEND MATH ---

// const timeToMinutes = (timeStr) => {
//   const [time, modifier] = timeStr.split(" ");
//   let [hours, minutes] = time.split(":").map(Number);
//   if (hours === 12) hours = 0;
//   if (modifier === "PM") hours += 12;
//   return hours * 60 + minutes;
// };

const getDurationInMinutes = (start, end) => {
  return timeToMinutes(end) - timeToMinutes(start);
};

/* ===============================================================
   2. GET MY SCHEDULE (Modified for Bucket Pattern)
=============================================================== */
export const getMySchedule = async (req, res) => {
  try {
    const facultyId = req.userId;
    
    // Use .lean() to skip Mongoose's heavy document hydration
    const scheduleDoc = await FacultySchedule.findOne({ faculty: facultyId }).lean();

    const grouped = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
    };

    if (scheduleDoc && scheduleDoc.timetable) {
      // 1. Sort ONLY ONCE. 
      // JavaScript's sort is stable; the order here will be preserved in the grouped object.
      const sortedTimetable = [...scheduleDoc.timetable].sort((a, b) => 
        Number(a.periodIndex) - Number(b.periodIndex)
      );

      // 2. Map directly into the buckets
      sortedTimetable.forEach(slot => {
        if (grouped[slot.day]) {
          grouped[slot.day].push({
            _id: slot._id,
            subject: slot.subject,
            time: `${slot.startTime} - ${slot.endTime}`,
            room: slot.room,
            batch: slot.batch, 
            branch: slot.branch,
            type: slot.type,
            year: slot.year,
            section: slot.section,
            periodIndex: Number(slot.periodIndex)
          });
        }
      });
      
      // REDUNDANCY REMOVED: 
      // The Object.keys(grouped).forEach(day => { ... sort again ... }) is gone.
    }

    res.json({ success: true, schedule: grouped });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params; // This is the Slot's _id
    const facultyId = req.userId;

    // $pull removes the specific object from the timetable array
    const result = await FacultySchedule.findOneAndUpdate(
      { faculty: facultyId },
      { $pull: { timetable: { _id: id } } },
      { new: true }
    );

    if (!result) return res.status(404).json({ success: false, message: "Schedule not found" });

    res.json({ success: true, message: "Slot removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   UPDATE FACULTY PROFILE (Self) - UNCHANGED
============================ */
export const updateFacultyProfile = async (req, res) => {
  try {
    // req.userId is provided by your authFaculty middleware
    const facultyId = req.userId; 
    
    // We only allow faculty to update their name and phone number.
    // Academic details like Email, ID, and Dept are locked for admin control.
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.phno) updates.phno = req.body.phno;
    
    // Handle Profile Image Upload
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "faculty_profiles", resource_type: "image" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
        updates.image = uploadResult.secure_url;
      } catch (uploadError) {
        return res.status(500).json({ success: false, message: "Image upload failed" });
      }
    }

    // Perform Update
    const updatedFaculty = await Faculty.findByIdAndUpdate(
      facultyId, 
      { $set: updates }, 
      { new: true, runValidators: true }
    ).select("-password"); // Never send password back

    if (!updatedFaculty) {
      return res.status(404).json({ success: false, message: "Faculty record not found" });
    }

    res.json({ 
      success: true, 
      message: "Profile updated successfully", 
      faculty: updatedFaculty 
    });

  } catch (error) {
    console.error("Faculty Update Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
/* ============================
   GET STUDENTS BY SECTION - UNCHANGED
============================ */

// Helper to normalize dates to midnight UTC to prevent duplication
const normalizeDate = (dateStr) => {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const getStudentsBySection = async (req, res) => {
  try {
    const { year, branch, section } = req.query;
    const query = {
      year: Number(year),
      branch: branch,
      isGraduated: false
    };
    if (section && section !== "N/A") query.section = section;

    const students = await Student.find(query).sort({ rollno: 1 }).select("name rollno image _id phno");
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { classId, date, attendanceData } = req.body; // attendanceData is array of {studentId, status}
    const facultyId = req.userId;
    const attendanceDate = normalizeDate(date);

    // 1. Get Class Details
    const scheduleDoc = await FacultySchedule.findOne({ "timetable._id": classId }, { "timetable.$": 1 });
    if (!scheduleDoc) return res.status(404).json({ success: false, message: "Class not found" });
    const schedule = scheduleDoc.timetable[0];

    // 2. Identify Current Absentees
    const newAbsentIds = attendanceData.filter(r => r.status === "Absent").map(r => r.studentId);

    // 3. Check for existing record to prevent duplication
    const existingRecord = await Attendance.findOne({ scheduleId: classId, date: attendanceDate });
    
    let isUpdate = false;
    let oldAbsentIds = [];

    if (existingRecord) {
      isUpdate = true;
      oldAbsentIds = existingRecord.absentees.map(id => id.toString());
      existingRecord.absentees = newAbsentIds;
      await existingRecord.save();
    } else {
      await Attendance.create({
        scheduleId: classId,
        date: attendanceDate,
        facultyId,
        branch: schedule.branch,
        year: schedule.year,
        section: schedule.section || schedule.batch,
        subject: schedule.subject,
        absentees: newAbsentIds
      });
    }

    // 4. Update Student Stats (Bulk)
    const students = await Student.find({ _id: { $in: attendanceData.map(r => r.studentId) } });
    const bulkOps = students.map(student => {
      const studentIdStr = student._id.toString();
      const isNowAbsent = newAbsentIds.includes(studentIdStr);
      
      if (!student.attendanceRecord) student.attendanceRecord = [];
      let subRec = student.attendanceRecord.find(r => r.subject === schedule.subject);
      
      if (!subRec) {
        subRec = { subject: schedule.subject, totalClasses: 0, presentClasses: 0, percentage: 0 };
        student.attendanceRecord.push(subRec);
      }

      if (!isUpdate) {
        // NEW RECORD: Increment Total
        subRec.totalClasses += 1;
        if (!isNowAbsent) subRec.presentClasses += 1;
      } else {
        // UPDATE: Only shift Present count if status changed
        const wasAbsent = oldAbsentIds.includes(studentIdStr);
        if (wasAbsent && !isNowAbsent) subRec.presentClasses += 1;
        else if (!wasAbsent && isNowAbsent) subRec.presentClasses -= 1;
      }

      // Recalculate Percentages
      subRec.percentage = subRec.totalClasses > 0 ? (subRec.presentClasses / subRec.totalClasses) * 100 : 100;
      
      const globalTotal = student.attendanceRecord.reduce((acc, curr) => acc + curr.totalClasses, 0);
      const globalPresent = student.attendanceRecord.reduce((acc, curr) => acc + curr.presentClasses, 0);
      
      student.attendanceSummary = {
        totalClasses: globalTotal,
        presentClasses: globalPresent,
        percentage: globalTotal > 0 ? (globalPresent / globalTotal) * 100 : 100
      };

      return {
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { attendanceRecord: student.attendanceRecord, attendanceSummary: student.attendanceSummary } }
        }
      };
    });

    await Student.bulkWrite(bulkOps);
    res.json({ success: true, message: isUpdate ? "Attendance updated!" : "Attendance saved!" });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   GET SECTION ANALYTICS - UNCHANGED
============================ */
export const getSectionAnalytics = async (req, res) => {
  try {
    const { year, branch, section, subject } = req.query;
    if (!year || !branch || !subject) return res.status(400).json({ success: false, message: "Params required" });

    const students = await Student.find({
  year: Number(year),
  branch: { $regex: new RegExp(`^${branch}$`, "i") },
  section: { $regex: new RegExp(`^${section}$`, "i") },
  // Optional: Only fetch students who actually have a record for this subject
  "attendanceRecord.subject": { $regex: new RegExp(`^${subject}$`, "i") } 
}).select("name rollno phno attendanceRecord");

const analytics = students.map(student => {
  // 🔥 FIX: Ensure we find the subject record case-insensitively
  const subRecord = student.attendanceRecord.find(
    r => r.subject.trim().toLowerCase() === subject.trim().toLowerCase()
  );
  
  // If student has never attended this class, they have 0% but 0 total classes.
  // We handle this to avoid "NaN" in the percentage.
  const stats = subRecord || { totalClasses: 0, presentClasses: 0, percentage: 0 };
  
  return {
    id: student._id,
    name: student.name,
    rollno: student.rollno,
    phno: student.phno, // Needed for WhatsApp
    percentage: Number(stats.percentage.toFixed(1)),
    classesAttended: stats.presentClasses,
    totalClasses: stats.totalClasses,
    status: stats.percentage < 75 ? "Critical" : "Safe"
  };
});

    const totalPercentage = analytics.reduce((sum, s) => sum + s.percentage, 0);
    const classAverage = analytics.length > 0 ? (totalPercentage / analytics.length).toFixed(1) : 0;
    const defaulters = analytics.filter(s => s.percentage < 75);

    res.json({ success: true, stats: { totalStudents: analytics.length, classAverage, defaulterCount: defaulters.length }, students: analytics.sort((a, b) => a.rollno.localeCompare(b.rollno)), defaulters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   GET EXISTING ATTENDANCE - UNCHANGED
============================ */
export const getAttendanceStatus = async (req, res) => {
  try {
    const { classId, date } = req.query;
    const record = await Attendance.findOne({ scheduleId: classId, date: new Date(date) });
    if (!record) return res.json({ success: true, exists: false });
    res.json({ success: true, exists: true, absentees: record.absentees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   GET FACULTY CLASSES (Dropdowns) - Modified for Bucket
============================ */
export const getFacultyClasses = async (req, res) => {
  try {
    const facultyId = req.userId;
    
    // Fetch the single document
    const scheduleDoc = await FacultySchedule.findOne({ faculty: facultyId });

    if (!scheduleDoc || !scheduleDoc.timetable) {
        return res.json({ success: true, classes: [] });
    }

    const uniqueClasses = [];
    const seen = new Set();

    // Iterate the array in memory
    scheduleDoc.timetable.forEach(cls => {
      const key = `${cls.subject}-${cls.year}-${cls.branch}-${cls.section}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueClasses.push({
          subject: cls.subject,
          year: cls.year,
          branch: cls.branch,
          section: cls.section || "A" 
        });
      }
    });
    
    res.json({ success: true, classes: uniqueClasses });
  } catch (error) {
    console.error("Get Classes Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.userId; // Provided by your studentAuth middleware

    // 1. Fetch Student with lean() for speed
    const student = await Student.findById(studentId)
      .select("name rollno branch year section attendanceSummary attendanceRecord image")
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // 2. Identify "Critical" subjects (below 75%)
    const subjectWise = (student.attendanceRecord || []).map(sub => ({
      ...sub,
      status: sub.percentage < 75 ? "Critical" : "Safe",
      classesToAttend: sub.percentage < 75 ? Math.ceil((0.75 * sub.totalClasses - sub.presentClasses) / 0.25) : 0
    }));

    res.json({
      success: true,
      profile: {
        name: student.name,
        rollno: student.rollno,
        branch: student.branch,
        year: student.year,
        section: student.section,
        image: student.image
      },
      overall: student.attendanceSummary || { totalClasses: 0, presentClasses: 0, percentage: 100 },
      subjects: subjectWise
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};