import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    facultyId: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String, // Cloudinary URL / filename
      default: "",
    },
    mail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    designation: {
      type: String,
      required: true,
    },
    phno: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Encrypt password automatically
facultySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const Faculty= mongoose.model("Faculty", facultySchema);
export default Faculty;