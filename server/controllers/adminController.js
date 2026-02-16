import Admin from "../models/Admin.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import FacultySchedule from "../models/FacultySchedule.js"; // ✅ Correct Model
import SystemLog from "../models/SystemLog.js"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { logActivity } from "../configs/logger.js"; 

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
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Verify Both Passwords
    const match1 = await bcrypt.compare(password1, admin.password1);
    const match2 = await bcrypt.compare(password2, admin.password2);

    if (!match1 || !match2) {
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
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await logActivity(req, `Admin Logged In`, "AUTH");

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

    // 1. UPDATE NAME
    if (name) {
        admin.name = name.trim();
    }

    // 2. UPDATE PHONE (The missing part!)
    if (phone) {
        const cleanPhone = phone.trim();
        if (cleanPhone !== admin.phone) {
            // A. VALIDATION: Check for 10 digits
            const phoneRegex = /^\d{10}$/;
            if (!phoneRegex.test(cleanPhone)) {
                // 🛑 THIS will now throw the error for 9 digits
                return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits" });
            }

            // B. DUPLICATE CHECK
            const phoneExists = await Admin.findOne({ phone: cleanPhone, _id: { $ne: adminId } });
            if (phoneExists) {
                return res.status(409).json({ success: false, message: "Phone number already in use" });
            }

            // C. APPLY UPDATE
            admin.phone = cleanPhone;
        }
    }

    // 3. UPDATE MAIL
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

    // 4. UPDATE IMAGE
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

    // 5. SAVE
    await admin.save();

    // 6. RETURN RESPONSE (Filter out passwords)
    const adminData = admin.toObject();
    delete adminData.password;
    delete adminData.password1; // Remove if not using
    delete adminData.password2; // Remove if not using

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

    // Verify against Password 1 (Primary)
    const isMatch = await bcrypt.compare(password, admin.password1);

    if (!isMatch) {
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

    if (!adminId) {
      return res.status(500).json({ success: false, message: "Auth Error: No User ID." });
    }

    const admin = await Admin.findById(adminId).select("+password1 +password2");

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const isMatch1 = await bcrypt.compare(passwordOne, admin.password1);
    if (!isMatch1) return res.status(401).json({ success: false, message: "Primary Password (1) is incorrect" });

    const isMatch2 = await bcrypt.compare(passwordTwo, admin.password2);
    if (!isMatch2) return res.status(401).json({ success: false, message: "Secondary Password (2) is incorrect" });

    res.status(200).json({ success: true, message: "Dual Authentication Successful" });

  } catch (error) {
    console.error("Verify Error:", error);
    res.status(500).json({ success: false, message: "Server Verification Error" });
  }
};

/* ============================
   SYSTEM HEALTH
============================ */
export const systemHealthCheck = async (req, res) => {
  try {
    const startTime = Date.now();
    let dbStatus = 'disconnected';
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      dbStatus = 'connected';
    }
    
    const latency = Date.now() - startTime;

    res.json({
      database: dbStatus,
      latency: latency,
      aiEngine: 'maintenance', 
      telegramBot: 'active' 
    });

  } catch (error) {
    res.status(503).json({ 
      database: 'disconnected', 
      latency: 0 
    });
  }
};

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

/* ============================
   SYSTEM LOGS
============================ */
export const getSystemLogs = async (req, res) => {
  try {
    const logs = await SystemLog.find()
      .sort({ timestamp: -1 })
      .limit(20);

    const formattedLogs = logs.map(log => ({
      time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: log.message,
      type: log.type
    }));

    res.json(formattedLogs);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================
   PROMOTE STUDENTS
============================ */
export const promoteStudents = async (req, res) => {
  const { targetYear } = req.body; 

  // Validate Input
  if (![1, 2, 3, 4].includes(targetYear)) {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid year selected." 
    });
  }

  try {
    let result;
    let message = "";

    // SCENARIO A: GRADUATING FINAL YEARS
    if (targetYear === 4) {
      result = await Student.updateMany(
        { year: 4, isGraduated: false }, 
        { 
          $set: { 
            year: 5, // Alumni
            isGraduated: true 
          } 
        }
      );
      message = `Graduated ${result.modifiedCount} Final Year students.`;
    } 
    
    // SCENARIO B: REGULAR PROMOTION
    else {
      result = await Student.updateMany(
        { year: targetYear, isGraduated: false },
        { 
          $inc: { year: 1 } // Using $inc is safer than $set: targetYear+1
        }
      );
      message = `Promoted ${result.modifiedCount} students from Year ${targetYear} to ${targetYear + 1}.`;
    }

    // Log Action
    await logActivity(req, `Batch Promotion: ${message}`, "UPDATE");

    res.json({
      success: true,
      message: message,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("Promotion Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};