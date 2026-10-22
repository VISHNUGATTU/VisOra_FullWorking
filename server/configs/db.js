import mongoose from "mongoose";

let isConnecting = false;

export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getDBState = () => {
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  return states[mongoose.connection.readyState] || "unknown";
};

const connectDB = async (retries = 5, delayMs = 3000) => {
  if (isDBConnected() || isConnecting) return;
  isConnecting = true;

  // Configure listeners once
  if (mongoose.connection.listenerCount("connected") === 0) {
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB Connected Successfully.");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB Connection Error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB Disconnected. Automatic reconnect in progress...");
    });
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        console.warn("⚠️  MONGODB_URI not found in environment. Running with offline fallbacks.");
        isConnecting = false;
        return;
      }

      await mongoose.connect(uri, {
        maxPoolSize: 50,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });
      isConnecting = false;
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`[*] Retrying MongoDB connection in ${delayMs / 1000}s...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error("🚨 MongoDB connection retries exhausted. Running in degraded mode.");
      }
    }
  }
  isConnecting = false;
};

export default connectDB;
