import express from "express";
import {
  loginStudent,
  isStudentAuth,
  logoutStudent,
  getStudentProfile,
  addStudent,
  getStudentByRoll,
  updateStudentByRoll,
  deleteStudentByRoll,
  searchStudents,
  getStudentDashboard,
  getStudentHomeData,
  getAttendanceHistory,
  getStudentFullSchedule,
  updateStudentPassword,
  updateStudentSettings,
  getSettings,
  updateProfile,
  updatePassword,
  syncAllStudentsToNeural,
  getNeuralStatus

} from "../controllers/studentController.js";

import { studentAuth } from "../middlewares/authStudent.js";
import {facultyAuth} from '../middlewares/authFaculty.js'
import authAdmin from "../middlewares/authAdmin.js";
import { upload } from "../configs/multer.js";

const studentRouter = express.Router();

/* ================= PUBLIC ROUTES ================= */
studentRouter.post("/login", loginStudent);

/* ================= STUDENT PRIVATE ROUTES ================= */
studentRouter.get("/is-auth", studentAuth, isStudentAuth);
studentRouter.post("/logout", studentAuth, logoutStudent);
studentRouter.get("/profile", studentAuth, getStudentProfile);

// 🔥 NEW: Attendance & Dashboard Routes
studentRouter.get("/dashboard", studentAuth, getStudentDashboard);
studentRouter.get("/home-data", studentAuth, getStudentHomeData);
studentRouter.get("/history", studentAuth, getAttendanceHistory);
studentRouter.get("/full-schedule", studentAuth, getStudentFullSchedule);
studentRouter.put("/update-password", studentAuth, updateStudentPassword);
studentRouter.put("/settings", studentAuth, updateStudentSettings);
studentRouter.get("/settings", studentAuth, getSettings);
studentRouter.put("/settings/profile", studentAuth, updateProfile);
studentRouter.put("/settings/security", studentAuth, updatePassword);
/* ================= ADMIN ONLY ROUTES ================= */
studentRouter.post("/add", authAdmin, upload.single("image"), addStudent);
studentRouter.get("/by-roll/:rollno", authAdmin, getStudentByRoll);
studentRouter.put("/update/:rollno", authAdmin, upload.single("image"), updateStudentByRoll);
studentRouter.delete("/delete/:id", authAdmin, deleteStudentByRoll);
studentRouter.get("/search", authAdmin, searchStudents);
studentRouter.get('/faculty-search', facultyAuth, searchStudents);
studentRouter.post('/sync-neural', authAdmin, syncAllStudentsToNeural);
studentRouter.get('/neural-status', authAdmin, getNeuralStatus);

export default studentRouter;