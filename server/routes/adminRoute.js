import express from "express";
import {
  loginAdmin,
  isAdminAuth,
  logoutAdmin,
  updateAdminProfile,
  verifyAdminPassword,
  getDashboardStats,
  verifyAdminPasswords,
  promoteStudents,
  getSystemHealth,
  getFacultyCount,
  getStudentStats,
  getComprehensiveAnalytics,
  getExportData
} from "../controllers/adminController.js";
import authAdmin  from "../middlewares/authAdmin.js";
import { authRateLimiter } from "../middlewares/rateLimiter.js";
import  {upload}  from "../configs/multer.js";
import { getFacultyClasses } from "../controllers/facultyController.js";


const adminRouter = express.Router();

adminRouter.post("/login", authRateLimiter, loginAdmin);
adminRouter.get("/is-auth", authAdmin, isAdminAuth);
adminRouter.post("/logout", authAdmin, logoutAdmin);
adminRouter.put("/update",authAdmin,upload.single("image"),updateAdminProfile);
adminRouter.post("/verify-password", authAdmin, verifyAdminPassword);
adminRouter.post("/verify-passwords", authAdmin, verifyAdminPasswords);
adminRouter.put("/promote-batch", authAdmin, promoteStudents);
adminRouter.get('/stats',authAdmin, getDashboardStats);
adminRouter.get('/health',authAdmin,getSystemHealth);
adminRouter.get('/count',authAdmin, getFacultyCount);
adminRouter.get('/student-stats',authAdmin, getStudentStats);
adminRouter.get('/analytics/comprehensive', authAdmin, getComprehensiveAnalytics);
adminRouter.get('/export-attendance', authAdmin, getExportData);

export default adminRouter;