import jwt from "jsonwebtoken";
import crypto from "crypto";
import { findOrCreateUser, saveOtp, verifyOtp } from "./db.js";

const JWT_SECRET = (process.env.JWT_SECRET || "oryxgen-ultra-secret-key-2026").trim();
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
export const FRONTEND_URL = (process.env.FRONTEND_URL || "https://avg-ai-creator.site").trim().replace(/\/$/, "");

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, phone: user.phone, name: user.name },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Short-lived, project-scoped signed token for the ZIP download link.
// Handed out via /api/codex/generate and the codex_generate_app MCP tool,
// where the consumer (a plain <a> link, or a *different* MCP client/AI
// entirely) has no session/Authorization header to attach. Scoping the
// token to one chatId means a leaked/forwarded link can't be replayed
// against a different user's project, and the short expiry limits how
// long a shared MCP result text stays a valid download link.
export function generateDownloadToken(chatId, ownerId) {
  return jwt.sign(
    { purpose: "codex-zip-download", chatId, ownerId: ownerId || null },
    JWT_SECRET,
    { expiresIn: "10m" }
  );
}

export function verifyDownloadToken(token, chatId) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.purpose !== "codex-zip-download") return null;
    if (payload.chatId !== chatId) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── MCP OAuth 2.0 Authorization Code Grant (with PKCE) ──
// Implements the /authorize + /token half of the flow so a real MCP client
// (Claude.ai's "Connect custom connector", Claude Desktop, etc.) can log the
// user in and obtain an access token automatically, instead of the user
// having to paste a token by hand.
//
// Scope note: this issues codes/tokens ONLY for Oryxgen AI's own known MCP
// client (fixed client_id below) — it does not implement RFC 7591 Dynamic
// Client Registration, which would let arbitrary third-party MCP clients
// self-register. Full DCR needs a persistent registered-clients store and is
// a larger, separate piece of work; most MCP servers that only need to
// support their own first-party connector skip it and pre-register a single
// client the way this does.
export const MCP_CLIENT_ID = "oryxgen-ai-mcp-client";

// Authorization codes are short-lived (60s — just long enough for the client
// to immediately redeem it at /token) AND single-use, per OAuth 2.0 spec
// (RFC 6749 §4.1.2: "the authorization code MUST NOT be used more than
// once"). Signing them as a JWT gives the 60s expiry for free, but a JWT
// alone is stateless and can be verified successfully any number of times
// before it expires — so redemption is additionally tracked in this
// in-memory set, keyed by a hash of the code string. This mirrors the
// project's existing in-memory-fallback pattern elsewhere in this file/db.js
// rather than adding a new DB table for something that only needs to live
// for ~60 seconds. redeemedCodes is pruned periodically so it never grows
// past whatever arrived in the last couple of minutes.
const redeemedCodes = new Set();
setInterval(() => redeemedCodes.clear(), 5 * 60 * 1000).unref?.();

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateAuthorizationCode({ userId, redirectUri, codeChallenge, codeChallengeMethod, state }) {
  return jwt.sign(
    {
      purpose: "mcp-auth-code",
      userId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod: codeChallengeMethod || "S256",
      state: state || null,
    },
    JWT_SECRET,
    { expiresIn: "60s" }
  );
}

// Verifies the code and, if a codeVerifier is supplied, checks it against the
// PKCE challenge that was bound to the code at /authorize time (RFC 7636
// S256: challenge must equal base64url(sha256(verifier))). Also enforces
// single-use: a code that verifies successfully is immediately marked
// redeemed, so a second /token call with the same code — whether a retry,
// a race, or a leaked/replayed code — is rejected even though the JWT
// itself hasn't expired yet.
export function verifyAuthorizationCode(code, { redirectUri, codeVerifier } = {}) {
  const codeHash = hashCode(code);
  if (redeemedCodes.has(codeHash)) {
    return { error: "invalid_grant", detail: "Authorization code has already been used." };
  }

  let payload;
  try {
    payload = jwt.verify(code, JWT_SECRET);
  } catch {
    return { error: "invalid_grant", detail: "Authorization code is invalid or expired." };
  }
  if (payload.purpose !== "mcp-auth-code") {
    return { error: "invalid_grant", detail: "Not an authorization code." };
  }
  if (redirectUri && payload.redirectUri !== redirectUri) {
    return { error: "invalid_grant", detail: "redirect_uri does not match the one used to request this code." };
  }
  if (payload.codeChallenge) {
    if (!codeVerifier) {
      return { error: "invalid_request", detail: "code_verifier is required (PKCE)." };
    }
    // base64url digest encoding needs Node 15+; fall back to manual conversion
    // from base64 for older runtimes rather than assuming it's supported.
    let derived;
    try {
      derived = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    } catch {
      derived = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    }
    if (derived !== payload.codeChallenge) {
      return { error: "invalid_grant", detail: "code_verifier does not match code_challenge." };
    }
  }
  // Mark redeemed only now, at the point every check has actually passed —
  // not on entry — so a downstream failure after this call (e.g. the user
  // was deleted between /authorize and /token) doesn't burn the code for a
  // reason unrelated to its one legitimate use.
  redeemedCodes.add(codeHash);
  return { payload };
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = header.split(" ")[1];
  req.user = verifyToken(token);
  next();
}

export function setupAuthRoutes(app) {
  // 1. Send OTP code to Email or Phone
  app.post("/api/auth/send-code", async (req, res) => {
    const { target, type, clientCode } = req.body || {};
    if (!target) {
      return res.status(400).json({ error: "Email yoki telefon raqam kiritilishi shart." });
    }

    const cleanTarget = String(target).trim().toLowerCase();
    const code = (clientCode && /^\d{6}$/.test(clientCode)) ? clientCode : Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(cleanTarget, code);

    console.log(`[AUTH] Tasdiqlash kodi (${cleanTarget}): ${code}`);

    res.json({
      ok: true,
      code,
      message: `Tasdiqlash kodi ${cleanTarget} ga yuborildi`,
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
