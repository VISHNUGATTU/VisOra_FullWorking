import jwt from "jsonwebtoken";
import Faculty from "../models/Faculty.js";

export const facultyAuth = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not Authorized. Login Again" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify Role
    if (decoded.role !== "FACULTY") {
      return res.status(403).json({ success: false, message: "Access Denied: Faculty Only" });
    }

    // 🔥 OPTIMIZATION: Use .select("-password") to ensure security
    const faculty = await Faculty.findById(decoded.id).select("-password").lean();
    
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty account not found" });
    }

    // Attach to request for use in subsequent controllers
    req.userId = faculty._id.toString(); 
    req.faculty = faculty;

    // 🔥 LOGIC: Cleaned up path check for 'is-auth'
    if (req.path === "/is-auth" || req.path.endsWith("/is-auth")) {
      return res.json({ success: true, faculty });
    }

    next();
  } catch (error) {
    console.error("Auth Error:", error);
    // Only clear cookie if the error is actually a token failure
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
        res.clearCookie("token");
    }
    return res.status(401).json({ success: false, message: "Session expired. Please login." });
  }
};