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
    // 1. Destructure
    let { name, password, department, facultyId, mail, phno, designation, image } = req.body;

    // 2. Validation: Existence
    if (!name || !password || !department || !facultyId || !mail || !phno || !designation) {
      return res.status(400).json({ success: false, message: "All required fields are mandatory" });
    }

    // 3. Sanitization: Trim inputs to remove accidental spaces
    name = name.trim();
    mail = mail.trim().toLowerCase(); // Emails should be lowercase for consistency
    facultyId = facultyId.trim();
    phno = phno.trim();

    // 4. Validation: Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) return res.status(400).json({ success: false, message: "Invalid email format" });

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phno)) return res.status(400).json({ success: false, message: "Phone must be exactly 10 digits" });

    if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    // 5. Validation: Duplicate Check
    const exists = await Faculty.findOne({ $or: [{ facultyId }, { mail }, { phno }] });
    if (exists) return res.status(400).json({ success: false, message: "Faculty with this ID, Email, or Phone already exists" });

    // 6. Security: Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // --- Image Upload Logic (unchanged) ---
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

    // 7. Create User with Hashed Password
    const faculty = await Faculty.create({
      name,
      password: hashedPassword, // Store the hash, NOT the plain text
      department,
      facultyId,
      mail,
      phno,
      designation,
      image: imageUrl,
    });

    res.status(201).json({ success: true, message: "Faculty added successfully", faculty: { _id: faculty._id, name: faculty.name } });

  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).json({ success: false, message: "Server error while adding faculty" });
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
    const { facultyId } = req.params; 
    
    // 1. Basic Validation
    if (!facultyId) {
        return res.status(400).json({ success: false, message: "Faculty ID is missing" });
    }

    // 2. Destructure and Trim
    let { name, phno, mail, designation, password } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();
    if (designation) updates.designation = designation.trim();

    // 3. Duplicate Checks (Email AND Phone)
    // We build a query to check if EITHER email OR phone exists for a DIFFERENT user
    const conflictQuery = {
        $and: [
            { facultyId: { $ne: facultyId } }, // Not the current user
            { 
                $or: [] // We will push conditions here
            }
        ]
    };

    if (mail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Standard email format
        if (!emailRegex.test(mail)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        updates.mail = mail.toLowerCase(); // Lowercase and add if valid
        
        // --- NOW do the duplicate check ---
        const duplicate = await Faculty.findOne({ 
            mail: updates.mail, 
            facultyId: { $ne: facultyId } 
        });
        
        if (duplicate) {
            return res.status(409).json({ success: false, message: "Email already in use by another faculty" });
        }
    }
    if (phno) {
        const phoneRegex = /^\d{10}$/; // Force 10 digits
        if (!phoneRegex.test(phno)) {
            return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits" });
        }
        updates.phno = phno; // Only add to updates if valid
    }

    // Only run the duplicate check if we are actually updating mail or phno
    if (conflictQuery.$and[1].$or.length > 0) {
        const duplicate = await Faculty.findOne(conflictQuery);
        if (duplicate) {
            // Determine which field caused the conflict for a precise error message
            const msg = duplicate.mail === updates.mail 
                ? "Email already in use" 
                : "Phone number already in use";
            return res.status(409).json({ success: false, message: msg });
        }
    }

    // 4. Password Handling (Manual Hash)
    if (password && password.trim().length > 0) {
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(password, salt);
    }

    // 5. Image Upload
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
         console.error("Cloudinary Error:", uploadError);
         return res.status(500).json({ success: false, message: "Image upload failed" });
      }
    }

    // 6. Perform Update
    const updatedFaculty = await Faculty.findOneAndUpdate(
      { facultyId: facultyId }, 
      { $set: updates },
      { new: true, runValidators: true }
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
            image: updatedFaculty.image,
            email: updatedFaculty.mail // Helpful to return the updated email
        }
    });

  } catch (err) {
    console.error("Update Error:", err);
    // Fallback for race conditions
    if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "Duplicate details found" });
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
  if (!timeStr) return 0;
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
      startTime, endTime, periodIndex 
    } = req.body;

    // 1. Fetch current schedule
    // Use .lean() so we get a plain JS object (faster & safer for checking)
    const scheduleDoc = await FacultySchedule.findOne({ faculty: facultyId }).lean();
    
    // 2. CALCULATE TIMES UNIFORMLY
    // We ignore req.body.startMinutes to prevent frontend calculation errors.
    // We convert the incoming string times directly.
    const newStart = timeToMinutes(startTime); 
    const newEnd = timeToMinutes(endTime); 

    // 3. CONFLICT CHECK
    if (scheduleDoc && scheduleDoc.timetable) {
        // Filter for the same day (Case insensitive trim just to be safe)
        const daySlots = scheduleDoc.timetable.filter(s => 
            s.day.toLowerCase().trim() === day.toLowerCase().trim()
        );

        for (const slot of daySlots) {
            const existingStart = timeToMinutes(slot.startTime); 
            const existingEnd = timeToMinutes(slot.endTime); 

            // LOGIC: If (NewStart < OldEnd) AND (NewEnd > OldStart) -> OVERLAP
            // Example: Existing 10:00-13:00 (600-780). New 10:00-13:00 (600-780).
            // 600 < 780 (True) && 780 > 600 (True) -> Conflict Detected.
            if (newStart < existingEnd && newEnd > existingStart) {
                return res.status(409).json({
                    success: false,
                    message: `Conflict! Slot overlaps with "${slot.subject}" (${slot.startTime} - ${slot.endTime})`
                });
            }
        }
    }

    // 4. ATOMIC PUSH
    const newSlot = {
      day,
      branch: branch.toUpperCase(),
      year: Number(year),
      section,
      subject: type === 'Leisure' ? 'Leisure' : subject,
      room: type === 'Leisure' ? 'N/A' : room,
      type,
      batch: type === 'Lab' ? Number(batch) : null,
      startTime, 
      endTime,   
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
    // 1. Get ID from Middleware
    const facultyId = req.userId; 
    
    // 2. Fetch Current Data (Needed for comparison)
    const currentFaculty = await Faculty.findById(facultyId);
    if (!currentFaculty) {
        return res.status(404).json({ success: false, message: "Faculty record not found" });
    }

    const { name, phno, image } = req.body;
    const updates = {};

    // 3. Update Name
    if (name) updates.name = name.trim();

    // 4. Update Phone (With Validation & Duplicate Check)
    if (phno) {
        const cleanPhno = phno.trim();
        
        // Only proceed if the phone number is DIFFERENT from the current one
        if (cleanPhno !== currentFaculty.phno) {
            // A. Validate Format
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(cleanPhno)) {
                return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits" });
            }

            // B. Check for Duplicates (Is anyone ELSE using this?)
            const duplicate = await Faculty.findOne({ 
                phno: cleanPhno, 
                _id: { $ne: facultyId } // Exclude myself
            });

            if (duplicate) {
                return res.status(409).json({ success: false, message: "Phone number already in use by another faculty" });
            }

            updates.phno = cleanPhno;
        }
    }

    // 5. Handle Image Upload
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
        console.error("Cloudinary Error:", uploadError);
        return res.status(500).json({ success: false, message: "Image upload failed" });
      }
    } else if (image) {
        // If frontend sends the existing image URL as a string
        updates.image = image;
    }

    // 6. Perform Update
    // We use findByIdAndUpdate to apply the changes
    const updatedFaculty = await Faculty.findByIdAndUpdate(
      facultyId, 
      { $set: updates }, 
      { new: true, runValidators: true } // Return the NEW document
    ).select("-password"); // Don't send password back

    res.json({ 
      success: true, 
      message: "Profile updated successfully", 
      faculty: updatedFaculty 
    });

  } catch (error) {
    console.error("Faculty Update Error:", error);
    // Handle race conditions for duplicates just in case
    if (error.code === 11000) {
        return res.status(409).json({ success: false, message: "Phone number already exists" });
    }
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
    const { classId, date, attendanceData } = req.body; 
    const facultyId = req.userId;
    const attendanceDate = normalizeDate(date);

    // 1. Get Class Details from Faculty Schedule
    const scheduleDoc = await FacultySchedule.findOne(
      { "timetable._id": classId }, 
      { "timetable.$": 1 }
    );
    if (!scheduleDoc) return res.status(404).json({ success: false, message: "Class not found" });
    const schedule = scheduleDoc.timetable[0];

    // 2. Identify Current Absentees for the Attendance record
    const newAbsentIds = attendanceData
      .filter(r => r.status === "Absent")
      .map(r => r.studentId);

    // 3. Check for existing record to determine if this is an Update or New entry
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

    // 4. Fetch all students belonging to this specific Year/Branch/Section
    const students = await Student.find({ 
      branch: schedule.branch, 
      year: schedule.year, 
      section: schedule.section || schedule.batch 
    });

    const bulkOps = students.map(student => {
      const studentIdStr = student._id.toString();
      const recordInRequest = attendanceData.find(r => r.studentId.toString() === studentIdStr);
      
      if (!recordInRequest) return null; 

      const isNowAbsent = recordInRequest.status === "Absent";
      
      // Deep copy to ensure Mongoose detects changes in the nested array
      let currentRecords = student.attendanceRecord ? JSON.parse(JSON.stringify(student.attendanceRecord)) : [];
      
      // Find the specific subject record
      let subIndex = currentRecords.findIndex(r => r.subject === schedule.subject);
      
      let subRec;
      if (subIndex === -1) {
        subRec = { subject: schedule.subject, totalClasses: 0, presentClasses: 0, percentage: 0 };
        currentRecords.push(subRec);
        subIndex = currentRecords.length - 1;
      } else {
        subRec = currentRecords[subIndex];
      }

      // --- CRITICAL FIX FOR STUDENT D0 ---
      // If totalClasses is 0, we treat it as a new entry even if isUpdate is true
      if (!isUpdate || subRec.totalClasses === 0) {
        subRec.totalClasses += 1;
        if (!isNowAbsent) subRec.presentClasses += 1;
      } else {
        // Standard update: Only shift Present count if status changed
        const wasAbsent = oldAbsentIds.includes(studentIdStr);
        if (wasAbsent && !isNowAbsent) {
          subRec.presentClasses += 1; // Was marked absent, now present
        } else if (!wasAbsent && isNowAbsent) {
          subRec.presentClasses -= 1; // Was marked present, now absent
        }
      }

      // 5. Recalculate Percentages
      subRec.percentage = subRec.totalClasses > 0 ? (subRec.presentClasses / subRec.totalClasses) * 100 : 100;
      currentRecords[subIndex] = subRec;

      // Global Summary Calculation
      const globalTotal = currentRecords.reduce((acc, curr) => acc + (Number(curr.totalClasses) || 0), 0);
      const globalPresent = currentRecords.reduce((acc, curr) => acc + (Number(curr.presentClasses) || 0), 0);
      
      const attendanceSummary = {
        totalClasses: globalTotal,
        presentClasses: globalPresent,
        percentage: globalTotal > 0 ? (globalPresent / globalTotal) * 100 : 100
      };

      return {
        updateOne: {
          filter: { _id: student._id },
          update: { 
            $set: { 
              attendanceRecord: currentRecords, 
              attendanceSummary: attendanceSummary 
            } 
          }
        }
      };
    }).filter(Boolean);

    // 6. Execute Bulk Update
    if (bulkOps.length > 0) {
      const result = await Student.bulkWrite(bulkOps);
      console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    }

    res.json({ 
      success: true, 
      message: isUpdate ? "Attendance updated successfully!" : "Attendance saved successfully!" 
    });

  } catch (error) {
    console.error("Mark Attendance Error:", error);
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


export const changeFacultyPassword = async (req, res) => {
  try {
    const facultyId = req.userId;
    const { oldPassword, newPassword } = req.body;

    // 1. Validation
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both passwords are required" });
    }

    const faculty = await Faculty.findById(facultyId).select('+password');
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    // 2. Verify Old Password
    const isMatch = await bcrypt.compare(oldPassword, faculty.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect old password" });
    }

    // 3. Check for Same Password
    if (oldPassword === newPassword) {
        return res.status(400).json({ success: false, message: "New password cannot be same as old" });
    }

    // 4. Update Password (PLAIN TEXT)
    // We do NOT hash here because your Faculty Model's pre('save') hook will do it!
    faculty.password = newPassword; 

    // 5. Save (Triggers the Model's hashing hook)
    await faculty.save();

    res.json({ success: true, message: "Password changed successfully" });

  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};