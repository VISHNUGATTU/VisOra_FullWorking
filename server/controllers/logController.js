import Log from '../models/Log.js';

// --- CREATE LOG ---
export const createLog = async (req, res) => {
  try {
    const { actionType, title, message, actor, metadata, status } = req.body;
    
    // Ensure actor object exists with defaults if not provided
    const safeActor = actor || { role: 'System', name: 'System' };

    const newLog = await Log.create({
      actionType,
      title,
      message,
      actor: safeActor,
      metadata,
      status
    });
    res.status(201).json({ success: true, message: "Log created", data: newLog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminLogs = async (req, res) => {
  try {
    const logs = await Log.find({ 'actor.role': 'Admin' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFacultyLogs = async (req, res) => {
  try {
    const facultyId = req.userId; // Provided by facultyAuth

    // ✅ FIXED: Using 'Log' model to find 'actor.userId'
    const logs = await Log.find({ 
      'actor.userId': facultyId,
      'actor.role': 'Faculty' 
    }).sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: logs.length,
      data: logs 
    });
  } catch (error) {
    console.error("Log Retrieval Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentLogs = async (req, res) => {
  try {
    const logs = await Log.find({ 'actor.role': 'Student' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLogById = async (req, res) => {
  try {
    await Log.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Log deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAdminLogs = async (req, res) => {
  try {
    const result = await Log.deleteMany({ 'actor.role': 'Admin' });
    res.status(200).json({ success: true, message: `Deleted ${result.deletedCount} Admin logs` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFacultyLogs = async (req, res) => {
  try {
    const result = await Log.deleteMany({ 'actor.role': 'Faculty' });
    res.status(200).json({ success: true, message: `Deleted ${result.deletedCount} Faculty logs` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteStudentLogs = async (req, res) => {
  try {
    const result = await Log.deleteMany({ 'actor.role': 'Student' });
    res.status(200).json({ success: true, message: `Deleted ${result.deletedCount} Student logs` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};