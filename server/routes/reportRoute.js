import express from 'express';
import { 
  createReport, 
  getAdminReports, 
  getFacultyReports, 
  getSystemReports,
  deleteReportById,
  deleteAdminReports,
  deleteFacultyReports,
  getReports
} from '../controllers/reportController.js';
import {upload} from "../configs/multer.js"
const reportRouter = express.Router();

reportRouter.post('/create', upload.single('file'), createReport);

// Get Reports
reportRouter.get('/all', getReports);
reportRouter.get('/admin', getAdminReports);
reportRouter.get('/faculty', getFacultyReports);
reportRouter.get('/system', getSystemReports);

// Delete Reports
reportRouter.delete('/admin', deleteAdminReports);
reportRouter.delete('/faculty', deleteFacultyReports);
reportRouter.delete('/:id', deleteReportById);

export default reportRouter;