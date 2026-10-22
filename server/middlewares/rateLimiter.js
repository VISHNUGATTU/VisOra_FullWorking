/**
 * VisOra Enterprise In-Memory Rate Limiter
 * Protects authentication endpoints from credential stuffing, brute force, and DoS attacks.
 */

class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxAttempts = 15, message = "Too many requests. Please try again later.") {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    this.message = message;
    this.requests = new Map();

    // Periodic cleanup of expired records every 5 minutes to prevent memory leak
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  getClientKey(req) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "unknown-ip";
    return `${ip}:${req.baseUrl || ""}${req.path || ""}`;
  }

  middleware() {
    return (req, res, next) => {
      const now = Date.now();
      const key = this.getClientKey(req);

      let record = this.requests.get(key);

      if (!record || now - record.startTime > this.windowMs) {
        record = { count: 1, startTime: now };
        this.requests.set(key, record);
        return next();
      }

      record.count += 1;

      if (record.count > this.maxAttempts) {
        const retryAfterSeconds = Math.ceil((record.startTime + this.windowMs - now) / 1000);
        res.setHeader("Retry-After", retryAfterSeconds);
        return res.status(429).json({
          success: false,
          error: "RateLimitExceeded",
          message: this.message,
          retryAfterSeconds,
        });
      }

      next();
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now - record.startTime > this.windowMs) {
        this.requests.delete(key);
      }
    }
  }
}

// 1. Auth Rate Limiter: 10 attempts per 15 minutes for login endpoints
export const authRateLimiter = new RateLimiter(
  15 * 60 * 1000,
  10,
  "Too many failed login attempts from this IP. Please wait 15 minutes before trying again."
).middleware();

// 2. Sensitive Action Rate Limiter: 30 requests per minute
export const sensitiveActionLimiter = new RateLimiter(
  60 * 1000,
  30,
  "Rate limit exceeded for sensitive operations. Please slow down."
).middleware();

export default authRateLimiter;
