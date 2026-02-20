import express from 'express';
import { 
  getAdminLogs, 
  getFacultyLogs, 
  getStudentLogs, 
  deleteLogById, 
  deleteAdminLogs, 
  deleteFacultyLogs, 
  deleteStudentLogs,
  createLog 
} from '../controllers/logController.js';
import {facultyAuth} from "../middlewares/authFaculty.js"
const logRouter = express.Router();

logRouter.post('/create', createLog);

// Get Logs
logRouter.get('/admin', getAdminLogs);
logRouter.get('/faculty', facultyAuth, getFacultyLogs);
logRouter.get('/student', getStudentLogs);

// Delete Logs
logRouter.delete('/admin', deleteAdminLogs);
logRouter.delete('/faculty', deleteFacultyLogs);
logRouter.delete('/student', deleteStudentLogs);

// Delete Single Log (Standardized path)
logRouter.delete('/:id', deleteLogById); 

export default logRouter;