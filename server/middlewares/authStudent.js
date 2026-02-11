import jwt from "jsonwebtoken";
import Student from "../models/Student.js";

export const studentAuth = async (req, res, next) => {
  try {
    const { token } = req.cookies; // Clean destructuring

    if (!token) {
      // 🚩 CHANGE: Use 401 status so Axios 'catch' block triggers
      return res.status(401).json({ success: false, message: "Not authorized. Please login." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "STUDENT") {
      return res.status(403).json({ success: false, message: "Access Denied: Students only" });
    }

    // 🔥 REDUNDANCY FIX: Use .select("-password") and .lean()
    // This makes the query much faster and safer
    const student = await Student.findById(decoded.id).select("-password").lean();
    
    if (!student) {
      return res.status(404).json({ success: false, message: "Student account not found" });
    }

    // Attach to request
    req.userId = student._id.toString(); 
    req.student = student; // Attach full student object (No need to fetch again in Profile)

    // 🔥 CONSISTENCY: Same path logic as FacultyAuth
    if (req.path === "/is-auth" || req.path.endsWith("/is-auth")) {
      return res.json({ success: true, student });
    }

    next();
  } catch (error) {
    console.error("Student Auth Error:", error.message);
    // Clear cookie if token is corrupted/expired
    res.clearCookie("token");
    return res.status(401).json({ success: false, message: "Session expired" });
  }
};