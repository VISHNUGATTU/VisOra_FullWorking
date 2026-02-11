import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password1: {
      type: String,
      required: true,
    },
    password2: {
      type: String,
      required: true,
    },
    adminId: {
      type: String,
      required: true,
      unique: true,
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
    },
    phone: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);


// 🔐 HASH BOTH PASSWORDS
adminSchema.pre("save", async function (next) {
  if (this.isModified("password1")) {
    this.password1 = await bcrypt.hash(this.password1, 10);
  }
  if (this.isModified("password2")) {
    this.password2 = await bcrypt.hash(this.password2, 10);
  }
  next();
});

export default mongoose.model("Admin", adminSchema);
