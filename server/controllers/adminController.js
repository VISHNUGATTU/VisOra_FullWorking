import Admin from "../models/Admin.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import FacultySchedule from "../models/FacultySchedule.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { logAction } from "../configs/logger.js";
import mongoose from "mongoose";

/* ============================
   LOGIN ADMIN
============================ */
export const loginAdmin = async (req, res) => {
  try {
    const { mail, password1, password2 } = req.body;

    if (!mail || !password1 || !password2) {
      return res.status(400).json({ success: false, message: "Missing credentials" });
    }

    const admin = await Admin.findOne({ mail });
    if (!admin) {
      // 📝 Log Failed Attempt
      await logAction({
        actionType: 'AUTH_FAILURE',
        title: 'Admin Login Failed',
        message: `Invalid email attempt: ${mail}`,
        status: 'Failed'
      });
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const match1 = await bcrypt.compare(password1, admin.password1);
    const match2 = await bcrypt.compare(password2, admin.password2);

    if (!match1 || !match2) {
      // 📝 Log Failed Attempt
      await logAction({
        actionType: 'AUTH_FAILURE',
        title: 'Admin Login Failed',
        message: `Wrong password for: ${mail}`,
        actor: { userId: admin._id, role: 'Admin', name: admin.name },
        status: 'Failed'
      });
      return res.status(401).json({ success: false, message: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: "ADMIN" },
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
      title: 'Admin Login Success',
      message: `${admin.name} logged in.`,
      actor: { userId: admin._id, role: 'Admin', name: admin.name, ipAddress: req.ip }
    });

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      role: "admin",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   IS AUTH
============================ */
export const isAdminAuth = async (req, res) => {
  try {
    const admin = await Admin.findById(req.userId).select("-password1 -password2");
    if (!admin) return res.json({ success: false, message: "Admin not found" });

    return res.json({ success: true, admin });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

/* ============================
   LOGOUT
============================ */
export const logoutAdmin = async (req, res) => {
  try {
    // 📝 Log Action
    await logAction({
      actionType: 'LOGOUT',
      title: 'Admin Logged Out',
      actor: { userId: req.userId, role: 'Admin', ipAddress: req.ip }
    });

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });
    return res.json({ success: true, message: "Logout successful" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

/* ============================
   UPDATE ADMIN PROFILE
============================ */
export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.userId; 

    if (!adminId) {
        return res.status(401).json({ success: false, message: "Unauthorized: User ID missing" });
    }
    
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin account not found" });
    }

    const { name, phone, mail } = req.body;

    if (name) admin.name = name.trim();

    if (phone) {
        const cleanPhone = phone.trim();
        if (cleanPhone !== admin.phone) {
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(cleanPhone)) {
                return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits" });
            }
            const phoneExists = await Admin.findOne({ phone: cleanPhone, _id: { $ne: adminId } });
            if (phoneExists) {
                return res.status(409).json({ success: false, message: "Phone number already in use" });
            }
            admin.phone = cleanPhone;
        }
    }

    if (mail) {
        const cleanMail = mail.trim().toLowerCase();
        if (cleanMail !== admin.mail) {
             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
             if (!emailRegex.test(cleanMail)) {
                return res.status(400).json({ success: false, message: "Invalid email format" });
             }
             const emailExists = await Admin.findOne({ mail: cleanMail, _id: { $ne: adminId } });
             if (emailExists) {
                 return res.status(409).json({ success: false, message: "Email already in use" });
             }
             admin.mail = cleanMail;
        }
    }

    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "admin_profiles", resource_type: "image" },
            (error, result) => {
              if (error) reject(error); else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
        admin.image = uploadResult.secure_url;
      } catch (err) {
        console.error("Cloudinary Error:", err);
        return res.status(500).json({ success: false, message: "Image upload failed" });
      }
    }

    await admin.save();

    // 📝 Log Success
    await logAction({
      actionType: 'UPDATE_PROFILE',
      title: 'Admin Profile Updated',
      message: `Profile data updated for ${admin.name}`,
      actor: { userId: admin._id, role: 'Admin', name: admin.name, ipAddress: req.ip }
    });

    const adminData = admin.toObject();
    delete adminData.password1; 
    delete adminData.password2; 

    return res.json({ success: true, message: "Profile updated successfully", admin: adminData });

  } catch (error) {
    console.error("Update Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

/* ============================
   VERIFY SINGLE PASSWORD (GENERAL)
============================ */
export const verifyAdminPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "Password required" });
    }

    const admin = await Admin.findById(req.userId); 
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password1);

    if (!isMatch) {
      // 📝 Log verification failure
      await logAction({
        actionType: 'VERIFY_FAILURE',
        title: 'Admin Password Verification Failed',
        actor: { userId: admin._id, role: 'Admin', name: admin.name },
        status: 'Warning'
      });
      return res.status(401).json({ success: false, message: "Invalid admin password" });
    }

    res.json({ success: true, message: "Admin verified" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   VERIFY DUAL PASSWORDS (SENSITIVE)
============================ */
export const verifyAdminPasswords = async (req, res) => {
  const { passwordOne, passwordTwo } = req.body; 

  try {
    const adminId = req.userId;
    const admin = await Admin.findById(adminId).select("+password1 +password2");

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const isMatch1 = await bcrypt.compare(passwordOne, admin.password1);
    const isMatch2 = await bcrypt.compare(passwordTwo, admin.password2);

    if (!isMatch1 || !isMatch2) {
       // 📝 Log failure
       await logAction({
        actionType: 'SENSITIVE_AUTH_FAILURE',
        title: 'Dual Password Verification Failed',
        actor: { userId: admin._id, role: 'Admin', name: admin.name },
        status: 'Warning'
      });
      return res.status(401).json({ success: false, message: "Authentication failed" });
    }

    // 📝 Log Success
    await logAction({
      actionType: 'SENSITIVE_AUTH_SUCCESS',
      title: 'Dual Password Verified',
      actor: { userId: admin._id, role: 'Admin', name: admin.name }
    });

    res.status(200).json({ success: true, message: "Dual Authentication Successful" });

  } catch (error) {
    res.status(500).json({ success: false, message: "Server Verification Error" });
  }
};

/* ============================
   PROMOTE STUDENTS
============================ */
export const promoteStudents = async (req, res) => {
  const { targetYear } = req.body; 

  if (![1, 2, 3, 4].includes(targetYear)) {
    return res.status(400).json({ success: false, message: "Invalid year selected." });
  }

  try {
    let result;
    let message = "";

    if (targetYear === 4) {
      result = await Student.updateMany(
        { year: 4, isGraduated: false }, 
        { $set: { year: 5, isGraduated: true } }
      );
      message = `Graduated ${result.modifiedCount} Final Year students.`;
    } 
    else {
      result = await Student.updateMany(
        { year: targetYear, isGraduated: false },
        { $inc: { year: 1 } }
      );
      message = `Promoted ${result.modifiedCount} students from Year ${targetYear} to ${targetYear + 1}.`;
    }

    // 📝 Log Bulk Action
    await logAction({
      actionType: 'STUDENT_PROMOTION',
      title: 'Batch Students Promoted',
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
    res.status(500).json({ success: false, message: error.message });
  }
};

// ... other functions (getDashboardStats, getSystemLogs) kept original ...
/* ============================
   DASHBOARD STATS (UPDATED FOR BUCKET SCHEMA)
============================ */
export const getDashboardStats = async (req, res) => {
  try {
    // 1. Get total counts
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await Faculty.countDocuments();

    // 2. Get today's classes count
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const today = days[new Date().getDay()];
    
    // Aggregation: Sum up the 'timetable' array length where day === today
    const activeClassesResult = await FacultySchedule.aggregate([
        // Stage 1: Filter documents that have AT LEAST ONE class today (Optimization)
        { $match: { "timetable.day": today } },
        
        // Stage 2: Filter the array to only keep today's slots and count them
        { $project: {
            count: {
                $size: {
                    $filter: {
                        input: "$timetable",
                        as: "slot",
                        cond: { $eq: ["$$slot.day", today] }
                    }
                }
            }
        }},
        
        // Stage 3: Sum up the counts from all faculty
        { $group: { _id: null, total: { $sum: "$count" } } }
    ]);

    const activeClasses = activeClassesResult.length > 0 ? activeClassesResult[0].total : 0;

    res.json({
      activeClasses: activeClasses,
      totalStudents: totalStudents,
      totalFaculty: totalFaculty,
      pendingApprovals: 0 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    const start = Date.now();
    
    if (mongoose.connection.readyState !== 1) {
       throw new Error("Database not connected");
    }

    await mongoose.connection.db.admin().ping();
    const latency = Date.now() - start;

    // We send a flat object for easy access
    res.status(200).json({
      success: true,
      database: 'connected', 
      latency: latency, 
      aiEngine: 'maintenance',
      telegramBot: 'maintenance'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      database: 'disconnected', 
      latency: 0 
    });
  }
};