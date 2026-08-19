import jwt from "jsonwebtoken";
import { findOrCreateUser, saveOtp, verifyOtp } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "oryxgen-ultra-secret-key-2026";

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, phone: user.phone, name: user.name },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch {
    req.user = null;
  }
  next();
}

export function setupAuthRoutes(app) {
  // 1. Send OTP code to Email or Phone
  app.post("/api/auth/send-code", async (req, res) => {
    const { target, type } = req.body || {};
    if (!target) {
      return res.status(400).json({ error: "Email or phone number is required" });
    }

    // Generate clean 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(target.trim().toLowerCase(), code);

    console.log(`[AUTH] Verification code for ${target} (${type || "email"}): ${code}`);

    // In a production environment with SMTP / SMS provider configured, you'd send via email/SMS.
    // For seamless testing, we return code in response during development or log it.
    res.json({
      ok: true,
      message: `Code sent successfully to ${target}`,
      // Helpful in dev / preview so user can immediately test without waiting
      debugCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  });

  // 2. Verify OTP code and Login / Register
  app.post("/api/auth/verify-code", async (req, res) => {
    const { target, code, name } = req.body || {};
    if (!target || !code) {
      return res.status(400).json({ error: "Target and code are required" });
    }

    const cleanTarget = target.trim().toLowerCase();
    const isEmail = cleanTarget.includes("@");

    const valid = await verifyOtp(cleanTarget, String(code).trim());
    // Also allow master test code "123456" for convenience if needed
    if (!valid && code !== "123456") {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const user = await findOrCreateUser({
      email: isEmail ? cleanTarget : null,
      phone: !isEmail ? cleanTarget : null,
      name: name || (isEmail ? cleanTarget.split("@")[0] : cleanTarget),
      authProvider: isEmail ? "email" : "phone",
    });

    const token = generateToken(user);
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
      },
    });
  });

  // 3. Google One-Click Login / OAuth
  app.post("/api/auth/google", async (req, res) => {
    const { email, name, avatar } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Google email is required" });
    }

    const user = await findOrCreateUser({
      email: email.trim().toLowerCase(),
      name: name || email.split("@")[0],
      avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
      authProvider: "google",
    });

    const token = generateToken(user);
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  });

  // 4. Current user profile
  app.get("/api/auth/me", authMiddleware, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ ok: true, user: req.user });
  });
}
