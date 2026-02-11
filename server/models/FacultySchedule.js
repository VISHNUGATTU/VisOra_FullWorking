import mongoose from "mongoose";

// 1. The Sub-document (Array Item)
const slotSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  periodIndex: { type: Number, required: true },

  branch: { type: String, required: true, uppercase: true, trim: true },
  year: { type: Number, required: true, min: 1, max: 4 },
  section: { type: String, required: true, uppercase: true },
  subject: { type: String, required: true },
  room: { type: String, required: true },
  
  type: { 
    type: String, 
    enum: ['Lecture', 'Lab', 'Leisure'], 
    default: 'Lecture' 
  },
  
  batch: { type: Number, enum: [1, 2], default: null }
},{id: true});

// 2. The Main Schedule Schema
const facultyScheduleSchema = new mongoose.Schema({
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true,
    unique: true // ✅ This automatically creates the index { faculty: 1 }
  },

  semester: { type: String, default: "2024-ODD" },
  isActive: { type: Boolean, default: true },

  timetable: [slotSchema]

}, { timestamps: true });

facultyScheduleSchema.index({ 
  "timetable.branch": 1, 
  "timetable.year": 1, 
  "timetable.section": 1, 
  "timetable.day": 1 
});

const FacultySchedule = mongoose.model("FacultySchedule", facultyScheduleSchema);
export default FacultySchedule;