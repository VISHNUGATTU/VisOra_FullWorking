import express from "express";
import {
  loginFaculty,
  isFacultyAuth,
  logoutFaculty,
  addFaculty,
  searchFaculty,
  updateFaculty,
  deleteFacultyById,
  addScheduleSlot,
  getMySchedule,
  deleteSchedule,
  updateFacultyProfile,
  getStudentsBySection,
  markAttendance,
  getSectionAnalytics,
  getAttendanceStatus,
  getFacultyClasses,
  changeFacultyPassword
} from "../controllers/facultyController.js";
import { facultyAuth } from "../middlewares/authFaculty.js";
import  authAdmin  from "../middlewares/authAdmin.js";
import {upload} from "../configs/multer.js";

const facultyRouter = express.Router();

facultyRouter.post("/login", loginFaculty);
facultyRouter.get("/is-auth", facultyAuth, isFacultyAuth);
facultyRouter.post("/logout", facultyAuth, logoutFaculty);
facultyRouter.post("/add",authAdmin,upload.single("image"),addFaculty);
facultyRouter.get("/search", authAdmin, searchFaculty);
facultyRouter.put("/update/:facultyId",authAdmin,upload.single("image"),updateFaculty);
facultyRouter.post('/change-password',facultyAuth,changeFacultyPassword)
facultyRouter.delete("/delete/:facultyId",authAdmin,deleteFacultyById);
facultyRouter.post('/add-schedule', facultyAuth, addScheduleSlot);
facultyRouter.get('/schedule', facultyAuth, getMySchedule);
facultyRouter.delete('/schedule/:id', facultyAuth, deleteSchedule);
facultyRouter.put("/update-profile", facultyAuth,upload.single("image"), updateFacultyProfile);
facultyRouter.get('/students-by-section', facultyAuth, getStudentsBySection);
facultyRouter.post('/mark-attendance', facultyAuth, markAttendance);
facultyRouter.get('/analytics', facultyAuth, getSectionAnalytics);
facultyRouter.get('/attendance-status', facultyAuth, getAttendanceStatus);
facultyRouter.get('/classes', facultyAuth, getFacultyClasses);



export default facultyRouter;