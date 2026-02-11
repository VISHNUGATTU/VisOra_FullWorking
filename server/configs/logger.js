export const logActivity = (req, message = "") => {
  // Only log in development
  if (process.env.NODE_ENV === "development") return;

  try {
    const safeLog = {
      message,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      user: req.user?._id || null,
      time: new Date().toISOString(),
    };

    console.log(JSON.stringify(safeLog, null, 2));
  } catch (error) {
    console.error("Logger Error:", error.message);
  }
};
