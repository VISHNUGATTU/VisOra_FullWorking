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

    // 🔥 SPACE SAVER: We ONLY store students who are Absent.
    absentees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
  },
  { timestamps: true }
);

// Prevent duplicate attendance for the same class on the same day
attendanceSchema.index({ scheduleId: 1, date: 1 }, { unique: true });

export default mongoose.model("Attendance", attendanceSchema);