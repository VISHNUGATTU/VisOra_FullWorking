import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import FacultySchedule from "../models/FacultySchedule.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { logAction } from "../configs/logger.js"; // ✅ Imported Logger

/* ============================
   LOGIN STUDENT
============================ */
export const loginStudent = async (req, res) => {
  try {
    const { mail, password } = req.body;

    if (!mail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const student = await Student.findOne({ mail });
    if (!student) {
      // 📝 Log Failed Attempt
      await logAction({
        actionType: 'AUTH_FAILURE',
        title: 'Student Login Failed',
        message: `Invalid email attempt: ${mail}`,
        status: 'Failed'
      });
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      // 📝 Log Failed Attempt
      await logAction({
        actionType: 'AUTH_FAILURE',
        title: 'Student Login Failed',
        message: `Wrong password for: ${mail}`,
        actor: { userId: student._id, role: 'Student', name: student.name },
        status: 'Failed'
      });
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = jwt.sign(
      { id: student._id, role: "STUDENT" },
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
      title: 'Student Login Success',
      message: `${student.name} (${student.rollno}) logged in.`,
      actor: { userId: student._id, role: 'Student', name: student.name, ipAddress: req.ip }
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      student: {
        id: student._id,
        name: student.name,
        mail: student.mail,
        rollno: student.rollno,
        branch: student.branch,
        year: student.year,
        section: student.section,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ============================
   LOGOUT STUDENT
============================ */
export const logoutStudent = async (req, res) => {
  // 📝 Log Logout
  await logAction({
    actionType: 'LOGOUT',
    title: 'Student Logged Out',
    actor: { userId: req.userId, role: 'Student', ipAddress: req.ip }
  });

  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

/* ============================
   ADD STUDENT
============================ */
export const addStudent = async (req, res) => {
  try {
    let { name, password, branch, rollno, mail, phno, year, section, image } = req.body;

    if (!name || !password || !branch || !rollno || !mail || !phno || !year || !section) {
        return res.status(400).json({ success: false, message: "All text fields are mandatory" });
    }
    if (!req.file && !image) {
        return res.status(400).json({ success: false, message: "Profile image is mandatory" });
    }

    name = name.trim();
    branch = branch.trim().toUpperCase();
    rollno = rollno.trim().toUpperCase();
    mail = mail.trim().toLowerCase();
    phno = phno.trim();
    section = section.trim().toUpperCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) return res.status(400).json({ success: false, message: "Invalid email format" });

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phno)) return res.status(400).json({ success: false, message: "Phone must be 10 digits" });

    const exists = await Student.findOne({
      $or: [{ rollno }, { mail }, { phno }],
    });

    if (exists) {
      let field = exists.rollno === rollno ? "Roll Number" 
                  : exists.mail === mail ? "Email" 
                  : "Phone Number";
      return res.status(409).json({ success: false, message: `${field} already exists.` });
    }

    let imageUrl = "";
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "student_profiles" },
          (error, result) => {
            if (error) reject(error); else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = uploadResult.secure_url;
    } else if (image) {
      imageUrl = image;
    }

    const student = await Student.create({
      name,
      password,
      branch,
      year: Number(year),
      section,
      rollno,
      mail,
      phno,
      image: imageUrl,
    });

    // 📝 Log Creation
    await logAction({
      actionType: 'CREATE_USER',
      title: 'New Student Added',
      message: `Student ${name} (${rollno}) added to ${branch} ${year}-${section}`,
      actor: { userId: req.userId, role: 'Admin' }, // Typically added by Admin
      metadata: { rollno, branch, year }
    });

    return res.status(201).json({
      success: true,
      message: "Student added successfully",
      student: { name: student.name, rollno: student.rollno },
    });

  } catch (error) {
    if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]; 
        return res.status(409).json({ success: false, message: `Duplicate detected: ${field} already in use.` });
    }
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   UPDATE STUDENT BY ROLL
============================ */
export const updateStudentByRoll = async (req, res) => {
  try {
    const { rollno: oldRollno } = req.params; 
    
    if (!oldRollno) {
        return res.status(400).json({ success: false, message: "Roll Number is required in URL" });
    }

    const { name, password, branch, mail, phno, rollno: newRollno, year, section, image } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (branch) updateData.branch = branch.trim().toUpperCase();
    if (year) updateData.year = Number(year);
    if (section) updateData.section = section.trim().toUpperCase();

    const conflictQuery = { 
        $and: [
            { rollno: { $ne: oldRollno } }, 
            { $or: [] } 
        ] 
    };

    if (mail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mail)) return res.status(400).json({ success: false, message: "Invalid email format" });
        updateData.mail = mail.trim().toLowerCase();
        conflictQuery.$and[1].$or.push({ mail: updateData.mail });
    }

    if (phno) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phno)) return res.status(400).json({ success: false, message: "Phone must be 10 digits" });
        updateData.phno = phno.trim();
        conflictQuery.$and[1].$or.push({ phno: updateData.phno });
    }

    if (newRollno) {
        const cleanRoll = newRollno.trim().toUpperCase();
        if (cleanRoll !== oldRollno) {
            updateData.rollno = cleanRoll;
            updateData.username = cleanRoll;
            conflictQuery.$and[1].$or.push({ rollno: cleanRoll });
        }
    }

    if (conflictQuery.$and[1].$or.length > 0) {
        const duplicate = await Student.findOne(conflictQuery);
        if (duplicate) {
            let msg = "Duplicate details found";
            if (duplicate.mail === updateData.mail) msg = "Email already exists";
            else if (duplicate.phno === updateData.phno) msg = "Phone number already exists";
            else if (duplicate.rollno === updateData.rollno) msg = "Roll Number already exists";
            return res.status(409).json({ success: false, message: msg });
        }
    }

    if (password && password.trim().length > 0) {
        if (password.length < 6) return res.status(400).json({ success: false, message: "Password too short" });
        updateData.password = await bcrypt.hash(password, 10);
    }

    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: "students" },
                (error, result) => (error ? reject(error) : resolve(result))
            );
            stream.end(req.file.buffer);
        });
        updateData.image = uploadResult.secure_url;
      } catch (err) {
         return res.status(500).json({ success: false, message: "Image upload failed" });
      }
    } else if (image) {
      updateData.image = image;
    }

    const updatedStudent = await Student.findOneAndUpdate(
      { rollno: oldRollno },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedStudent) {
        return res.status(404).json({ success: false, message: "Student not found" });
    }

    // 📝 Log Update
    await logAction({
      actionType: 'UPDATE_USER',
      title: 'Student Profile Updated',
      message: `Admin/System updated profile for ${updatedStudent.name} (${updatedStudent.rollno})`,
      actor: { userId: req.userId, role: 'Admin' },
      metadata: { rollno: updatedStudent.rollno }
    });

    res.json({ success: true, message: "Student updated successfully", student: updatedStudent });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   DELETE STUDENT
