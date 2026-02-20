import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    required: true,
    uppercase: true, 
    index: true 
  },
  file: {
    url: { type: String, required: true },      
    publicId: { type: String },                  
    fileName: { type: String, required: true },  
    fileType: { type: String },                  
    size: { type: Number }                       
  },
  sentTo: { 
    type: String, 
    required: true,
    default: 'All' // Determines which role can view this (e.g., 'Admin', 'Faculty', 'All')
  },
  generatedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, refPath: 'generatedBy.role' },
    role: { type: String, required: true }, 
    name: String
  },
  filtersUsed: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Completed'
  }
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);