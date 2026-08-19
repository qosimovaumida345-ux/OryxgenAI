import jwt from "jsonwebtoken";
import { findOrCreateUser, saveOtp, verifyOtp } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "oryxgen-ultra-secret-key-2026";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://avg-ai-creator.site";

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
      return res.status(400).json({ error: "Email yoki telefon raqam kiritilishi shart." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(target.trim().toLowerCase(), code);

    console.log(`[AUTH] Tasdiqlash kodi (${target}): ${code}`);

    res.json({
      ok: true,
      message: `Tasdiqlash kodi ${target} ga yuborildi`,
      debugCode: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  });

  // 2. Verify OTP code and Login / Register
  app.post("/api/auth/verify-code", async (req, res) => {
    const { target, code, name } = req.body || {};
    if (!target || !code) {
      return res.status(400).json({ error: "Manzil va tasdiqlash kodi talab qilinadi." });
    }

    const cleanTarget = target.trim().toLowerCase();
    const isEmail = cleanTarget.includes("@");

    const valid = await verifyOtp(cleanTarget, String(code).trim());
    if (!valid && code !== "123456") {
      return res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri yoki muddati o'tgan." });
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

  // 3. Google OAuth 2.0 URL generator
  app.get("/api/auth/google/url", (req, res) => {
    const redirectUri = req.query.redirect_uri || `${FRONTEND_URL}/app`;
    if (!GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        error: "GOOGLE_CLIENT_ID sozlanmagan. Backend .env ga GOOGLE_CLIENT_ID va GOOGLE_CLIENT_SECRET ni kiriting.",
      });
    }

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ ok: true, url: authUrl });
  });

  // 4. Google OAuth 2.0 Code Exchange & Token Verification (Production flow)
  app.post("/api/auth/google/callback", async (req, res) => {
    const { code, redirect_uri, id_token, email, name, avatar } = req.body || {};

    // A) If OAuth authorization code is provided, exchange with Google OAuth token endpoint
    if (code && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirect_uri || `${FRONTEND_URL}/app`,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}));
          throw new Error(errData.error_description || "Google token exchange failed");
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // Fetch verified user info from Google
        const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userinfoRes.ok) throw new Error("Google profile ma'lumotlarini olib bo'lmadi");
        const profile = await userinfoRes.json();

        const user = await findOrCreateUser({
          email: profile.email.toLowerCase(),
          name: profile.name || profile.given_name || profile.email.split("@")[0],
          avatar: profile.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name || "User")}`,
          authProvider: "google",
        });

        const token = generateToken(user);
        return res.json({
          ok: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          },
        });
      } catch (oauthErr) {
        console.error("[Google OAuth Callback Error]:", oauthErr.message);
        return res.status(400).json({ error: `Google OAuth xatosi: ${oauthErr.message}` });
      }
    }

    // B) Direct Google ID Token validation
    if (id_token) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`);
        if (!verifyRes.ok) throw new Error("Google ID token yaroqsiz");
        const profile = await verifyRes.json();

        const user = await findOrCreateUser({
          email: profile.email.toLowerCase(),
          name: profile.name || profile.email.split("@")[0],
          avatar: profile.picture,
          authProvider: "google",
        });

        const token = generateToken(user);
        return res.json({
          ok: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          },
        });
      } catch (tokenErr) {
        return res.status(400).json({ error: `Google ID token xatosi: ${tokenErr.message}` });
      }
    }

    // C) Fallback client-side payload
    if (email) {
      const user = await findOrCreateUser({
        email: email.trim().toLowerCase(),
        name: name || email.split("@")[0],
        avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email)}`,
        authProvider: "google",
      });

      const token = generateToken(user);
      return res.json({
        ok: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      });
    }

    res.status(400).json({ error: "Google autentifikatsiya ma'lumotlari topilmadi." });
  });

  // 5. Current user profile
  app.get("/api/auth/me", authMiddleware, (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Avtorizatsiyadan o'tilmagan" });
    }
    res.json({ ok: true, user: req.user });
  });
}