============================ */
export const deleteStudentByRoll = async (req, res) => {
  try {
    const id = req.params.id; 

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    await Attendance.updateMany(
      { absentees: id },
      { $pull: { absentees: id } }
    );

    // 📝 Log Deletion
    await logAction({
      actionType: 'DELETE_USER',
      title: 'Student Deleted',
      message: `Student ${deleted.name} (${deleted.rollno}) removed from database.`,
      actor: { userId: req.userId, role: 'Admin' },
      metadata: { rollno: deleted.rollno }
    });

    res.json({
      success: true,
      message: `Student ${deleted.name} (${deleted.rollno}) deleted permanently.`,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/* ============================
   PROMOTE STUDENTS
============================ */
export const promoteStudents = async (req, res) => {
    const { targetYear } = req.body; 
  
    if (![1, 2, 3, 4].includes(Number(targetYear))) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid target year. Please select 1, 2, 3, or 4." 
      });
    }
  
    try {
      let result;
      let message = "";
  
      if (Number(targetYear) === 4) {
        result = await Student.updateMany(
          { year: 4, isGraduated: false }, 
          { 
            $set: { 
              isGraduated: true,
              year: 5 
            } 
          }
        );
        message = `Successfully graduated ${result.modifiedCount} Final Year students to Alumni status.`;
      } 
      else {
        result = await Student.updateMany(
          { year: Number(targetYear), isGraduated: false },
          { $inc: { year: 1 } }
        );
        message = `Successfully promoted ${result.modifiedCount} students from Year ${targetYear} to Year ${targetYear + 1}.`;
      }
  
      // 📝 Log Bulk Action
      await logAction({
        actionType: 'BATCH_PROMOTION',
        title: 'Students Promoted',
        message: message,
        actor: { userId: req.userId, role: 'Admin' },
        metadata: { targetYear, modifiedCount: result.modifiedCount }
      });

      res.json({
        success: true,
        message: message,
        modifiedCount: result.modifiedCount
      });
  
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Server Error: Could not complete bulk promotion." 
      });
    }
};

