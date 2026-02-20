import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import FacultySchedule from "../models/FacultySchedule.js"; 
import Attendance from "../models/Attendance.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { logAction } from "../configs/logger.js"; // ✅ Imported Logger

/* ============================
   LOGIN FACULTY
============================ */
export const loginFaculty = async (req, res) => {
  try {
    const { mail, password } = req.body;

    const faculty = await Faculty.findOne({ mail });
    if (!faculty) {
      // 📝 Log Failed Attempt
      await logAction({
        actionType: 'AUTH_FAILURE',
        title: 'Faculty Login Failed',
        message: `Invalid email attempt: ${mail}`,
        status: 'Failed'
      });
      return res.json({ success: false, message: "Faculty not found" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      // 📝 Log Failed Attempt
      await logAction({
        actionType: 'AUTH_FAILURE',
        title: 'Faculty Login Failed',
        message: `Wrong password for: ${mail}`,
        actor: { userId: faculty._id, role: 'Faculty', name: faculty.name },
        status: 'Failed'
      });
      return res.json({ success: false, message: "Invalid password" });
    }

    // Change this line:
const token = jwt.sign(
  { id: faculty._id, role: "faculty" }, // Changed "FACULTY" to "faculty"
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // 📝 Log Success
    await logAction({
      actionType: 'LOGIN',
      title: 'Faculty Login Success',
      message: `${faculty.name} logged in.`,
      actor: { userId: faculty._id, role: 'Faculty', name: faculty.name, ipAddress: req.ip }
    });

    res.json({ success: true, message: "Login successful", faculty });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

/* ============================
   LOGOUT
============================ */
export const logoutFaculty = async (req, res) => {
  try {
    // 📝 Log Action
    await logAction({
      actionType: 'LOGOUT',
      title: 'Faculty Logged Out',
      actor: { userId: req.userId, role: 'Faculty', ipAddress: req.ip }
    });

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
   ADD FACULTY (Admin Action)
============================ */
export const addFaculty = async (req, res) => {
  try {
    let { name, password, department, facultyId, mail, phno, designation, image } = req.body;

    if (!name || !password || !department || !facultyId || !mail || !phno || !designation) {
      return res.status(400).json({ success: false, message: "All required fields are mandatory" });
    }

    name = name.trim();
    mail = mail.trim().toLowerCase();
    facultyId = facultyId.trim();
    phno = phno.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) return res.status(400).json({ success: false, message: "Invalid email format" });

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phno)) return res.status(400).json({ success: false, message: "Phone must be exactly 10 digits" });

    if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    const exists = await Faculty.findOne({ $or: [{ facultyId }, { mail }, { phno }] });
    if (exists) return res.status(400).json({ success: false, message: "Faculty with this ID, Email, or Phone already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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
      name,
      password: hashedPassword,
      department,
      facultyId,
      mail,
      phno,
      designation,
      image: imageUrl,
    });

    // 📝 Log Creation
    await logAction({
      actionType: 'CREATE_USER',
      title: 'New Faculty Added',
      message: `Faculty ${name} (${facultyId}) added by Admin.`,
      actor: { userId: req.userId, role: 'Admin' }, // Typically called by an Admin
      metadata: { facultyId, department }
    });

    res.status(201).json({ success: true, message: "Faculty added successfully", faculty: { _id: faculty._id, name: faculty.name } });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error while adding faculty" });
  }
};

/* ============================
   UPDATE FACULTY (Admin/System)
============================ */
export const updateFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params; 
    
    if (!facultyId) {
        return res.status(400).json({ success: false, message: "Faculty ID is missing" });
    }

    let { name, phno, mail, designation, password } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();
    if (designation) updates.designation = designation.trim();

    const conflictQuery = {
        $and: [
            { facultyId: { $ne: facultyId } },
            { $or: [] }
        ]
    };

    if (mail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mail)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        updates.mail = mail.toLowerCase();
        const duplicate = await Faculty.findOne({ 
            mail: updates.mail, 
            facultyId: { $ne: facultyId } 
        });
        if (duplicate) {
            return res.status(409).json({ success: false, message: "Email already in use by another faculty" });
        }
    }
    if (phno) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phno)) {
            return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits" });
        }
        updates.phno = phno;
    }

    if (password && password.trim().length > 0) {
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }
        const salt = await bcrypt.genSalt(10);
        updates.password = await bcrypt.hash(password, salt);
    }

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

    const updatedFaculty = await Faculty.findOneAndUpdate(
      { facultyId: facultyId }, 
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedFaculty) {
        return res.status(404).json({ success: false, message: "Faculty member not found" });
    }

    // 📝 Log Update
    await logAction({
      actionType: 'UPDATE_USER',
      title: 'Faculty Details Updated',
      message: `Faculty ${updatedFaculty.name} updated by Admin.`,
      actor: { userId: req.userId, role: 'Admin' },
      metadata: { facultyId }
    });

    res.json({ 
        success: true, 
        message: "Profile updated successfully", 
        faculty: {
            name: updatedFaculty.name,
            facultyId: updatedFaculty.facultyId,
            image: updatedFaculty.image,
            email: updatedFaculty.mail
        }
    });

  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   DELETE FACULTY
