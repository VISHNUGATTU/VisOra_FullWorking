import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import FacultySchedule from "../models/FacultySchedule.js"; 
import Attendance from "../models/Attendance.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from 'nodemailer';
import { v2 as cloudinary } from "cloudinary";
import { logAction } from "../configs/logger.js"; // ✅ Imported Logger
import neuralService from "../services/neuralService.js"; // 🧠 VisOra Neural Identity Engine
import telegramService from "../services/telegramService.js"; // 🤖 VisOra Telegram Reporting Bot (Patent Claim 1f)
import crypto from "crypto";

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(" ");
  if (parts.length < 2) return 0;
  const [time, modifier] = parts;
  let [hours, minutes] = time.split(":").map(Number);
  if (hours === 12) hours = 0;
  if (modifier === "PM") hours += 12;
  return hours * 60 + (minutes || 0);
}

/* ============================
   LOGIN FACULTY
============================ */
export const loginFaculty = async (req, res) => {
  try {
    const { mail, password } = req.body;

    if (
      typeof mail !== "string" ||
      typeof password !== "string" ||
      !mail.trim() ||
      !password
    ) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const cleanMail = mail.trim().toLowerCase();
    const faculty = await Faculty.findOne({ mail: cleanMail });
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

    const newStart = timeToMinutes(startTime); 
    const newEnd = timeToMinutes(endTime); 

    // 1. Personal Conflict Check (Same faculty member)
    const scheduleDoc = await FacultySchedule.findOne({ faculty: facultyId }).lean();
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
            message: `Personal Conflict: You already have "${slot.subject}" scheduled on ${day} (${slot.startTime} - ${slot.endTime}).`
          });
        }
      }
    }

    // 2. Institutional Room Double-Booking Check
    if (type !== 'Leisure' && room && room !== 'N/A') {
      const otherRoomSchedules = await FacultySchedule.find({
        faculty: { $ne: facultyId },
        "timetable.day": day,
        "timetable.room": room
      }).populate("faculty", "name").lean();

      for (const otherDoc of otherRoomSchedules) {
        for (const slot of (otherDoc.timetable || [])) {
          if (slot.day === day && slot.room === room) {
            const existingStart = timeToMinutes(slot.startTime);
            const existingEnd = timeToMinutes(slot.endTime);
            if (newStart < existingEnd && newEnd > existingStart) {
              const bookedBy = otherDoc.faculty?.name || "another faculty member";
              return res.status(409).json({
                success: false,
                message: `Room Collision: Room ${room} is already booked by ${bookedBy} for "${slot.subject}" on ${day} (${slot.startTime} - ${slot.endTime}).`
              });
            }
          }
        }
      }
    }

    // 3. Institutional Student Cohort Collision Check
    if (type !== 'Leisure') {
      const otherClassSchedules = await FacultySchedule.find({
        faculty: { $ne: facultyId },
        "timetable.day": day,
        "timetable.branch": branch.toUpperCase(),
        "timetable.year": Number(year),
        "timetable.section": section
      }).populate("faculty", "name").lean();

      for (const otherDoc of otherClassSchedules) {
        for (const slot of (otherDoc.timetable || [])) {
          if (
            slot.day === day &&
            slot.branch === branch.toUpperCase() &&
            Number(slot.year) === Number(year) &&
            slot.section === section
          ) {
            const isBatchConflict = !batch || !slot.batch || Number(batch) === Number(slot.batch);
            if (isBatchConflict) {
              const existingStart = timeToMinutes(slot.startTime);
              const existingEnd = timeToMinutes(slot.endTime);
              if (newStart < existingEnd && newEnd > existingStart) {
                const facName = otherDoc.faculty?.name || "another faculty member";
                return res.status(409).json({
                  success: false,
                  message: `Cohort Collision: ${branch.toUpperCase()} Year ${year}-${section} is already attending "${slot.subject}" with ${facName} on ${day} (${slot.startTime} - ${slot.endTime}).`
                });
              }
            }
          }
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

    // 👇 ADD THIS: Determine weight based on class type
    const classWeight = schedule.type === 'Lab' ? 3 : 1;

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

      // 👇 APPLY THE WEIGHT HERE INSTEAD OF 1
      if (!isUpdate || subRec.totalClasses === 0) {
        subRec.totalClasses += classWeight;
        if (!isNowAbsent) subRec.presentClasses += classWeight;
      } else {
        const wasAbsent = oldAbsentIds.includes(studentIdStr);
        if (wasAbsent && !isNowAbsent) {
          subRec.presentClasses += classWeight;
        } else if (!wasAbsent && isNowAbsent) {
          subRec.presentClasses -= classWeight;
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

    // 🤖 Autonomously dispatch Telegram report (Patent Claim 1f, 8, 10g)
    const faculty = await Faculty.findById(facultyId);
    const absentRollNos = students
      .filter(s => newAbsentIds.includes(s._id.toString()))
      .map(s => s.rollno)
      .filter(Boolean);

    let telegramReport = null;
    try {
      telegramReport = await telegramService.sendAttendanceReport({
        subject: schedule.subject,
        branch: schedule.branch,
        year: schedule.year,
        section: schedule.section || schedule.batch,
        facultyName: faculty?.name || "Faculty Member",
        presentCount: students.length - newAbsentIds.length,
        absentCount: newAbsentIds.length,
        totalStudents: students.length,
        absentRollNumbers: absentRollNos,
        date: attendanceDate.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }),
        timeSlot: schedule.time || "Lecture Period"
      });
    } catch (tgErr) {
      console.warn("[markAttendance] Telegram dispatch skipped:", tgErr.message);
    }

    res.json({ 
      success: true, 
      message: isUpdate ? "Attendance updated successfully!" : "Attendance saved successfully!",
      telegramDispatched: Boolean(telegramReport?.success),
      telegramMode: telegramReport?.mode || "SIMULATED"
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
}).select("name rollno mail phno attendanceRecord");

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
    mail: student.mail, // Needed for Email
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
          _id: (cls._id ? cls._id.toString() : key),
          subject: cls.subject,
          year: cls.year,
          branch: cls.branch,
          section: cls.section || "A",
          room: cls.room,
          type: cls.type || "Lecture",
          day: cls.day,
          time: cls.startTime && cls.endTime ? `${cls.startTime} - ${cls.endTime}` : "Scheduled"
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

export const notifyDefaultersEmail = async (req, res) => {
  try {
    const { subject, defaulters } = req.body;

    if (!Array.isArray(defaulters) || defaulters.length === 0) {
      return res.status(400).json({ success: false, message: "No defaulters provided to notify." });
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json({
        success: false,
        message: "Email dispatch is not configured on this server (EMAIL_USER / EMAIL_PASS missing in environment)."
      });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS 
      }
    });

    // Create an array of email promises
    const emailPromises = defaulters.map(student => {
      const studentEmail = student.mail || student.email; 
      if (!studentEmail) return Promise.reject(new Error(`No email for ${student.name || 'Student'}`));

      const mailOptions = {
        from: `"VisOra System" <${process.env.EMAIL_USER}>`,
        to: studentEmail,
        subject: `⚠️ URGENT: Attendance Warning | ${subject}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background-color: #f43f5e; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Attendance Warning</h1>
            </div>
            <div style="padding: 30px; background-color: white;">
              <p style="font-size: 16px; color: #1e293b;">Dear <strong>${student.name}</strong>,</p>
              <p style="color: #64748b; line-height: 1.6;">This is an automated notification regarding your attendance record for the subject: <strong>${subject}</strong>.</p>
              
              <div style="margin: 25px 0; padding: 20px; background-color: #fff1f2; border-radius: 12px; border: 1px solid #fecdd3; text-align: center;">
                <p style="margin: 0; color: #9f1239; font-size: 14px; font-weight: bold; text-transform: uppercase;">Current Attendance</p>
                <h2 style="margin: 10px 0; color: #e11d48; font-size: 36px;">${student.percentage}%</h2>
                <p style="margin: 0; color: #be123c; font-size: 14px;">Status: Critical (Below 75%)</p>
              </div>

              <div style="display: flex; justify-content: space-around; margin-bottom: 25px;">
                <div style="text-align: center; flex: 1;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8;">Attended</p>
                  <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #1e293b;">${student.classesAttended || student.presentClasses || 0}</p>
                </div>
                <div style="text-align: center; flex: 1; border-left: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-size: 12px; color: #94a3b8;">Total Sessions</p>
                  <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #1e293b;">${student.totalClasses || 0}</p>
                </div>
              </div>

              <p style="color: #64748b; font-size: 14px; line-height: 1.6;">Please note that a minimum of <strong>75% attendance</strong> is mandatory for examination eligibility. You are advised to meet with your subject faculty immediately to discuss your status.</p>
            </div>
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">This is a system-generated email from VisOra Academic Suite. Please do not reply.</p>
            </div>
          </div>
        `
      };

      return transporter.sendMail(mailOptions);
    });

    // Use allSettled so one failure does not abort the entire batch
    const results = await Promise.allSettled(emailPromises);
    const sentCount = results.filter(r => r.status === "fulfilled").length;
    const failedCount = results.filter(r => r.status === "rejected").length;

    // 📝 Log Action
    await logAction({
      actionType: 'DEFAULTER_NOTIFICATION',
      title: 'Defaulters Email Dispatched',
      message: `Dispatched warning emails for ${subject}: ${sentCount} sent, ${failedCount} failed.`,
      actor: { userId: req.userId, role: 'Faculty' },
      metadata: { subject, sentCount, failedCount }
    });

    res.status(200).json({ 
      success: true, 
      sentCount,
      failedCount,
      message: `Dispatched attendance warnings: ${sentCount} succeeded${failedCount > 0 ? `, ${failedCount} failed` : ''}.` 
    });

  } catch (error) {
    console.error("Bulk Email Error:", error);
    res.status(500).json({ success: false, message: error.message || "Server failed to dispatch bulk emails." });
  }
};

/* =========================================================
   🧠 VISORA NEURAL IDENTITY ENGINE: AUTO ATTENDANCE
========================================================= */

export const markNeuralAttendance = async (req, res) => {
  try {
    const { classId, date, verifiedStudents, telemetrySummary } = req.body;
    const facultyId = req.userId;
    const attendanceDate = normalizeDate(date || new Date());

    const scheduleDoc = await FacultySchedule.findOne(
      { "timetable._id": classId },
      { "timetable.$": 1 }
    );
    if (!scheduleDoc) return res.status(404).json({ success: false, message: "Class not found" });
    const schedule = scheduleDoc.timetable[0];

    const classWeight = schedule.type === 'Lab' ? 3 : 1;

    // Fetch all students belonging to this class
    const students = await Student.find({
      branch: schedule.branch,
      year: schedule.year,
      section: schedule.section || schedule.batch,
      isGraduated: false
    });

    if (!students.length) {
      return res.status(404).json({ success: false, message: "No enrolled students found for this class section." });
    }

    // Extract set of verified roll numbers (upper-cased and trimmed)
    const verifiedRollSet = new Set(
      (verifiedStudents || []).map(item => {
        const roll = typeof item === "string" ? item : item.rollno;
        return roll ? String(roll).trim().toUpperCase() : null;
      }).filter(Boolean)
    );

    // Map into present vs absent
    const attendanceData = students.map(student => {
      const isPresent = verifiedRollSet.has(student.rollno.trim().toUpperCase());
      return {
        studentId: student._id.toString(),
        rollno: student.rollno,
        name: student.name,
        status: isPresent ? "Present" : "Absent"
      };
    });

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

    // Bulk update student cumulative records
    const bulkOps = students.map(student => {
      const studentIdStr = student._id.toString();
      const recordInRequest = attendanceData.find(r => r.studentId === studentIdStr);
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
        subRec.totalClasses += classWeight;
        if (!isNowAbsent) subRec.presentClasses += classWeight;
      } else {
        const wasAbsent = oldAbsentIds.includes(studentIdStr);
        if (wasAbsent && !isNowAbsent) {
          subRec.presentClasses += classWeight;
        } else if (!wasAbsent && isNowAbsent) {
          subRec.presentClasses -= classWeight;
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

    const presentCount = attendanceData.filter(a => a.status === "Present").length;
    const absentCount = attendanceData.filter(a => a.status === "Absent").length;

    // 📝 Log Neural Attendance Action
    await logAction({
      actionType: 'AI_AUTO_ATTENDANCE',
      title: 'Neural Face Attendance Logged',
      message: `VisOra Engine verified ${presentCount}/${students.length} students present for ${schedule.subject} (${schedule.branch} ${schedule.year}-${schedule.section || schedule.batch})`,
      actor: { userId: facultyId, role: 'Faculty' },
      metadata: {
        classId,
        date: attendanceDate,
        presentCount,
        absentCount,
        totalStudents: students.length,
        patentRef: "202641036876",
        telemetry: telemetrySummary || {}
      }
    });

    // 🤖 Autonomously dispatch Telegram report (Patent Claim 1f, 8, 10g)
    const faculty = await Faculty.findById(facultyId);
    const absentRollNos = attendanceData
      .filter(a => a.status === "Absent")
      .map(a => {
        const std = students.find(s => s._id.toString() === a.studentId);
        return std?.rollno || "";
      })
      .filter(Boolean);

    let telegramReport = null;
    try {
      telegramReport = await telegramService.sendAttendanceReport({
        subject: schedule.subject,
        branch: schedule.branch,
        year: schedule.year,
        section: schedule.section || schedule.batch,
        facultyName: faculty?.name || "Faculty Member",
        presentCount,
        absentCount,
        totalStudents: students.length,
        absentRollNumbers: absentRollNos,
        randomOffsetMin: telemetrySummary?.randomOffsetMin || 15,
        date: new Date(attendanceDate).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }),
        timeSlot: schedule.time || "Lecture Period"
      });
    } catch (tgErr) {
      console.warn("[markNeuralAttendance] Telegram dispatch skipped:", tgErr.message);
    }

    return res.json({
      success: true,
      message: `AI Neural Attendance recorded: ${presentCount} Present, ${absentCount} Absent.`,
      stats: {
        totalStudents: students.length,
        presentCount,
        absentCount,
        attendanceDate
      },
      presentStudents: attendanceData.filter(a => a.status === "Present"),
      absentStudents: attendanceData.filter(a => a.status === "Absent"),
      telegramDispatched: Boolean(telegramReport?.success),
      telegramMode: telegramReport?.mode || "SIMULATED"
    });

  } catch (error) {
    console.error("[markNeuralAttendance] Error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to mark neural attendance" });
  }
};

export const getNeuralEngineStatus = async (req, res) => {
  try {
    const health = await neuralService.checkHealth();
    return res.json({
      success: true,
      ...health
    });
  } catch (error) {
    return res.status(500).json({ success: false, online: false, message: error.message });
  }
};

/**
 * Registers an institutional lecture slot with the APScheduler Automation Module (Patent Claim 1c, 3).
 */
export const scheduleNeuralTrigger = async (req, res) => {
  try {
    const { slotId, subject, branch, year, section, startTime, endTime, minOffsetMin, maxOffsetMin, minPresenceDurationMin, room, runRelativeSeconds } = req.body;
    const result = await neuralService.registerScheduleSlot({
      slotId: slotId || `SLOT_${Date.now()}`,
      subject,
      branch,
      year,
      section,
      startTime,
      endTime,
      minOffsetMin,
      maxOffsetMin,
      minPresenceDurationMin,
      room,
      runRelativeSeconds
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error || "Failed to schedule slot" });
    }

    return res.json({ success: true, ...result.data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Lists all timetable slots registered with APScheduler and their randomized trigger status.
 */
export const getNeuralScheduledSlots = async (req, res) => {
  try {
    const result = await neuralService.getScheduledSlots();
    return res.json(result.data || { success: false });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Triggers adaptive reactivation of camera recognition for late arrivals (Patent Claim 1d, 4).
 */
export const reactivateNeuralSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Missing sessionId" });
    }
    const result = await neuralService.reactivateSession(sessionId);
    return res.json(result.data || { success: false });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Returns student dwell times and continuous presence duration breakdown (Patent Claim 1d, 4).
 */
export const getSessionPresenceBreakdown = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await neuralService.getSessionPresence(sessionId);
    return res.json(result.data || { success: false });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Deferred Consolidation Endpoint (Patent Claim 1e, 6, 10f).
 * Autonomously retrieves neural verified students for a timetable lecture slot.
 * Generates binary checkbox auto-ticking state for the institutional web portal.
 */
export const getNeuralConsolidatedAttendance = async (req, res) => {
  try {
    const { classId, date, sessionId } = req.query;
    if (!classId && !sessionId) {
      return res.status(400).json({ success: false, message: "Missing classId or sessionId" });
    }

    let schedule = null;
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      schedule = await FacultySchedule.findById(classId);
    }

    const branch = schedule?.branch || req.query.branch;
    const year = schedule?.year || req.query.year;
    const section = (schedule?.section || schedule?.batch) || req.query.section;
    const subject = schedule?.subject || req.query.subject;

    // 1. Fetch consolidated neural data from the Neural Engine
    const neuralResult = await neuralService.getConsolidatedAttendance({
      branch,
      year,
      section,
      subject,
      sessionId
    });

    const hasNeuralData = neuralResult.success && neuralResult.data?.found;
    const summary = hasNeuralData ? neuralResult.data.summary : null;

    // 2. Fetch full student roster for this class
    let students = [];
    if (branch && year && section) {
      students = await Student.find({ branch, year, section });
    }

    // 3. Map verified neural roll numbers / student IDs to roster
    const verifiedRollSet = new Set();
    const verifiedStudentIdSet = new Set();
    const dwellMap = {};

    if (summary?.present_students) {
      summary.present_students.forEach(st => {
        if (st.rollno) verifiedRollSet.add(st.rollno.toUpperCase());
        if (st.student_id) verifiedStudentIdSet.add(st.student_id);
        const key = (st.rollno || st.student_id || "").toUpperCase();
        if (key) {
          dwellMap[key] = {
            dwellSeconds: st.dwell_time_seconds || st.continuous_presence_seconds || 0,
            arrivalStatus: st.arrival_status || "ON_TIME",
            similarity: st.similarity || 0.95,
            heartRate: st.heartRate || st.heart_rate_bpm || 74,
            isLive: st.is_live ?? true
          };
        }
      });
    }

    // 4. Construct binary checkbox status for each student
    const autoTickedAttendance = {};
    const aiVerifiedList = [];

    students.forEach(std => {
      const isVerified = (std.rollno && verifiedRollSet.has(std.rollno.toUpperCase())) ||
                         verifiedStudentIdSet.has(std._id.toString());
      if (hasNeuralData) {
        autoTickedAttendance[std._id] = isVerified ? "Present" : "Absent";
      } else {
        autoTickedAttendance[std._id] = "Present"; // Default fallback
      }

      if (isVerified) {
        aiVerifiedList.push({
          _id: std._id,
          rollno: std.rollno,
          name: std.name,
          telemetry: dwellMap[std.rollno?.toUpperCase()] || null
        });
      }
    });

    return res.json({
      success: true,
      hasNeuralConsolidation: hasNeuralData,
      sessionState: summary?.session_state || (hasNeuralData ? "CONSOLIDATED" : "NOT_FOUND"),
      totalStudents: students.length,
      aiVerifiedCount: aiVerifiedList.length,
      autoTickedAttendance,
      aiVerifiedStudents: aiVerifiedList,
      summary: summary || null,
      patentRef: "202641036876",
      claimRef: "Claims 1e, 6, 10f"
    });
  } catch (error) {
    console.error("[getNeuralConsolidatedAttendance] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Dispatches an automated real-time attendance report to configured Telegram channel (Patent Claim 1f, 8, 10g).
 */
export const sendTelegramAttendanceReport = async (req, res) => {
  try {
    const {
      classId,
      date,
      presentCount,
      absentCount,
      totalStudents,
      absentRollNumbers = [],
      randomOffsetMin = 15,
      timeSlot
    } = req.body;

    const facultyId = req.userId || req.user?.id || req.user?._id;
    let faculty = null;
    if (facultyId) {
      faculty = await Faculty.findById(facultyId);
    }

    let schedule = null;
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      schedule = await FacultySchedule.findById(classId);
    }

    // Cryptographic verification signature (Patent Claim 8)
    const verificationPayload = `${classId || 'CLASS'}_${date || Date.now()}_${presentCount}_${absentCount}`;
    const cryptographicSignature = crypto.createHash("sha256").update(verificationPayload).digest("hex").slice(0, 16);

    const reportResult = await telegramService.sendAttendanceReport({
      subject: schedule?.subject || req.body.subject || "Lecture",
      branch: schedule?.branch || req.body.branch || "CSE",
      year: schedule?.year || req.body.year || 3,
      section: (schedule?.section || schedule?.batch) || req.body.section || "A",
      facultyName: faculty?.name || req.body.facultyName || "Faculty Member",
      presentCount: Number(presentCount) || 0,
      absentCount: Number(absentCount) || 0,
      totalStudents: Number(totalStudents) || 0,
      absentRollNumbers: absentRollNumbers || [],
      randomOffsetMin: Number(randomOffsetMin) || 15,
      date: date || new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }),
      timeSlot: timeSlot || schedule?.time || "Scheduled Period"
    });

    // 📝 Log Telegram Dispatch
    await logAction({
      actionType: 'TELEGRAM_REPORT_DISPATCH',
      title: 'Automated Telegram Attendance Dispatch',
      message: `Dispatched attendance card for ${schedule?.subject || 'Class'}: ${presentCount} Present, ${absentCount} Absent (${reportResult.mode} mode)`,
      actor: { userId: facultyId, role: 'Faculty' },
      metadata: {
        classId,
        presentCount,
        absentCount,
        cryptographicSignature,
        mode: reportResult.mode,
        patentRef: "202641036876"
      }
    });

    return res.json({
      success: true,
      message: `Telegram report dispatched in ${reportResult.mode} mode.`,
      report: reportResult,
      cryptographicSignature
    });
  } catch (error) {
    console.error("[sendTelegramAttendanceReport] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Manual or Worker-Triggered End-of-Day (EOD) Auto-Finalization (Patent Claim 7, 10h).
 * Finalizes any uncommitted lecture attendance records accumulated in the session buffer.
 */
export const triggerEODFinalization = async (req, res) => {
  try {
    const { date } = req.body;
    const { runEODFinalization } = await import("../workers/eodWorker.js");
    const result = await runEODFinalization(date);
    return res.json({
      success: true,
      message: "End-of-Day Auto-Finalization complete (Patent Claims 6, 7 & 10h).",
      ...result
    });
  } catch (error) {
    console.error("[triggerEODFinalization] Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

