import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['Info', 'Warning', 'Success'], default: 'Info' },
  
  // ✅ NEW: Added sender details
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'sender.role' },
    role: { type: String, enum: ['Student', 'Faculty', 'Admin'], required: true },
    name: { type: String } // Optional: Cache name for faster display
  },

  recipient: {
    userId: { type: String, required: true }, 
    role: { type: String, required: true }    
  },

  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  actionLink: { type: String },
  metadata: { type: Object }
}, { timestamps: true });

notificationSchema.index({ 'recipient.userId': 1, isRead: 1 });
notificationSchema.index({ 'sender.id': 1 }); // Index for fast "Sent" history retrieval

export default mongoose.model('Notification', notificationSchema);