============================ */
export const deleteFacultyById = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const deletedFaculty = await Faculty.findOneAndDelete({ facultyId });

    if (!deletedFaculty) {
      return res.status(404).json({ success: false, message: "Faculty member not found" });
    }

    await FacultySchedule.findOneAndDelete({ faculty: deletedFaculty._id });

    // 📝 Log Deletion
    await logAction({
      actionType: 'DELETE_USER',
      title: 'Faculty Deleted',
      message: `Faculty ${deletedFaculty.name} and their schedule were removed.`,
      actor: { userId: req.userId, role: 'Admin' },
      metadata: { facultyId }
    });

    res.json({ 
      success: true, 
      message: `Faculty ${deletedFaculty.name} and their schedule deleted successfully.` 
    });

  } catch (err) {
    console.error("Delete Faculty Error:", err);
    res.status(500).json({ success: false, message: "Server error during deletion" });
  }
};

/* ============================
   ADD SCHEDULE SLOT
============================ */
export const addScheduleSlot = async (req, res) => {
  try {
    const facultyId = req.userId;
    const { 
      day, branch, year, section, subject, room, type, batch, 
      startTime, endTime, periodIndex 
    } = req.body;

    const scheduleDoc = await FacultySchedule.findOne({ faculty: facultyId }).lean();
    const newStart = timeToMinutes(startTime); 
    const newEnd = timeToMinutes(endTime); 

    if (scheduleDoc && scheduleDoc.timetable) {
        const daySlots = scheduleDoc.timetable.filter(s => 
            s.day.toLowerCase().trim() === day.toLowerCase().trim()
        );

        for (const slot of daySlots) {
            const existingStart = timeToMinutes(slot.startTime); 
            const existingEnd = timeToMinutes(slot.endTime); 

            if (newStart < existingEnd && newEnd > existingStart) {
                return res.status(409).json({
                    success: false,
                    message: `Conflict! Slot overlaps with "${slot.subject}" (${slot.startTime} - ${slot.endTime})`
                });
            }
        }
    }

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

    // 📝 Log Schedule Change
    await logAction({
      actionType: 'UPDATE_SCHEDULE',
      title: 'Schedule Slot Added',
      message: `Added ${subject} for ${branch} ${year}-${section}`,
      actor: { userId: facultyId, role: 'Faculty' },
      metadata: { day, startTime, endTime }
    });

    res.json({
      success: true,
      message: "Schedule added successfully",
      slot: updated.timetable[updated.timetable.length - 1]
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   DELETE SCHEDULE
============================ */
export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.userId;

    const result = await FacultySchedule.findOneAndUpdate(
      { faculty: facultyId },
      { $pull: { timetable: { _id: id } } },
      { new: true }
    );

    if (!result) return res.status(404).json({ success: false, message: "Schedule not found" });

    // 📝 Log Schedule Change
    await logAction({
      actionType: 'UPDATE_SCHEDULE',
      title: 'Schedule Slot Removed',
      actor: { userId: facultyId, role: 'Faculty' }
    });

    res.json({ success: true, message: "Slot removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   UPDATE FACULTY PROFILE (Self)
============================ */
export const updateFacultyProfile = async (req, res) => {
  try {
    const facultyId = req.userId; 
    const currentFaculty = await Faculty.findById(facultyId);
    if (!currentFaculty) {
        return res.status(404).json({ success: false, message: "Faculty record not found" });
    }

    const { name, phno, image } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();

    if (phno) {
        const cleanPhno = phno.trim();
        if (cleanPhno !== currentFaculty.phno) {
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(cleanPhno)) {
                return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits" });
            }
            const duplicate = await Faculty.findOne({ 
                phno: cleanPhno, 
                _id: { $ne: facultyId } 
            });
            if (duplicate) {
                return res.status(409).json({ success: false, message: "Phone number already in use by another faculty" });
            }
            updates.phno = cleanPhno;
        }
    }

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
    } else if (image) {
        updates.image = image;
    }

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      facultyId, 
      { $set: updates }, 
      { new: true, runValidators: true }
    ).select("-password");

    // 📝 Log Self Update
    await logAction({
      actionType: 'UPDATE_PROFILE',
      title: 'Faculty Profile Updated',
      actor: { userId: facultyId, role: 'Faculty', name: updatedFaculty.name, ipAddress: req.ip }
    });

    res.json({ 
      success: true, 
      message: "Profile updated successfully", 
      faculty: updatedFaculty 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   MARK ATTENDANCE
============================ */
export const markAttendance = async (req, res) => {
  try {
    const { classId, date, attendanceData } = req.body; 
    const facultyId = req.userId;
    const attendanceDate = normalizeDate(date);

    const scheduleDoc = await FacultySchedule.findOne(
      { "timetable._id": classId }, 
      { "timetable.$": 1 }
    );
    if (!scheduleDoc) return res.status(404).json({ success: false, message: "Class not found" });
    const schedule = scheduleDoc.timetable[0];

    const newAbsentIds = attendanceData
      .filter(r => r.status === "Absent")
      .map(r => r.studentId);

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
      let currentRecords = student.attendanceRecord ? JSON.parse(JSON.stringify(student.attendanceRecord)) : [];
      let subIndex = currentRecords.findIndex(r => r.subject === schedule.subject);
      
      let subRec;
      if (subIndex === -1) {
        subRec = { subject: schedule.subject, totalClasses: 0, presentClasses: 0, percentage: 0 };
        currentRecords.push(subRec);
        subIndex = currentRecords.length - 1;
      } else {
        subRec = currentRecords[subIndex];
      }

      if (!isUpdate || subRec.totalClasses === 0) {
        subRec.totalClasses += 1;
        if (!isNowAbsent) subRec.presentClasses += 1;
      } else {
        const wasAbsent = oldAbsentIds.includes(studentIdStr);
        if (wasAbsent && !isNowAbsent) {
          subRec.presentClasses += 1;
        } else if (!wasAbsent && isNowAbsent) {
          subRec.presentClasses -= 1;
        }
      }

      subRec.percentage = subRec.totalClasses > 0 ? (subRec.presentClasses / subRec.totalClasses) * 100 : 100;
      currentRecords[subIndex] = subRec;

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

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps);
    }

    // 📝 Log Attendance Action
    await logAction({
      actionType: 'MARK_ATTENDANCE',
      title: isUpdate ? 'Attendance Updated' : 'Attendance Marked',
      message: `${schedule.subject} for ${schedule.branch} ${schedule.year}-${schedule.section || schedule.batch}`,
      actor: { userId: facultyId, role: 'Faculty' },
      metadata: { classId, date: attendanceDate }
    });

    res.json({ 
      success: true, 
      message: isUpdate ? "Attendance updated successfully!" : "Attendance saved successfully!" 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   CHANGE PASSWORD
============================ */
export const changeFacultyPassword = async (req, res) => {
  try {
    const facultyId = req.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both passwords are required" });
    }

    const faculty = await Faculty.findById(facultyId).select('+password');
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, faculty.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Incorrect old password" });
    }

    if (oldPassword === newPassword) {
        return res.status(400).json({ success: false, message: "New password cannot be same as old" });
    }

    faculty.password = newPassword; 
    await faculty.save();

    // 📝 Log Password Change
    await logAction({
      actionType: 'CHANGE_PASSWORD',
      title: 'Faculty Password Changed',
      actor: { userId: facultyId, role: 'Faculty', name: faculty.name, ipAddress: req.ip }
    });

    res.json({ success: true, message: "Password changed successfully" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
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



const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  if (hours === 12) hours = 0;
  if (modifier === "PM") hours += 12;
  return hours * 60 + minutes;
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

export const getAllFacultyList = async (req, res) => {
  try {
    // We only need the ID and Name for the dropdown
    const facultyList = await Faculty.find({}).select('name _id');
    res.status(200).json({ success: true, data: facultyList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};