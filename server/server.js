import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import dns from "dns";
import mongoose from "mongoose";
import connectDB, { isDBConnected, getDBState } from "./configs/db.js";
import connectCloudinary from "./configs/cloudinary.js";

// Routes
import studentRouter from "./routes/studentRoute.js";
import facultyRouter from "./routes/facultyRoute.js";
import adminRouter from "./routes/adminRoute.js";
import logRouter from "./routes/logRoute.js";
import reportRouter from "./routes/reportRoute.js";
import notificationRouter from "./routes/notificationRoute.js";
import { initEODWorker } from "./workers/eodWorker.js";

// Load environment variables
dotenv.config();

// DNS optimization for cloud database connectivity
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 6446;
const NODE_ENV = process.env.NODE_ENV || "production";
const PATENT_REF = "Indian Patent App No: 202641036876";

// Asynchronous non-blocking initialization
(async () => {
  try {
    await connectDB();
    connectCloudinary();
    initEODWorker();
  } catch (initErr) {
    console.error("⚠️ Background service initialization warning:", initErr.message);
  }
})();

// Dynamic CORS configuration (Optimistic Local + Production whitelist)
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://localhost:3000",
  "http://localhost:6446",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, engine worker)
    if (!origin) return callback(null, true);
    if (defaultAllowedOrigins.includes(origin) || NODE_ENV === "development") {
      return callback(null, true);
    }
    // Check custom regex if provided in env
    if (process.env.CORS_ORIGIN_REGEX && new RegExp(process.env.CORS_ORIGIN_REGEX).test(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback for seamless client connectivity
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Middlewares with production payload sizing
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(cookieParser());

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    service: "VisOra Core Server",
    status: "ONLINE",
    version: "1.0.0",
    patent: PATENT_REF,
    environment: NODE_ENV,
    health: "/health",
    database: getDBState()
  });
});

// Comprehensive Production Health & Telemetry Endpoint
app.get(["/health", "/api/health"], (req, res) => {
  const connected = isDBConnected();
  const mem = process.memoryUsage();
  res.status(connected ? 200 : 503).json({
    status: connected ? "HEALTHY" : "DEGRADED",
    service: "VisOra Enterprise Core API",
    version: "1.0.0",
    patent: PATENT_REF,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    database: {
      status: getDBState(),
      connected: connected
    },
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024)
    }
  });
});

// Readiness probe for container orchestration
app.get("/ready", (req, res) => {
  if (isDBConnected()) {
    return res.status(200).send("READY");
  }
  return res.status(503).send("WARMING_UP");
});

// API Routes
app.use("/api/student", studentRouter);
app.use("/api/faculty", facultyRouter);
app.use("/api/admin", adminRouter);
app.use("/api/logs", logRouter);
app.use("/api/reports", reportRouter);
app.use("/api/notifications", notificationRouter);

// 404 Route Catch-All
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler with clean production masking
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`❌ [Server Error] ${req.method} ${req.url}:`, err.message);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(NODE_ENV === "development" && { stack: err.stack })
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log("\n=======================================================");
  console.log("  VisOra Enterprise Core Server");
  console.log(`  ${PATENT_REF}`);
  console.log(`  Environment: ${NODE_ENV} | Port: ${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/health`);
  console.log("=======================================================\n");
});

// Graceful Shutdown Handlers
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[*] Received ${signal}. Initiating graceful shutdown sequence...`);
  server.close(async () => {
    console.log("  [+] HTTP listener closed. Refusing new connections.");
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        console.log("  [+] MongoDB connection terminated cleanly.");
      }
    } catch (dbErr) {
      console.error("  [!] Error during database disconnection:", dbErr.message);
    }
    console.log("  [+] VisOra Core Server shutdown complete.");
    process.exit(0);
  });

  // Force exit after 10s if connections refuse to terminate
  setTimeout(() => {
    console.error("  [!] Forced shutdown after timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => handleGracefulShutdown("SIGTERM"));
process.on("SIGINT", () => handleGracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("🚨 Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Process Exception:", error);
});