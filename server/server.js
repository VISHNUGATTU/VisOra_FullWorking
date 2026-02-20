import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import dns from "dns";

import connectDB from "./configs/db.js";
import connectCloudinary from "./configs/cloudinary.js";

// Routes
import studentRouter from "./routes/studentRoute.js";
import facultyRouter from "./routes/facultyRoute.js";
import adminRouter from "./routes/adminRoute.js";
import logRouter from "./routes/logRoute.js";
import reportRouter from "./routes/reportRoute.js";
import notificationRouter from "./routes/notificationRoute.js";

// Load env variables
dotenv.config();

// Fix DNS for MongoDB Atlas (important for Render)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect Database & Cloudinary
await connectDB();
connectCloudinary();

// ✅ Allowed Origins (Local + Production)

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());


// ✅ Test Route
app.get("/", (req, res) => {
  res.send("✅ API is working");
});

// ✅ API Routes
app.use("/api/student", studentRouter);
app.use("/api/faculty", facultyRouter);
app.use("/api/admin", adminRouter);
app.use("/api/logs", logRouter);
app.use("/api/reports", reportRouter);
app.use("/api/notifications", notificationRouter);

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});