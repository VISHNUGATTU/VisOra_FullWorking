import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    // Meta data for searching history easily
    branch: { type: String, required: true },
    year: { type: Number, required: true },
    section: { type: String, required: true },
    subject: { type: String, default: "" },
    type: { type: String, default: "Lecture" },

    // 🔥 SPACE SAVER: We ONLY store students who are Absent.
    absentees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],

    // 📜 VisOra Patent Metadata (Patent App No: 202641036876)
    isConsolidated: { type: Boolean, default: true },
    consolidationMode: { 
      type: String, 
      enum: ['NEURAL_AUTO', 'MANUAL_OVERRIDE', 'EOD_AUTO_COMMIT'], 
      default: 'MANUAL_OVERRIDE' 
    },
    telegramDispatched: { type: Boolean, default: false },
    cryptographicSignature: { type: String, default: "" },
    patentRef: { type: String, default: "202641036876" }
  },
  { timestamps: true }
);

// Prevent duplicate attendance for the same class on the same day
attendanceSchema.index({ scheduleId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);