/* ============================
   UPDATE STUDENT PASSWORD
============================ */
export const updateStudentPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const studentId = req.userId;

    const student = await Student.findById(studentId);
    
    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password does not match." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await Student.findByIdAndUpdate(studentId, { password: hashedPassword });

    // 📝 Log Password Change
    await logAction({
      actionType: 'UPDATE_PASSWORD',
      title: 'Student Password Changed',
      actor: { userId: studentId, role: 'Student', name: student.name, ipAddress: req.ip }
    });

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error during password update." });
  }
};

/* ============================
   UPDATE STUDENT SETTINGS
============================ */
export const updateStudentSettings = async (req, res) => {
  try {
    const studentId = req.userId;
    const { notifications, theme, language } = req.body;

    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      { 
        $set: { 
          "settings.notifications": notifications,
          "settings.theme": theme,
          "settings.language": language 
        } 
      },
      { new: true }
    ).select("-password").lean();

    // 📝 Log Settings Change
    await logAction({
      actionType: 'UPDATE_SETTINGS',
      title: 'Student Settings Updated',
      actor: { userId: studentId, role: 'Student', name: updatedStudent.name, ipAddress: req.ip }
    });

    res.json({ 
      success: true, 
      message: "Settings updated!", 
      settings: updatedStudent.settings 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   IS AUTH (CHECK SESSION)
============================ */
export const isStudentAuth = async (req, res) => {
  try {
    const student = await Student.findById(req.userId).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ============================
   GET STUDENT PROFILE
============================ */
export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.userId).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ============================
   GET STUDENT BY ROLL
============================ */
export const getStudentByRoll = async (req, res) => {
  try {
    const student = await Student.findOne({
      rollno: req.params.rollno,
    }).select("-password");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({ success: true, student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   SEARCH STUDENTS (UPDATED)
============================ */
export const searchStudents = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, students: [] });

    const students = await Student.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { rollno: { $regex: q, $options: "i" } },
        { mail: { $regex: q, $options: "i" } }
      ]
    }).limit(10).select("-password");

    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAttendanceHistory = async (req, res) => {
  try {
    const studentId = req.userId;

    // Find records where this student was marked absent
    const history = await Attendance.find({
      absentees: studentId
    })
    .sort({ date: -1 }) // Show most recent absences first
    .select("date subject facultyId type")
    .populate("facultyId", "name") 
    .lean();

    const formattedHistory = history.map(record => ({
      id: record._id,
      date: record.date,
      subject: record.subject,
      type: record.type || "Lecture",
      faculty: record.facultyId?.name || "Faculty"
    }));

    res.json({ success: true, history: formattedHistory });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentHomeData = async (req, res) => {
  try {
    const studentId = req.userId;
    if (!studentId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const student = req.student; 
    const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    // Use Number() to match types
    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    
    // 🔥 FIX: Explicitly cast to Number for the query to prevent type-mismatch 500 errors
    const studentYear = Number(student.year);

    const schedules = await FacultySchedule.find({
      "timetable.day": todayName,
      "timetable.year": studentYear,
      "timetable.branch": student.branch,
      "timetable.section": student.section
    }).lean();

    let todaysClasses = [];
    schedules.forEach(doc => {
      // Filter the timetable array for slots matching THIS student
      const mySlots = doc.timetable.filter(slot => 
        slot.day === todayName && 
        Number(slot.year) === studentYear && 
        slot.branch === student.branch && 
        slot.section === student.section
      );
      todaysClasses.push(...mySlots);
    });

    // Sort by periodIndex (or pIndex)
    todaysClasses.sort((a, b) => (a.periodIndex || 0) - (b.periodIndex || 0));

    res.json({
      success: true,
      greeting: student.name ? student.name.split(' ')[0] : "Student",
      overallPercentage: student.attendanceSummary?.percentage || 0,
      todaysClasses: todaysClasses || [], // Ensure this is never null/undefined
      summary: student.attendanceSummary || { totalClasses: 0, presentClasses: 0 }
    });
  } catch (error) {
    console.error("Home Data Error:", error);
    // Return an empty array instead of crashing the frontend
    res.status(500).json({ success: false, message: error.message, todaysClasses: [] });
  }
};

export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.userId;

    // Fetch student and exclude sensitive data
    const student = await Student.findById(studentId)
      .select("name rollno branch year section attendanceSummary attendanceRecord image")
      .lean();

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // Process the attendance record to add "Status" and "Classes to Attend"
    const processedSubjects = (student.attendanceRecord || []).map(sub => {
      const percentage = sub.percentage || 0;
      let classesToAttend = 0;

      // Logic: If below 75%, calculate how many more classes needed to reach 75%
      if (percentage < 75) {
        // Formula: (0.75 * Total - Present) / 0.25
        classesToAttend = Math.ceil((0.75 * sub.totalClasses - sub.presentClasses) / 0.25);
      }

      return {
        ...sub,
        percentage: Number(percentage.toFixed(1)),
        status: percentage < 75 ? "Critical" : "Safe",
        classesToAttend: classesToAttend > 0 ? classesToAttend : 0
      };
    });

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
      overall: student.attendanceSummary || { totalClasses: 0, presentClasses: 0, percentage: 0 },
      subjects: processedSubjects
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentFullSchedule = async (req, res) => {
  try {
    const student = req.student;

    // We find schedules and populate faculty contact details
    const schedules = await FacultySchedule.find({
      "timetable.year": Number(student.year),
      "timetable.branch": student.branch,
      "timetable.section": student.section
    })
    .populate("faculty", "name phno mail image") // 🔥 Pulling contact info here
    .lean();

    const fullWeek = {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: []
    };

    schedules.forEach(doc => {
  doc.timetable.forEach(slot => {
    if (
      Number(slot.year) === Number(student.year) &&
      slot.branch === student.branch &&
      slot.section === student.section
    ) {
      fullWeek[slot.day].push({
        subject: slot.subject,
        room: slot.room,
        type: slot.type,
        periodIndex: slot.periodIndex,
        // 🔥 EXPLICIT TIME MAPPING
        time: slot.time || `${slot.startTime} - ${slot.endTime}`, 
        facultyName: doc.faculty?.name || "Professor",
        facultyPhone: doc.faculty?.phno || "N/A",
        facultyEmail: doc.faculty?.mail || "N/A",
        facultyImage: doc.faculty?.image || ""
      });
    }
  });
});

    Object.keys(fullWeek).forEach(day => {
      fullWeek[day].sort((a, b) => (a.periodIndex || 0) - (b.periodIndex || 0));
    });

    res.json({ success: true, schedule: fullWeek });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
