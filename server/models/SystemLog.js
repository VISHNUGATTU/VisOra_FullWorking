import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema({
  message: { type: String, required: true },
  type: { 
    type: String, 
    default: 'info' 
  },
  timestamp: { type: Date, default: Date.now }
});

const SystemLog = mongoose.model("SystemLog", systemLogSchema);

export default SystemLog;