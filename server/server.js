import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./configs/db.js";
import connectCloudinary from "./configs/cloudinary.js";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
// Routes
import studentRouter from "./routes/studentRoute.js";
import facultyRouter from "./routes/facultyRoute.js";
import adminRouter from "./routes/adminRoute.js";
import logRouter from "./routes/logRoute.js";
import reportRouter from "./routes/reportRoute.js"
import notificationRouter from "./routes/notificationRoute.js"

// Load env variables
dotenv.config();

// Init app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect services
await connectDB();
connectCloudinary();

// ✅ Allowed origins (Matched Reference Logic)
const allowedOrigins = [process.env.FRONTEND_URL,"http://localhost:5173"];

// ✅ Middlewares (Matched Reference Logic)
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Test route
app.get("/", (req, res) => {
  res.send("✅ API is working");
});

// Routes
app.use("/api/student", studentRouter);
app.use("/api/faculty", facultyRouter);
app.use("/api/admin", adminRouter);
app.use("/api/logs",logRouter);
app.use("/api/reports",reportRouter);
app.use("/api/notifications",notificationRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});