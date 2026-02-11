import jwt from "jsonwebtoken";

const authAdmin = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    req.userId = decoded.id;   // 🔥 THIS IS WHAT YOU NEED
    next();
  } catch (err) {
    // 🔥 CLEAR THE COOKIE IF TOKEN IS INVALID/EXPIRED
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    });

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

export default authAdmin;
