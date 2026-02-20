import express from 'express';
import { 
  createNotification, 
  getAdminNotifications, 
  getFacultyNotifications, 
  getStudentNotifications, 
  markAsRead, 
  markAllReadByRole,
  deleteNotificationById,
  getNotificationHistory // <-- This handles the "Sent" tab
} from '../controllers/notificationController.js';

import authAdmin from '../middlewares/authAdmin.js'; 
import { facultyAuth } from '../middlewares/authFaculty.js';
import { studentAuth } from '../middlewares/authStudent.js'; // Adjust path if needed

const notificationRouter = express.Router();

// --- ADMIN ROUTES ---
notificationRouter.get('/admin', authAdmin, getAdminNotifications); // Inbox
notificationRouter.get('/admin-history', authAdmin, getNotificationHistory); // Outbox/Sent
notificationRouter.post('/create', authAdmin, createNotification);

// --- FACULTY ROUTES ---
notificationRouter.get('/faculty', facultyAuth, getFacultyNotifications); // Inbox
notificationRouter.get('/faculty/history', facultyAuth, getNotificationHistory); // Outbox/Sent
notificationRouter.post('/faculty/create', facultyAuth, createNotification);

// --- STUDENT ROUTES ---
notificationRouter.get('/student', studentAuth, getStudentNotifications); // Inbox
notificationRouter.get('/student/history', studentAuth, getNotificationHistory); // Outbox/Sent
notificationRouter.post('/student/create', studentAuth, createNotification);

// --- SHARED ACTIONS ---
notificationRouter.put('/read-all', authAdmin, markAllReadByRole); 
notificationRouter.put('/read/:id', authAdmin, markAsRead);
notificationRouter.put('/faculty/read/:id', facultyAuth, markAsRead);
notificationRouter.put('/faculty/read-all', facultyAuth, markAllReadByRole);
notificationRouter.put('/student/read/:id', studentAuth, markAsRead);
notificationRouter.put('/student/read-all', studentAuth, markAllReadByRole);
notificationRouter.delete('/:id', authAdmin, deleteNotificationById);

export default notificationRouter;