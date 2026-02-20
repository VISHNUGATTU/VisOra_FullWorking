import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  actionType: { 
    type: String, 
    required: true, 
    uppercase: true, // e.g., 'LOGIN', 'DELETE_USER', 'PAYMENT_FAILED'
    index: true 
  },
  
  title: { 
    type: String, 
    required: true 
  },
  
  message: { 
    type: String 
  },

  // The "Actor" (Who performed the action)
  actor: {
    userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'actor.role' },
    role: { 
      type: String, 
      required: true,
      enum: ['Admin', 'Faculty', 'Student', 'System'] 
    }, 
    name: String,
    ipAddress: String
  },

  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },

  status: { 
    type: String, 
    enum: ['Success', 'Failed', 'Warning'], 
    default: 'Success' 
  }

}, { timestamps: true });

export default mongoose.model('Log', logSchema);