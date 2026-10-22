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
  changeFacultyPassword,
  notifyDefaultersEmail,
  markNeuralAttendance,
  getNeuralEngineStatus,
  getAllFacultyList,
  scheduleNeuralTrigger,
  getNeuralScheduledSlots,
  reactivateNeuralSession,
  getSessionPresenceBreakdown,
  getNeuralConsolidatedAttendance,
  sendTelegramAttendanceReport,
  triggerEODFinalization
} from "../controllers/facultyController.js";

import { facultyAuth } from "../middlewares/authFaculty.js";
import {studentAuth} from "../middlewares/authStudent.js"
import  authAdmin  from "../middlewares/authAdmin.js";
import {upload} from "../configs/multer.js";
import { authRateLimiter } from "../middlewares/rateLimiter.js";

const facultyRouter = express.Router();

facultyRouter.post("/login", authRateLimiter, loginFaculty);
facultyRouter.get("/is-auth", facultyAuth, isFacultyAuth);
facultyRouter.post("/logout", facultyAuth, logoutFaculty);
facultyRouter.post("/add",authAdmin,upload.single("image"),addFaculty);
facultyRouter.get("/search",searchFaculty);
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
facultyRouter.get('/all',isFacultyAuth, getAllFacultyList);
facultyRouter.post('/notify-email', facultyAuth, notifyDefaultersEmail);
facultyRouter.post('/auto-attendance', facultyAuth, markNeuralAttendance);
facultyRouter.get('/engine-status', facultyAuth, getNeuralEngineStatus);
facultyRouter.post('/schedule-neural-trigger', facultyAuth, scheduleNeuralTrigger);
facultyRouter.get('/neural-scheduled-slots', facultyAuth, getNeuralScheduledSlots);
facultyRouter.post('/reactivate-session', facultyAuth, reactivateNeuralSession);
facultyRouter.get('/session-presence/:sessionId', facultyAuth, getSessionPresenceBreakdown);
facultyRouter.get('/neural-consolidated-attendance', facultyAuth, getNeuralConsolidatedAttendance);
facultyRouter.post('/send-telegram-report', facultyAuth, sendTelegramAttendanceReport);
facultyRouter.post('/eod-finalize', facultyAuth, triggerEODFinalization);

export default facultyRouter;