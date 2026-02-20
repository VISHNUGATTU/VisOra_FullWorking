import Report from '../models/Report.js';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

// Helper: Upload Buffer to Cloudinary
const uploadStream = (file) => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = path.basename(file.originalname, ext);

    const stream = cloudinary.uploader.upload_stream(
      { 
        resource_type: 'raw',       
        folder: 'reports',          
        public_id: name + ext,      
        use_filename: true,
        unique_filename: false,     
        format: ext.replace('.', '') 
      }, 
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(file.buffer);
  });
};

export const createReport = async (req, res) => {
  try {
    const { title, type, fileUrl, generatedBy, sentTo } = req.body;
    let fileData = {};

    // ✅ VALIDATION: Define Allowed MIME Types
    const allowedMimeTypes = [
      'application/pdf',                                                          // .pdf
      'application/msword',                                                       // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.ms-excel',                                                 // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'       // .xlsx
    ];

    if (req.file) {
      // ✅ CHECK: Reject if not in allowed list
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid file type. Only PDF, Word, and Excel files are allowed." 
        });
      }

      const result = await uploadStream(req.file);
      
      fileData = {
        url: result.secure_url,
        publicId: result.public_id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        size: result.bytes
      };
    } 
    else if (fileUrl) {
      fileData = { url: fileUrl, fileName: 'External Link', fileType: 'link', size: 0 };
    } 
    else {
      return res.status(400).json({ success: false, message: "File or URL is required." });
    }

    const newReport = await Report.create({
      title,
      type,
      file: fileData,
      // Ensure sentTo is saved correctly from the frontend
      sentTo: sentTo || 'All', 
      generatedBy: generatedBy ? JSON.parse(generatedBy) : { role: 'System', name: 'Auto' },
      status: 'Completed'
    });

    res.status(201).json({ success: true, message: "Report uploaded successfully", data: newReport });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminReports = async (req, res) => {
  try {
    const reports = await Report.find({ 'generatedBy.role': 'Admin' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFacultyReports = async (req, res) => {
  try {
    const reports = await Report.find({ 'generatedBy.role': 'Faculty' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSystemReports = async (req, res) => {
  try {
    const reports = await Report.find({ 'generatedBy.role': 'System' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReportById = async (req, res) => {
  try {
    const { id } = req.params;
    // Read from query (from frontend update) or body (fallback)
    const userId = req.query.userId || req.body.userId; 
    const role = req.query.role || req.body.role;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    const reportOwnerId = report.generatedBy?.userId;

    // SECURITY LOGIC
    const isOwner = reportOwnerId && reportOwnerId.toString() === userId.toString();
    const isAdmin = role === 'admin' || role === 'Admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Access Denied: You can only delete your own reports." 
      });
    }

    // Delete from Cloudinary
    if (report.file && report.file.publicId) {
      await cloudinary.uploader.destroy(report.file.publicId, { resource_type: 'raw' });
    }

    // Delete from MongoDB
    await Report.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- FIX IS HERE: Unified Fetching Logic for Inbox vs Sent ---
export const getReports = async (req, res) => {
  try {
    const { tab, userId, role } = req.query;
    let query = {};

    if (tab === 'sent') {
      // 1. "Sent by Me": Reports where I am the author
      query = { 'generatedBy.userId': userId };
    } else {
      // 2. "Inbox (Received)"
      const formattedRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : '';

      query = {
        'generatedBy.userId': { $ne: userId }, // Don't show me reports I sent
        $or: [
          { sentTo: 'All' },
          { sentTo: formattedRole }, 
          { sentTo: userId } // ✅ NEW: Match if it was sent DIRECTLY to my specific ID!
        ]
      };
    }

    const reports = await Report.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAdminReports = async (req, res) => {
  try {
    const result = await Report.deleteMany({ 'generatedBy.role': 'Admin' });
    res.status(200).json({ success: true, message: `Deleted ${result.deletedCount} Admin reports` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFacultyReports = async (req, res) => {
  try {
    const result = await Report.deleteMany({ 'generatedBy.role': 'Faculty' });
    res.status(200).json({ success: true, message: `Deleted ${result.deletedCount} Faculty reports` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};