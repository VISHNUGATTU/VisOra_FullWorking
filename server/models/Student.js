import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // ✅ ADDED THIS TO FIX THE ERROR
    username: {
      type: String,
      unique: true, 
      trim: true,
      // We will save 'rollno' into this field automatically
    },
    password: {
      type: String,
      required: true,
    },
    year: {
      type: Number, // Changed from String to Number based on your previous code usage
      required: true,
      enum: [1, 2, 3, 4],
    },
    branch: {
      type: String,
      required: true,
    },
    section: {
      type: String,
      required: true,
      enum: ["A", "B", "C", "D"],
    },
    rollno: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    mail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    phno: {
      type: String,
      required: true,
    },
    isGraduated: {
      type: Boolean,
      default: false,
    },
    attendanceSummary: {
      totalClasses: { type: Number, default: 0 },
      presentClasses: { type: Number, default: 0 },
      percentage: { type: Number, default: 100 },
    },
    attendanceRecord: [
      {
        subject: { type: String }, // e.g., "Java"
        totalClasses: { type: Number, default: 0 },
        presentClasses: { type: Number, default: 0 },
        percentage: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

// Encrypt password before save
studentSchema.pre("save", async function (next) {
  // 1. If username is missing, set it to rollno
  if (!this.username) {
    this.username = this.rollno;
  }

  // 2. Hash Password
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("Student", studentSchema);