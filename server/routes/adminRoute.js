import express from "express";
import {
  loginAdmin,
  isAdminAuth,
  logoutAdmin,
  updateAdminProfile,
  verifyAdminPassword,
  systemHealthCheck,
  getDashboardStats,
  getSystemLogs,
  verifyAdminPasswords,
  promoteStudents
} from "../controllers/adminController.js";
import authAdmin  from "../middlewares/authAdmin.js";
import  {upload}  from "../configs/multer.js";


const adminRouter = express.Router();

adminRouter.post("/login", loginAdmin);
adminRouter.get("/is-auth", authAdmin, isAdminAuth);
adminRouter.post("/logout", authAdmin, logoutAdmin);
adminRouter.put("/update",authAdmin,upload.single("image"),updateAdminProfile);
adminRouter.post("/verify-password", authAdmin, verifyAdminPassword);
adminRouter.post("/verify-passwords", authAdmin, verifyAdminPasswords);
adminRouter.put("/promote-batch", authAdmin, promoteStudents);
adminRouter.get('/system/health',authAdmin, systemHealthCheck);
adminRouter.get('/stats',authAdmin, getDashboardStats);
adminRouter.get('/logs',authAdmin, getSystemLogs);


export default adminRouter;