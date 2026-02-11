import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import FacultySchedule from "../models/FacultySchedule.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";

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
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
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

    return res.status(200).json({
      success: true,
      message: "Login successful",
      student: {
        id: student._id,
        name: student.name,
        mail: student.mail,
        rollno: student.rollno,
        branch: student.branch,
        year: student.year,       // ✅ Included in response
        section: student.section, // ✅ Included in response
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
   LOGOUT STUDENT
============================ */
export const logoutStudent = async (req, res) => {
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
   ADD STUDENT (UPDATED)
============================ */
export const addStudent = async (req, res) => {
  try {
    const { 
      name, 
      password, 
      branch, 
      rollno, 
      mail, 
      phno, 
      year, 
      section, 
      image 
    } = req.body;

    // --- 1. Validation ---
    if (!name || !password || !branch || !rollno || !mail || !phno || !year || !section) {
      return res.status(400).json({ success: false, message: "All fields are mandatory" });
    }

    // --- 2. Check Duplicates ---
    // Note: We check rollno, mail, and phno as they are marked unique in your schema.
    const exists = await Student.findOne({
      $or: [{ rollno }, { mail }, { phno }],
    });

    if (exists) {
      let field = exists.rollno === rollno ? "Roll Number" : exists.mail === mail ? "Email" : "Phone";
      return res.status(409).json({ success: false, message: `${field} already exists.` });
    }

    // --- 3. Handle Image ---
    let imageUrl = "";
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "student_profiles" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      imageUrl = uploadResult.secure_url;
    } else if (image) {
      imageUrl = image;
    }

    // --- 4. Create Student ---
    // NOTE: Your studentSchema has a pre("save") hook that:
    // 1. Sets username = rollno if username is missing.
    // 2. Hashes the password.
    // So we just pass the raw fields here.
    const student = await Student.create({
      name,
      password, // Will be hashed by Schema Hook
      branch,
      year: Number(year),
      section,
      rollno,
      mail,
      phno,
      image: imageUrl,
    });

    return res.status(201).json({
      success: true,
      message: "Student added successfully",
      student: { name: student.name, rollno: student.rollno },
    });

  } catch (error) {
    console.error("ADD STUDENT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
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
   UPDATE STUDENT BY ROLL (UPDATED)
============================ */
export const updateStudentByRoll = async (req, res) => {
  try {
    const oldRollno = req.params.rollno;
    const { name, password, branch, mail, phno, rollno: newRollno, year, section, image } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (branch) updateData.branch = branch;
    if (mail) updateData.mail = mail;
    if (phno) updateData.phno = phno;
    if (year) updateData.year = Number(year);
    if (section) updateData.section = section;

    // IMPORTANT: If Roll Number changes, Username MUST change to match (based on your schema)
    if (newRollno) {
        updateData.rollno = newRollno;
        updateData.username = newRollno; 
    }

    // Password hashing
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Image logic
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "students" },
          (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(req.file.buffer);
      });
      updateData.image = uploadResult.secure_url;
    } else if (image) {
      updateData.image = image;
    }

    const updated = await Student.findOneAndUpdate(
      { rollno: oldRollno },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ success: false, message: "Student not found" });

    res.json({ success: true, message: "Student updated successfully", student: updated });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: "New Roll No or Email already exists" });
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   DELETE STUDENT
============================ */
export const deleteStudentByRoll = async (req, res) => {
  try {
    const id = req.params.id; // Frontend sends student._id

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    // 1. Find and Delete Student
    // Your frontend specifically sends the MongoDB _id
    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // 2. Optional: Cleanup Attendance
    // If you store absentees by ObjectId, you might want to pull this student
    // from all attendance absentee arrays to keep the data clean.
    await Attendance.updateMany(
      { absentees: id },
      { $pull: { absentees: id } }
    );

    res.json({
      success: true,
      message: `Student ${deleted.name} (${deleted.rollno}) deleted permanently.`,
    });

  } catch (error) {
    console.error("DELETE STUDENT ERROR:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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

/* ============================
   PROMOTE STUDENTS
============================ */
export const promoteStudents = async (req, res) => {
    // targetYear represents the CURRENT year of the students you want to promote
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
  
      // SCENARIO A: GRADUATE 4TH YEAR (Alumni)
      if (Number(targetYear) === 4) {
        result = await Student.updateMany(
          { year: 4, isGraduated: false }, 
          { 
            $set: { 
              isGraduated: true,
              // We keep 'year' as 4 or set to 5 to indicate they finished 4 years
              year: 5 
            } 
          }
        );
        message = `Successfully graduated ${result.modifiedCount} Final Year students to Alumni status.`;
      } 
      
      // SCENARIO B: PROMOTE REGULAR YEARS (1->2, 2->3, 3->4)
      else {
        result = await Student.updateMany(
          { year: Number(targetYear), isGraduated: false },
          { $inc: { year: 1 } } // Using $inc is cleaner for simple addition
        );
        message = `Successfully promoted ${result.modifiedCount} students from Year ${targetYear} to Year ${targetYear + 1}.`;
      }
  
      res.json({
        success: true,
        message: message,
        modifiedCount: result.modifiedCount
      });
  
    } catch (error) {
      console.error("Batch Promotion Error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Server Error: Could not complete bulk promotion." 
      });
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


export const updateStudentPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const studentId = req.userId;

    // 1. Find the student (need the current hashed password)
    const student = await Student.findById(studentId);
    
    // 2. Compare current password
    const isMatch = await bcrypt.compare(currentPassword, student.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password does not match." });
    }

    // 3. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Update only the password field
    await Student.findByIdAndUpdate(studentId, { password: hashedPassword });

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error during password update." });
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

    res.json({ 
      success: true, 
      message: "Settings updated!", 
      settings: updatedStudent.settings 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};