import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import JSZip from "jszip";
import path from "path";
import fs from "fs";
import { findModel, PUBLIC_IMAGE_MODELS, PUBLIC_MODELS, CATALOG } from "./catalog.js";
import { pollinationsModel, refreshFreeModels, resolveUpstream, resolveBestCodeModel, getFreePool, getModelMaxTokens } from "./mapper.js";
import {
  initDb,
  getUserChats,
  saveUserChat,
  deleteUserChat,
  findUserById,
  saveApiKey,
  getUserApiKeys,
  deleteApiKey,
  logApiUsage,
  getApiUsageAnalytics,
  saveInstallerChunk,
  clearInstallerChunks,
  getInstallerChunks,
  getInstallerTotalSize,
} from "./db.js";
import {
  authMiddleware,
  setupAuthRoutes,
  verifyToken,
  generateDownloadToken,
  verifyDownloadToken,
  generateAuthorizationCode,
  verifyAuthorizationCode,
  generateToken,
  generateApiKey,
  apiKeyAuthMiddleware,
  MCP_CLIENT_ID,
  FRONTEND_URL,
} from "./auth.js";
import { executeCodexPipeline } from "./codexEngine.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const OR_KEY = process.env.OPENROUTER_API_KEY || "";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const NVIDIA_KEY = process.env.NVIDIA_API_KEY || "";
const NVIDIA_MODEL = "moonshotai/kimi-k3";

// ── SANITIZE KIMI-K3 / MODEL OUTPUT ──
// Strips leaked special tokens (<|close|>, <|im_end|>, etc.) and detects degenerate repetitive garbage
const SPECIAL_TOKEN_RE = /<\|[a-z_]+\|>/gi;
function sanitizeModelOutput(text) {
  if (!text) return "";
  return text.replace(SPECIAL_TOKEN_RE, "").replace(/\s{3,}/g, " ");
}
function isDegenerate(text, window = 60) {
  // Detect repetitive patterns like "5. 5. 5. 5. 5." or "the the the the"
  if (!text || text.length < window) return false;
  const tail = text.slice(-window);
  // Check if more than 60% of the tail is a repeated 2-4 char pattern
  const m = tail.match(/(.{2,4})\1{5,}/);
  return !!m;
}

// ── GROQ LPU MODEL RESOLVER ──
export function resolveGroqModel(requestedModel = "", hasImages = false) {
  if (hasImages) {
    return "qwen/qwen3.8-27b"; // Multimodal text + image vision
  }
  const lower = (requestedModel || "").toLowerCase();
  if (lower.includes("qwen") || lower.includes("vision")) {
    return "qwen/qwen3.8-27b";
  }
  if (lower.includes("20b") || lower.includes("fast") || lower.includes("mini") || lower.includes("flash") || lower.includes("haiku")) {
    return "openai/gpt-oss-20b";
  }
  // Default flagship 120B model for deep reasoning, coding, and general chat!
  return "openai/gpt-oss-120b";
}

// Configure CORS for local development, Render production, and custom domain avg-ai-creator.site
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "https://avg-ai-creator.site",
  "http://avg-ai-creator.site",
  "https://www.avg-ai-creator.site",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, MCP clients)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith(".onrender.com") || origin.includes("avg-ai-creator.site")) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for API/MCP consumption
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// Initialize database schema
initDb();

// Setup Authentication endpoints
setupAuthRoutes(app);

// Root route - Prevents "Cannot GET /" and provides API info
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Oryxgen AI API — Operational</title>
        <style>
          body { background: #000000; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; margin: 0; line-height: 1.6; }
          .container { max-width: 720px; margin: 0 auto; background: #0a0a0a; border: 1px solid #222222; border-radius: 12px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .badge { display: inline-block; background: #1a2e1a; color: #4ade80; border: 1px solid #2e592e; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
          h1 { margin: 0 0 8px 0; font-size: 24px; letter-spacing: -0.02em; }
          p { color: #888888; font-size: 14px; margin-bottom: 24px; }
          .endpoints { background: #121212; border: 1px solid #1e1e1e; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 13px; color: #cccccc; }
          .endpoints div { margin-bottom: 8px; }
          .method { color: #60a5fa; font-weight: bold; }
          .tag { color: #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">● Live & Operational</div>
          <h1>Oryxgen AI Backend Web Service</h1>
          <p>High-performance AI aggregator & Model Context Protocol (MCP) gateway with 200+ intelligent models.</p>
          <div class="endpoints">
            <div><span class="method">GET</span> /health — Service status & metrics</div>
            <div><span class="method">GET</span> /api/models — Catalog of 200+ models</div>
            <div><span class="method">POST</span> /api/chat — Streaming chat with thinking tags</div>
            <div><span class="method">GET</span> /api/image — Free image generation via Pollinations</div>
            <div><span class="method">POST</span> /api/mcp — Model Context Protocol (MCP) JSON-RPC 2.0</div>
            <div><span class="method">GET</span> /api/mcp/sse — MCP Server-Sent Events stream for Claude</div>
          </div>
        </div>
      </body>
    </html>
  `);
});

// 📦 Desktop Installer Database Upload Endpoint
app.delete(["/api/installer/clear", "/api/installer/:filename"], async (req, res) => {
  try {
    const secret = req.headers["x-admin-secret"] || req.query.secret || "";
    if (secret !== "oryxgen-ultra-secret-key-2026" && secret !== process.env.JWT_SECRET) {
      return res.status(403).json({ error: "Ruxsat berilmadi (Admin secret xato)" });
    }
    const filename = String(req.params.filename || req.query.filename || "OryxgenSetup.exe").trim();
    await clearInstallerChunks(filename);
    console.log(`[Installer DB] Cleared old chunks for ${filename}`);
    res.json({ ok: true, message: `${filename} bazadagi eski chunklari tozalandi.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/installer/upload-chunk", express.raw({ type: "*/*", limit: "30mb" }), async (req, res) => {
  try {
    const filename = String(req.query.filename || "OryxgenSetup.exe").trim();
    const chunkIndex = parseInt(req.query.chunk_index, 10);
    const totalChunks = parseInt(req.query.total_chunks, 10);
    const secret = req.headers["x-admin-secret"] || req.query.secret || "";

    if (secret !== "oryxgen-ultra-secret-key-2026" && secret !== process.env.JWT_SECRET) {
      return res.status(403).json({ error: "Ruxsat berilmadi (Admin secret xato)" });
    }

    if (isNaN(chunkIndex) || isNaN(totalChunks) || !req.body || req.body.length === 0) {
      return res.status(400).json({ error: "Noto'g'ri chunk ma'lumotlari." });
    }

    // Auto-clear old chunks when first chunk arrives if requested
    if (chunkIndex === 0 && req.query.clear_first === "true") {
      await clearInstallerChunks(filename);
    }

    await saveInstallerChunk(filename, chunkIndex, totalChunks, req.body, req.body.length);
    console.log(`[Installer DB] Chunk ${chunkIndex + 1}/${totalChunks} saved (${req.body.length} bytes)`);
    res.json({ ok: true, chunkIndex, totalChunks, bytes: req.body.length });
  } catch (err) {
    console.error("[Upload Chunk Error]:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📥 Desktop Installer Download Endpoint (Streams directly from PostgreSQL DB)
app.get(["/download/OryxgenSetup.exe", "/api/download/desktop"], async (req, res) => {
  const filename = "OryxgenSetup.exe";
  try {
    // 1. Try reading directly from PostgreSQL Database
    const stats = await getInstallerTotalSize(filename);
    if (stats && Number(stats.chunks_count) > 0) {
      const chunks = await getInstallerChunks(filename);
      if (chunks && chunks.length > 0) {
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.microsoft.portable-executable");
        if (stats.total_size && Number(stats.total_size) > 0) {
          res.setHeader("Content-Length", stats.total_size);
        }

        for (const chunk of chunks) {
          res.write(chunk.data);
        }
        return res.end();
      }
    }

    // 2. Fallback to local files if present
    const possiblePaths = [
      path.join(process.cwd(), "frontend", "public", "download", filename),
      path.join(process.cwd(), "frontend", "dist", "download", filename),
      path.join(process.cwd(), "desktop", filename),
      path.join(process.cwd(), "..", "desktop", filename),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return res.download(p, filename);
      }
    }

    res.status(404).json({ error: "OryxgenSetup.exe hozircha ma'lumotlar bazasida mavjud emas." });
  } catch (err) {
    console.error("[Download Error]:", err);
    res.status(500).send("Yuklab olishda xatolik yuz berdi: " + err.message);
  }
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Oryxgen AI API",
    status: "operational",
    domain: "avg-ai-creator.site",
    modelsCount: PUBLIC_MODELS.length,
    imageModelsCount: PUBLIC_IMAGE_MODELS.length,
    hasOpenRouterKey: Boolean(OR_KEY),
    hasNvidiaKey: Boolean(NVIDIA_KEY),
    hasGroqKey: Boolean(GROQ_KEY),
    time: new Date().toISOString(),
  });
});

// Models list endpoint
app.get("/api/models", (_req, res) => {
  res.json({
    models: PUBLIC_MODELS,
    imageModels: PUBLIC_IMAGE_MODELS,
  });
});

function clientError(res, status, message) {
  if (res.headersSent) {
    try {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (_) {}
    return;
  }
  res.status(status).json({ error: message });
}

// Fallback streaming generator when no OpenRouter key is configured
async function streamSimulatedResponse(res, meta, userMsg, systemPrompt = "") {
  if (!res.headersSent) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
  }

  // Only emit thinking for designated reasoning/thinking models
  const isThinking = meta.tags?.includes("thinking") && meta.capability === "reason";

  if (isThinking) {
    res.write(`data: ${JSON.stringify({ thinking: `Tahlil qilinmoqda: "${userMsg.slice(0, 45)}..."` })}\n\n`);
    await new Promise((r) => setTimeout(r, 150));
    if (systemPrompt) {
      res.write(`data: ${JSON.stringify({ thinking: `\n- Tizim ko'rsatmasi yuklandi va qoidalar tekshirildi` })}\n\n`);
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  const responseText = `Assalomu alaykum! Men **${meta.displayName}** (${meta.company}) modeliman.\n\nSiz yuborgan so'rov:\n> ${userMsg}\n\n${systemPrompt ? `*Custom System Prompt tatbiq etildi.* \n\n` : ""
    }### Model Xususiyatlari:\n- **Model**: ${meta.displayName}\n- **Ishlab chiquvchi**: ${meta.company}\n- **Qobiliyati**: ${meta.capability.toUpperCase()}\n- **Holati**: Faol & Barqaror\n\nQanday qo'shimcha vazifalarni bajarishimiz kerak?`;

  const words = responseText.split(" ");
  for (let i = 0; i < words.length; i++) {
    const chunk = (i === 0 ? "" : " ") + words[i];
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    await new Promise((r) => setTimeout(r, 25));
  }

  res.write("data: [DONE]\n\n");
  res.end();
}

// Chat completion streaming endpoint
app.post("/api/chat", authMiddleware, async (req, res) => {
  try {
    const { model: displayId, messages, systemPrompt } = req.body || {};
    const meta = findModel(displayId);
    if (!meta || meta.capability === "image") {
      return clientError(res, 400, "Noma'lum yoki noto'g'ri model tanlangan.");
    }
    if (!Array.isArray(messages) || !messages.length) {
      return clientError(res, 400, "Messages ro'yxati kiritilishi shart.");
    }

    // Mandatory Model Identity Persona
    const modelPersona = `You are "${meta.displayName}" created by ${meta.company}. You are running inside Oryxgen AI platform (https://avg-ai-creator.site).
CRITICAL IDENTITY INSTRUCTIONS:
- If the user asks who you are, what model you are, or who created you, you MUST ALWAYS answer: "I am ${meta.displayName} by ${meta.company}, running on Oryxgen AI."
- NEVER reveal, mention, or hint at any underlying infrastructure names such as: Nemotron, Gemma, Qwen, LLaMA, OpenRouter, Pollinations, or any open-source backend model name.
- You are NOT an open-source model. You are ${meta.displayName} by ${meta.company}.
- Maintain this identity strictly and consistently in ALL languages (O'zbek, English, Russian, etc.).`;

    let effectiveSystem = modelPersona;
    if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim()) {
      effectiveSystem += `\n\n[Custom User Instructions]:\n${systemPrompt.trim()}`;
    }

    const safeMessages = [
      { role: "system", content: effectiveSystem },
      ...messages
        .filter((m) => m && (m.role === "user" || m.role === "assistant"))
        .map((m) => {
          if (m.image || Array.isArray(m.content)) {
            if (Array.isArray(m.content)) {
              return { role: m.role, content: m.content };
            }
            const textContent = String(m.content || "");
            const parts = [];
            if (textContent) {
              parts.push({ type: "text", text: textContent });
            }
            if (typeof m.image === "string" && (m.image.startsWith("data:") || m.image.startsWith("http"))) {
              parts.push({
                type: "image_url",
                image_url: { url: m.image },
              });
            }
            return { role: m.role, content: parts.length > 0 ? parts : textContent };
          }
          return { role: m.role, content: String(m.content || "") };
        })
        .slice(-120),
    ];

    const lastUserMsgObj = safeMessages.filter((m) => m.role === "user").pop();
    const lastUserMsg = Array.isArray(lastUserMsgObj?.content)
      ? (lastUserMsgObj.content.find((p) => p.type === "text")?.text || "")
      : (lastUserMsgObj?.content || "");

    const clientMaxTokens = Number(req.body?.max_tokens || req.body?.maxTokens);
    const effectiveMaxTokens = clientMaxTokens && clientMaxTokens > 0 ? clientMaxTokens : 16384;
    const effectiveTemperature = typeof req.body?.temperature === "number" ? req.body.temperature : 0.7;

    if (!OR_KEY && !GROQ_KEY && !NVIDIA_KEY) {
      return streamSimulatedResponse(res, meta, lastUserMsg, systemPrompt);
    }

    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();
    }

    let streamSucceeded = false;

    // ── PRIORITY 1: NVIDIA NIM (2.8T MoE Kimi-K3 Flagship) ──
    // Powers ALL display models with Moonshot Kimi-K3 while strictly preserving the persona
    // Note: Kimi K3 strictly fixes top_p at 0.95 and rejects top_p overrides. Do NOT pass top_p.
    // Max tokens set to 16,384 (NVIDIA NIM official ceiling) to provide generous room for reasoning + answer.
    if (NVIDIA_KEY) {
      try {
        console.log(`[Chat API] Powering "${meta.displayName}" using NVIDIA NIM: ${NVIDIA_MODEL} (2.8T) with max_tokens=${effectiveMaxTokens}`);
        const nvRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NVIDIA_KEY}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: NVIDIA_MODEL,
            messages: safeMessages,
            stream: true,
            temperature: effectiveTemperature,
            max_tokens: effectiveMaxTokens,
          }),
        });

        if (nvRes.ok && nvRes.body) {
          const reader = nvRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let inThinkTag = false;
          let accumulatedContent = "";
          let accumulatedThinking = "";
          let nvAborted = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n");
            buffer = parts.pop() || "";
            for (const line of parts) {
              if (nvAborted) break;
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta;

                let thinkingContent = delta?.reasoning_content || delta?.reasoning || "";
                if (thinkingContent) {
                  thinkingContent = sanitizeModelOutput(thinkingContent);
                  accumulatedThinking += thinkingContent;
                  // Check for degenerate thinking output
                  if (isDegenerate(accumulatedThinking)) {
                    console.warn("[Chat API] NVIDIA NIM Kimi-K3 producing degenerate thinking, aborting");
                    nvAborted = true;
                    try { reader.cancel(); } catch(_) {}
                    break;
                  }
                  if (thinkingContent.trim()) {
                    res.write(`data: ${JSON.stringify({ thinking: thinkingContent })}\n\n`);
                  }
                }

                let text = sanitizeModelOutput(delta?.content || "");
                if (text) {
                  accumulatedContent += text;
                  // Check for degenerate content output
                  if (isDegenerate(accumulatedContent)) {
                    console.warn("[Chat API] NVIDIA NIM Kimi-K3 producing degenerate content, aborting");
                    nvAborted = true;
                    try { reader.cancel(); } catch(_) {}
                    break;
                  }

                  text = text.replace(/<thought>/gi, "<think>").replace(/<\/thought>/gi, "</think>");

                  if (text.includes("<think>")) {
                    inThinkTag = true;
                    const [preThink, postThink] = text.split(/<think>/i);
                    if (preThink) res.write(`data: ${JSON.stringify({ content: preThink })}\n\n`);
                    text = postThink || "";
                  }
                  if (text.includes("</think>")) {
                    inThinkTag = false;
                    const [thinkPart, normalPart] = text.split(/<\/think>/i);
                    if (thinkPart) res.write(`data: ${JSON.stringify({ thinking: thinkPart })}\n\n`);
                    if (normalPart) res.write(`data: ${JSON.stringify({ content: normalPart })}\n\n`);
                    continue;
                  }

                  if (inThinkTag) {
                    res.write(`data: ${JSON.stringify({ thinking: text })}\n\n`);
                  } else {
                    res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
                  }
                }
              } catch {
                /* ignore chunk parse error */
              }
            }
            if (nvAborted) break;
          }

          if (!nvAborted) {
            streamSucceeded = true;
            res.write("data: [DONE]\n\n");
            res.end();
            return;
          } else {
            console.warn("[Chat API] NVIDIA NIM aborted due to degenerate output, falling back to next provider");
          }
        } else {
          const errText = await nvRes.text().catch(() => "");
          console.warn(`[Chat API] NVIDIA NIM Kimi-K3 returned ${nvRes.status}:`, errText);
        }
      } catch (err) {
        console.warn("[Chat API] NVIDIA NIM Kimi-K3 connection error, falling back:", err.message);
      }
    }

    // Level 0: Try Groq LPU (Ultra-Fast 300+ tokens/sec)
    if (GROQ_KEY) {
      const hasImages = safeMessages.some((m) => {
        if (Array.isArray(m.content)) {
          return m.content.some((p) => p.type === "image_url");
        }
        return false;
      });
      const groqModel = resolveGroqModel(displayId, hasImages);
      try {
        console.log(`[Chat API] Trying Groq LPU with model: ${groqModel}`);
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: groqModel,
            messages: safeMessages,
            stream: true,
            temperature: 0.7,
          }),
        });

        if (groqRes.ok && groqRes.body) {
          const reader = groqRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          let inThinkTag = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n");
            buffer = parts.pop() || "";
            for (const line of parts) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              try {
                const json = JSON.parse(payload);
                const delta = json.choices?.[0]?.delta;

                const thinkingContent = delta?.reasoning_content || delta?.reasoning;
                if (thinkingContent) {
                  res.write(`data: ${JSON.stringify({ thinking: thinkingContent })}\n\n`);
                }

                let text = delta?.content || "";
                if (text) {
                  text = text.replace(/<thought>/gi, "<think>").replace(/<\/thought>/gi, "</think>");

                  if (text.includes("<think>")) {
                    inThinkTag = true;
                    const [preThink, postThink] = text.split(/<think>/i);
                    if (preThink) res.write(`data: ${JSON.stringify({ content: preThink })}\n\n`);
                    text = postThink || "";
                  }
                  if (text.includes("</think>")) {
                    inThinkTag = false;
                    const [thinkPart, normalPart] = text.split(/<\/think>/i);
                    if (thinkPart) res.write(`data: ${JSON.stringify({ thinking: thinkPart })}\n\n`);
                    if (normalPart) res.write(`data: ${JSON.stringify({ content: normalPart })}\n\n`);
                    continue;
                  }

                  if (inThinkTag) {
                    res.write(`data: ${JSON.stringify({ thinking: text })}\n\n`);
                  } else {
                    res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
                  }
                }
              } catch {
                /* ignore chunk parse error */
              }
            }
          }

          streamSucceeded = true;
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        } else {
          const errText = await groqRes.text().catch(() => "");
          console.warn(`[Chat API] Groq LPU failed (${groqRes.status}):`, errText);
        }
      } catch (err) {
        console.warn("[Chat API] Groq LPU error, falling back to OpenRouter:", err.message);
      }
    }

    const chain = await resolveUpstream(meta.capability, displayId);

    for (let i = 0; i < chain.length; i++) {
      const upstream = chain[i];
      try {
        const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OR_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://avg-ai-creator.site",
            "X-Title": "Oryxgen AI",
          },
          body: JSON.stringify({
            model: upstream,
            messages: safeMessages,
            stream: true,
          }),
        });

        if (orRes.status === 429 || orRes.status >= 500) {
          continue;
        }
        if (!orRes.ok || !orRes.body) {
          continue;
        }

        const reader = orRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let inThinkTag = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() || "";
          for (const line of parts) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta;

              const thinkingContent = delta?.reasoning_content || delta?.reasoning;
              if (thinkingContent) {
                res.write(`data: ${JSON.stringify({ thinking: thinkingContent })}\n\n`);
              }

              let text = delta?.content || "";
              if (text) {
                // Normalize thought tags to think tags
                text = text.replace(/<thought>/gi, "<think>").replace(/<\/thought>/gi, "</think>");

                if (text.includes("<think>")) {
                  inThinkTag = true;
                  const [preThink, postThink] = text.split(/<think>/i);
                  if (preThink) res.write(`data: ${JSON.stringify({ content: preThink })}\n\n`);
                  text = postThink || "";
                }
                if (text.includes("</think>")) {
                  inThinkTag = false;
                  const [thinkPart, normalPart] = text.split(/<\/think>/i);
                  if (thinkPart) res.write(`data: ${JSON.stringify({ thinking: thinkPart })}\n\n`);
                  if (normalPart) res.write(`data: ${JSON.stringify({ content: normalPart })}\n\n`);
                  continue;
                }

                if (inThinkTag) {
                  res.write(`data: ${JSON.stringify({ thinking: text })}\n\n`);
                } else {
                  res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
                }
              }
            } catch {
              /* ignore chunk parse error */
            }
          }
        }

        streamSucceeded = true;
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      } catch {
        // Continue to fallback
      }
    }

    if (!streamSucceeded) {
      await streamSimulatedResponse(res, meta, lastUserMsg, systemPrompt);
    }
  } catch (fatalErr) {
    console.error("[Chat API Fatal Error]:", fatalErr);
    if (!res.headersSent) {
      clientError(res, 500, "Ichki server xatoligi");
    } else {
      try {
        res.write(`data: ${JSON.stringify({ content: "\n\n*[Serverda vaqtinchalik xatolik yuz berdi. Iltimos qaytadan yuboring]*" })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } catch (_) {}
    }
  }
});

// Image generation endpoint via Pollinations AI
app.get("/api/image", async (req, res) => {
  const prompt = String(req.query.prompt || "").trim();
  if (!prompt) return clientError(res, 400, "Prompt is required.");

  const displayId = String(req.query.model || "flux");
  const width = Number(req.query.width) || 1024;
  const height = Number(req.query.height) || 1024;
  const seed = req.query.seed ? Number(req.query.seed) : Math.floor(Math.random() * 1000000);
  const engine = pollinationsModel(displayId);

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?model=${engine}&width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;

  try {
    const img = await fetch(url, { headers: { Accept: "image/*" } });
    if (!img.ok) return clientError(res, 502, "Could not generate image from provider.");
    const type = img.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await img.arrayBuffer());
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    clientError(res, 502, `Image generation error: ${err.message}`);
  }
});

// User Chat Histories
app.get("/api/chats", authMiddleware, async (req, res) => {
  if (!req.user) return res.json({ chats: [] });
  const chats = await getUserChats(req.user.id);
  res.json({ chats });
});

app.post("/api/chats", authMiddleware, async (req, res) => {
  const { chat } = req.body || {};
  if (!chat || !chat.id) return clientError(res, 400, "Chat object is required.");
  if (req.user) {
    chat.user_id = req.user.id;
  }
  await saveUserChat(chat);
  res.json({ ok: true });
});

app.delete("/api/chats/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!id) return clientError(res, 400, "Chat ID required");
  const userId = req.user ? req.user.id : null;
  await deleteUserChat(id, userId);
  res.json({ ok: true });
});

// ==========================================
// CODEX AUTONOMOUS PIPELINE ENDPOINT (SSE)
// ==========================================
app.post("/api/codex/generate", authMiddleware, async (req, res) => {
  const { prompt, chatId } = req.body || {};
  if (!prompt || !prompt.trim()) {
    return clientError(res, 400, "Prompt kiritilishi shart.");
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (eventData) => {
    res.write(`data: ${JSON.stringify(eventData)}\n\n`);
  };

  try {
    const result = await executeCodexPipeline(prompt, OR_KEY, (event) => {
      sendEvent(event);
    });

    // Persist or update chat session in DB
    const activeId = chatId || `chat-${Date.now()}`;
    const chatObj = {
      id: activeId,
      user_id: req.user ? req.user.id : null,
      title: result.plan?.title || prompt.slice(0, 30),
      model: "CodeX Auto",
      mode: "codex",
      project_files: result.projectFiles,
      messages: [
        { id: `user-${Date.now()}`, role: "user", content: prompt },
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `**${result.plan?.title || "Loyiha"} muvaffaqiyatli yaratildi!**\n\n${result.plan?.summary || ""}\n\nFayllar soni: ${Object.keys(result.projectFiles).length} ta.`,
        },
      ],
    };
    await saveUserChat(chatObj);

    const downloadToken = generateDownloadToken(activeId, req.user ? req.user.id : null);

    sendEvent({
      type: "done",
      chatId: activeId,
      previewUrl: `https://avg-ai-creator.site/preview/${activeId}`,
      zipUrl: `https://avg-ai-creator.site/api/projects/${activeId}/zip?token=${downloadToken}`,
      plan: result.plan,
      projectFiles: result.projectFiles,
    });
  } catch (err) {
    console.error("[CodeX Generation Error]:", err.message);
    sendEvent({ type: "error", message: err.message || "CodeX generatsiyasida xatolik yuz berdi." });
  } finally {
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

// Direct Project ZIP Archive Download Endpoint
// Auth model: this URL is handed out two ways — inline in the browser chat UI
// (a plain <a> link/window navigation, which cannot attach an Authorization
// header) and inside an MCP tool result text, which may be read by a
// completely different AI/client on a different machine with no session at
// all. Neither consumer can do header-based auth, so instead of gating with
// authMiddleware we require a short-lived, chat-scoped signed token
// (see generateDownloadToken in auth.js) appended as ?token=... wherever this
// URL is constructed.
app.get("/api/projects/:id/zip", async (req, res) => {
  const { id } = req.params;
  const { token } = req.query;
  if (!id) return clientError(res, 400, "Project ID required");

  const tokenPayload = verifyDownloadToken(token, id);
  if (!tokenPayload) {
    return clientError(res, 401, "Yuklab olish havolasi yaroqsiz yoki muddati o'tgan. Loyihani qaytadan oching va ZIP tugmasini bosing.");
  }

  try {
    // Look up chat scoped to the token's owner — never an unscoped/global lookup.
    let targetChat = null;
    if (tokenPayload.ownerId) {
      const ownerChats = await getUserChats(tokenPayload.ownerId);
      targetChat = ownerChats.find((c) => c.id === id);
    }
    // Anonymous (logged-out) CodeX sessions have no ownerId — fall back to the
    // in-memory chat store used for those, still matched by the exact chat id
    // the token was scoped to.
    if (!targetChat && global.inMemoryChats) {
      targetChat = global.inMemoryChats.find((c) => c.id === id);
    }

    const files = targetChat?.project_files || targetChat?.projectFiles || {};
    if (Object.keys(files).length === 0) {
      return clientError(res, 404, "Loyiha fayllari topilmadi.");
    }

    const zip = new JSZip();
    Object.entries(files).forEach(([filePath, content]) => {
      zip.file(filePath, content);
    });

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const cleanName = (targetChat.title || "codex-project").replace(/[^a-zA-Z0-9_\-]/g, "_");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${cleanName}.zip"`);
    res.send(zipBuffer);
  } catch (err) {
    clientError(res, 500, `ZIP yaratishda xatolik: ${err.message}`);
  }
});

// ==========================================
// MODEL CONTEXT PROTOCOL (MCP) IMPLEMENTATION
// Compatible with Claude.ai, Claude Desktop, Cursor, and any MCP Client
// ==========================================

const MCP_TOOLS = [
  {
    name: "oryxgen_chat",
    description: "Generate intelligent responses and execute complex AI reasoning using Oryxgen AI aggregated models pool with custom system instructions.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The message or question for the AI model" },
        model: {
          type: "string",
          description: "Frontier model identifier from Oryxgen AI's catalog (see oryxgen_list_models for the full catalog, e.g. 'claude-4.6-sonnet', 'gpt-6-astra', 'deepseek-r2-turbo').",
          default: "gpt-6-astra",
        },
        systemPrompt: { type: "string", description: "Optional custom system instruction or skill behavior" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "oryxgen_generate_image",
    description: "Generate high-resolution creative images using Oryxgen AI Neural Vision Studio (Flux, Midjourney style, Realistic, Anime, 3D).",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Detailed description of the image to generate" },
        model: { type: "string", description: "Engine: 'flux', 'flux-realism', 'flux-anime', 'flux-3d', 'turbo'", default: "flux" },
        width: { type: "number", default: 1024 },
        height: { type: "number", default: 1024 },
      },
      required: ["prompt"],
    },
  },
  {
    name: "oryxgen_list_models",
    description: "List Oryxgen AI's catalog of 200+ frontier AI models, their provider, architecture, and specialized capabilities (chat, reasoning, coding, vision, 3D design).",
    inputSchema: {
      type: "object",
      properties: {
        capability: { type: "string", enum: ["all", "chat", "reason", "code", "vision", "image"], default: "all" },
      },
    },
  },
  {
    name: "codex_generate_app",
    description: "Autonomous Multi-File Project & App Generator (CodeX Engine). Plans, generates, and validates full-stack web apps, Node.js APIs, and Telegram bots. Returns live preview and instant ZIP archive download URL.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "What kind of app, bot, or API to build (e.g. 'Build a React crypto tracking dashboard with TailwindCSS' or 'Telegram currency rate bot in Python aiogram')" },
      },
      required: ["prompt"],
    },
  },
];

const MCP_PROMPTS = [
  {
    name: "skill-creator",
    description: "Meta-prompt to design professional reusable AI skills and system instructions.",
    arguments: [
      { name: "skill_name", description: "Name of the skill to create", required: true },
      { name: "objective", description: "Goal of the skill", required: true },
    ],
  },
  {
    name: "senior-architect",
    description: "System prompt for expert-level full stack architecture and code review.",
    arguments: [],
  },
];

// MCP JSON-RPC Handler
// MCP protocol versions this server understands, most recent first.
// initialize negotiates against what the CLIENT asks for (params.protocolVersion)
// instead of always returning the oldest one — some MCP clients (Claude.ai's
// connector among them) treat a server that ignores their requested version
// as non-compliant and refuse to proceed past initialize.
const SUPPORTED_MCP_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

async function handleMcpJsonRpc(body, user) {
  const { id, method, params } = body || {};

  switch (method) {
    case "initialize": {
      const requested = params?.protocolVersion;
      const negotiatedVersion = SUPPORTED_MCP_PROTOCOL_VERSIONS.includes(requested)
        ? requested
        : SUPPORTED_MCP_PROTOCOL_VERSIONS[0];
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: negotiatedVersion,
          capabilities: {
            tools: { listChanged: true },
            prompts: { listChanged: true },
            resources: { subscribe: true, listChanged: true },
          },
          serverInfo: {
            name: "oryxgen-ai-mcp",
            version: "1.0.0",
          },
        },
      };
    }

    case "notifications/initialized":
      return null;

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { tools: MCP_TOOLS },
      };

    case "tools/call": {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName === "oryxgen_list_models") {
        const filterCap = args.capability || "all";
        const filtered = filterCap === "all" ? PUBLIC_MODELS : PUBLIC_MODELS.filter((m) => m.capability === filterCap);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    total: filtered.length,
                    platform: "Oryxgen AI Multi-Model Intelligence Gateway",
                    models: filtered.map((m) => ({ id: m.id, name: m.displayName, company: m.company, capability: m.capability })),
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === "oryxgen_generate_image") {
        const prompt = args.prompt || "";
        const engine = pollinationsModel(args.model || "flux");
        const w = args.width || 1024;
        const h = args.height || 1024;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=${engine}&width=${w}&height=${h}&seed=${Math.floor(Math.random() * 999999)}&nologo=true`;

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              { type: "text", text: `Image generated successfully: ${imageUrl}` },
              { type: "image", data: imageUrl, mimeType: "image/jpeg" },
            ],
          },
        };
      }

      if (toolName === "oryxgen_chat") {
        const prompt = args.prompt || "";
        const modelId = args.model || "claude-4.6-sonnet";
        const systemPrompt = args.systemPrompt || "";
        const meta = findModel(modelId) || PUBLIC_MODELS[0];

        // Execute OpenRouter call or fallback
        if (OR_KEY) {
          try {
            const chain = await resolveUpstream(meta.capability, modelId);
            const messages = [];
            if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: prompt });

            for (const upstream of chain) {
              const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${OR_KEY}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "https://avg-ai-creator.site",
                  "X-Title": "Oryxgen AI MCP",
                },
                body: JSON.stringify({ model: upstream, messages }),
              });

              if (res.ok) {
                const data = await res.json();
                const reply = data.choices?.[0]?.message?.content || "";
                return {
                  jsonrpc: "2.0",
                  id,
                  result: {
                    content: [{ type: "text", text: reply }],
                  },
                };
              }
            }
          } catch {
            /* proceed to fallback */
          }
        }

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `[${meta.displayName}] javobi: Sizning so'rovingiz qabul qilindi: "${prompt}". MCP integratsiyasi orqali ishga tushirildi.`,
              },
            ],
          },
        };
      }

      if (toolName === "codex_generate_app") {
        const prompt = args.prompt || "";
        if (!user) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32000, message: "Authentication required for CodeX generation. Please log in to Oryxgen AI." },
          };
        }

        if (!OR_KEY) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32000, message: "OpenRouter API Key not configured." },
          };
        }

        try {
          const newChatId = `chat-${Date.now()}`;
          const previewUrl = `https://avg-ai-creator.site/preview/${newChatId}`;
          const zipDownloadToken = generateDownloadToken(newChatId, user.id);
          const zipDownloadUrl = `https://avg-ai-creator.site/api/projects/${newChatId}/zip?token=${zipDownloadToken}`;

          // 1. Dastlabki "Loading" holatini saqlaymiz
          const initialChatObj = {
            id: newChatId,
            user_id: user.id,
            title: prompt.slice(0, 30) + "...",
            model: "CodeX Auto",
            mode: "codex",
            project_files: {
              "App.jsx": "// Dastur kodlari generatsiya qilinmoqda (Taxminan 30-90 soniya)...\n// Iltimos, birozdan so'ng sahifani yangilang yoki jonli ko'rish havolasini oching.",
              "index.html": "<!DOCTYPE html><html><body style='background:#111;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;'><h2>Yaratilmoqda... Qayta yuklang (F5)</h2></body></html>"
            },
            messages: [
              { id: `user-1`, role: "user", content: prompt },
              { id: `assistant-1`, role: "assistant", content: `Loyiha yaratilmoqda... Jarayon orqa fonda davom etyapti.` }
            ]
          };
          await saveUserChat(initialChatObj);

          // 2. Orqa fonda generatsiyani ishga tushiramiz (await qilinmaydi)
          executeCodexPipeline(prompt, OR_KEY).then(async (result) => {
            const finalChatObj = {
              ...initialChatObj,
              title: result.plan?.title || prompt.slice(0, 30),
              project_files: result.projectFiles,
              messages: [
                { id: `user-1`, role: "user", content: prompt },
                { id: `assistant-1`, role: "assistant", content: `**${result.plan?.title || "Loyiha"} muvaffaqiyatli yaratildi!**\n\n${result.plan?.summary || ""}` }
              ]
            };
            await saveUserChat(finalChatObj);
          }).catch(async (e) => {
            console.error("Background CodeX Error:", e);
            const errorChatObj = {
              ...initialChatObj,
              project_files: { "App.jsx": `// Xatolik yuz berdi: ${e.message}` },
              messages: [
                { id: `user-1`, role: "user", content: prompt },
                { id: `assistant-1`, role: "assistant", content: `Xatolik yuz berdi: ${e.message}` }
              ]
            };
            await saveUserChat(errorChatObj);
          });

          // 3. Darhol MCP mijozga javob qaytaramiz (Timeout bo'lmasligi uchun)
          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Loyiha yaratish orqa fonda boshlandi (taxminan 30-90 soniya davom etadi). Hozircha quyidagi havolaga o'tib turishingiz mumkin:\n\n🔗 **Jonli ko'rish (Live Preview):** ${previewUrl}\n📦 **To'liq ZIP (tayyor bo'lgach):** ${zipDownloadUrl}`,
                },
              ],
            },
          };
        } catch (e) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32000, message: "CodeX ishga tushirishda xatolik: " + e.message },
          };
        }
      }

      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` },
      };
    }

    case "prompts/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { prompts: MCP_PROMPTS },
      };

    case "prompts/get": {
      const promptName = params?.name;
      if (promptName === "skill-creator") {
        const skill = params?.arguments?.skill_name || "Custom Skill";
        const obj = params?.arguments?.objective || "Automation";
        return {
          jsonrpc: "2.0",
          id,
          result: {
            description: `Skill template for ${skill}`,
            messages: [
              {
                role: "system",
                content: {
                  type: "text",
                  text: `You are an expert skill architect. Design instructions, trigger conditions, input schema, and step-by-step logic for "${skill}" with objective "${obj}".`,
                },
              },
            ],
          },
        };
      }
      return {
        jsonrpc: "2.0",
        id,
        result: {
          messages: [
            {
              role: "system",
              content: {
                type: "text",
                text: "You are a Senior AI Software Engineer and Systems Architect. Provide concise, clean, production-grade solutions.",
              },
            },
          ],
        },
      };
    }

    case "resources/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          resources: [
            {
              uri: "oryxgen://models/catalog",
              name: "Active Models Catalog",
              description: "Full JSON list of 200+ models available in Oryxgen AI",
              mimeType: "application/json",
            },
          ],
        },
      };

    case "resources/read":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          contents: [
            {
              uri: "oryxgen://models/catalog",
              mimeType: "application/json",
              text: JSON.stringify(PUBLIC_MODELS, null, 2),
            },
          ],
        },
      };

    case "ping":
      return {
        jsonrpc: "2.0",
        id,
        result: {},
      };

    case "resources/templates/list":
      return {
        jsonrpc: "2.0",
        id,
        result: { resourceTemplates: [] },
      };

    case "logging/setLevel":
      return {
        jsonrpc: "2.0",
        id,
        result: {},
      };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not supported: ${method}` },
      };
  }
}

// MCP OPTIONS Preflight Handler
app.options(["/api/mcp", "/mcp", "/api/mcp/sse", "/sse"], (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS, HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, Mcp-Session-Id, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.status(204).end();
});

// Active MCP sessions for Streamable HTTP transport
const mcpSessions = new Map();

function setMcpCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization, Mcp-Session-Id, mcp-session-id");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
}

function requireMcpAuth(req, res, next) {
  const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(" ")[1]);
  if (!token) {
    setWwwAuthenticateHeader(req, res);
    return res.status(401).json({ error: { code: -32000, message: "Authentication required. Please connect via https://avg-ai-creator.site" } });
  }
  const user = verifyToken(token);
  if (!user) {
    setWwwAuthenticateHeader(req, res);
    return res.status(401).json({ error: { code: -32000, message: "Invalid or expired MCP token. Please log in again." } });
  }
  req.user = user;
  next();
}

// ── MCP OAuth 2.0 Authorization Code Grant (with PKCE) ──
// Lets an MCP client (Claude.ai's "Connect custom connector", Claude Desktop,
// etc.) log the user in and obtain an access token automatically instead of
// the user pasting a token by hand into requireMcpAuth's ?token= param.
//
// NOTE — scope: this supports Oryxgen AI's own first-party MCP client only
// (fixed client_id/redirect allowlist below). It does not implement RFC 7591
// Dynamic Client Registration, so an arbitrary third-party MCP client cannot
// self-register here. That's a legitimate, common simplification for a
// server that only needs to support its own connector — but it does mean
// requireMcpAuth's manual-token path above must stay in place as a fallback
// for any MCP client that expects to register itself.
const OAUTH_ALLOWED_REDIRECT_HOSTS = [
  "claude.ai",
  "claude.com",
  "anthropic.com",
  "cursor.sh",
  "cursor.com",
  "vscode.dev",
  "localhost",
  "127.0.0.1",
];

// RFC 7591 Dynamic Client Registration store
const dynamicOAuthClients = new Map();

function isAllowedRedirectUri(redirectUri) {
  if (!redirectUri) return false;
  try {
    const parsed = new URL(redirectUri);
    for (const client of dynamicOAuthClients.values()) {
      if (client.redirect_uris && client.redirect_uris.includes(redirectUri)) {
        return true;
      }
    }
    return OAUTH_ALLOWED_REDIRECT_HOSTS.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

function getRequestBase(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "avg-ai-creator.site";
  return `${proto}://${host}`;
}

// RFC 7591 Dynamic Client Registration endpoint for Claude and other MCP clients
app.post(["/register", "/oauth/register", "/api/register"], express.json(), (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  const body = req.body || {};
  const clientId = `claude-client-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const clientData = {
    client_id: clientId,
    client_name: body.client_name || "Claude MCP Client",
    redirect_uris: body.redirect_uris || [],
    grant_types: body.grant_types || ["authorization_code"],
    response_types: body.response_types || ["code"],
    token_endpoint_auth_method: body.token_endpoint_auth_method || "none",
  };
  dynamicOAuthClients.set(clientId, clientData);
  res.status(201).json(clientData);
});

app.options(["/register", "/oauth/register", "/api/register"], (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.status(204).end();
});

// RFC 9728 Protected Resource Metadata
app.get("/.well-known/oauth-protected-resource", (req, res) => {
  const base = getRequestBase(req);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
  });
});

// Sets WWW-Authenticate on a 401
function setWwwAuthenticateHeader(req, res) {
  const base = getRequestBase(req);
  res.setHeader(
    "WWW-Authenticate",
    `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`
  );
}

// OAuth 2.0 Authorization Server Metadata (RFC 8414 & OpenID Connect)
app.get(["/.well-known/oauth-authorization-server", "/.well-known/openid-configuration"], (req, res) => {
  const base = getRequestBase(req);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

// GET /authorize — the browser is redirected here by the MCP client.
app.get("/authorize", (req, res) => {
  const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query;

  if (response_type !== "code") {
    return res.status(400).json({ error: "unsupported_response_type" });
  }

  const cleanClientId = client_id ? String(client_id).trim() : MCP_CLIENT_ID;
  const allowedClients = [MCP_CLIENT_ID, "oryxgen-ai-mcp-client", "oryxgen-cursor-client", "oryxgen-vscode-client"];

  if (!allowedClients.includes(cleanClientId) && !dynamicOAuthClients.has(cleanClientId) && !cleanClientId.includes("claude")) {
    if (!isAllowedRedirectUri(redirect_uri)) {
      console.log(`[OAUTH] Unknown client_id rejected: "${cleanClientId}"`);
      return res.status(400).json({ error: "unauthorized_client", error_description: "Unknown client_id." });
    }
  }
  if (!redirect_uri || !isAllowedRedirectUri(redirect_uri)) {
    return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri is missing or not allowed." });
  }
  if (!code_challenge) {
    return res.status(400).json({ error: "invalid_request", error_description: "code_challenge (PKCE) is required." });
  }

  const params = new URLSearchParams({
    redirect_uri,
    code_challenge,
    code_challenge_method: code_challenge_method || "S256",
    ...(state ? { state } : {}),
  });
  res.redirect(302, `${FRONTEND_URL}/mcp-connect?${params.toString()}`);
});

// POST /api/mcp/complete-authorize
app.post("/api/mcp/complete-authorize", authMiddleware, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "login_required" });
  }
  const { redirectUri, codeChallenge, codeChallengeMethod, state } = req.body || {};
  if (!redirectUri || !isAllowedRedirectUri(redirectUri)) {
    return res.status(400).json({ error: "invalid_request", error_description: "redirect_uri is missing or not allowed." });
  }
  if (!codeChallenge) {
    return res.status(400).json({ error: "invalid_request", error_description: "codeChallenge is required." });
  }

  const code = generateAuthorizationCode({
    userId: req.user.id,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    state,
  });

  const params = new URLSearchParams({ code, ...(state ? { state } : {}) });
  res.json({ redirectTo: `${redirectUri}?${params.toString()}` });
});

// POST /token — the MCP client exchanges the authorization code (+ PKCE code_verifier) for an access token.
app.post("/token", express.urlencoded({ extended: true }), async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const body = { ...req.query, ...req.body };
  const { grant_type, code, redirect_uri, code_verifier, client_id } = body;

  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  if (!code) {
    return res.status(400).json({ error: "invalid_request", error_description: "code is required." });
  }

  const result = verifyAuthorizationCode(code, { redirectUri: redirect_uri, codeVerifier: code_verifier });
  if (result.error) {
    return res.status(400).json({ error: result.error, error_description: result.detail });
  }

  const { userId } = result.payload;
  const user = await findUserById(userId);
  if (!user) {
    return res.status(400).json({ error: "invalid_grant", error_description: "User no longer exists." });
  }

  const accessToken = generateToken(user);
  res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 30 * 24 * 60 * 60, // matches generateToken's 30d expiry
  });
});

// ── Streamable HTTP Transport (Claude.ai Connectors) ──
// Single endpoint handles POST (JSON-RPC), GET (SSE notifications), DELETE (close session)
app.post(["/api/mcp", "/mcp"], requireMcpAuth, async (req, res) => {
  setMcpCorsHeaders(res);

  // Generate or reuse session ID
  let sessionId = req.headers["mcp-session-id"] || req.query.sessionId;
  if (!sessionId) {
    sessionId = `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
  res.setHeader("Mcp-Session-Id", sessionId);
  mcpSessions.set(sessionId, Date.now());

  const body = req.body;
  const acceptHeader = (req.headers.accept || "").toLowerCase();
  const wantsSSE = acceptHeader.includes("text/event-stream");

  // Handle batch JSON-RPC (array of requests)
  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const result = await handleMcpJsonRpc(item, req.user);
      if (result) results.push(result);
    }
    if (wantsSSE) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.flushHeaders?.();
      for (const r of results) {
        res.write(`event: message\ndata: ${JSON.stringify(r)}\n\n`);
      }
      res.end();
    } else {
      res.json(results);
    }
    return;
  }

  // Single JSON-RPC request
  const result = await handleMcpJsonRpc(body, req.user);

  // Notifications have no response
  if (!result) {
    return res.status(202).end();
  }

  if (wantsSSE) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.flushHeaders?.();
    res.write(`event: message\ndata: ${JSON.stringify(result)}\n\n`);
    res.end();
  } else {
    res.json(result);
  }
});

// GET on Streamable HTTP endpoint: SSE stream for server-initiated notifications
app.get(["/api/mcp", "/mcp"], requireMcpAuth, (req, res) => {
  setMcpCorsHeaders(res);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  let sessionId = req.headers["mcp-session-id"] || req.query.sessionId;
  if (!sessionId) {
    sessionId = `mcp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
  res.setHeader("Mcp-Session-Id", sessionId);
  mcpSessions.set(sessionId, Date.now());
  res.flushHeaders?.();

  // Keep-alive heartbeat
  const interval = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
    mcpSessions.delete(sessionId);
  });
});

// DELETE: Close MCP session
app.delete(["/api/mcp", "/mcp"], (req, res) => {
  setMcpCorsHeaders(res);
  const sessionId = req.headers["mcp-session-id"] || req.query.sessionId;
  if (sessionId) mcpSessions.delete(sessionId);
  res.status(204).end();
});

// ── Legacy SSE Transport (Claude Desktop / Cursor) ──
// Two-endpoint model: GET /sse opens stream, POST to returned endpoint sends messages
app.get(["/api/mcp/sse", "/sse"], (req, res) => {
  setMcpCorsHeaders(res);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sessionId = Math.random().toString(36).substring(2, 15);
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "oryxgen-api.onrender.com";
  const endpointUrl = `${proto}://${host}/api/mcp?sessionId=${sessionId}`;

  res.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);

  const interval = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// =========================================================================
// ── ORYXGEN AI DEVELOPER PLATFORM & API KEY MANAGEMENT ──
// =========================================================================

// 1. List user API keys
app.get("/api/keys", authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Avtorizatsiyadan o'tilmagan" });
  try {
    const keys = await getUserApiKeys(req.user.id);
    res.json({ ok: true, keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Generate new API key
app.post("/api/keys", authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Avtorizatsiyadan o'tilmagan" });
  try {
    const { name } = req.body || {};
    const keyData = generateApiKey("oryx_live_");
    const record = await saveApiKey({
      userId: req.user.id,
      keyHash: keyData.keyHash,
      keyPrefix: keyData.keyPrefix,
      name: name || "Default Key",
    });
    // Return full raw key once so user can copy it
    res.json({
      ok: true,
      key: {
        ...record,
        rawKey: keyData.rawKey,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Revoke API key
app.delete("/api/keys/:id", authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Avtorizatsiyadan o'tilmagan" });
  try {
    await deleteApiKey(req.params.id, req.user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Token analytics for 3D & animated chart dashboard
app.get("/api/keys/analytics", authMiddleware, async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Avtorizatsiyadan o'tilmagan" });
  try {
    const stats = await getApiUsageAnalytics(req.user.id);
    res.json({ ok: true, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// ── OPENAI-COMPATIBLE PUBLIC DEVELOPER GATEWAY (/v1/...) ──
// =========================================================================

// GET /v1/models (Lists 200+ models in standard OpenAI JSON format)
// Also handle /models, /v1/v1/models for clients that set base_url to .../v1
app.get(["/v1/models", "/models", "/v1/v1/models", "/api/v1/models"], (req, res) => {
  const modelsList = CATALOG.map((m) => ({
    id: m.id,
    object: "model",
    created: 1720000000,
    owned_by: m.company || "oryxgen",
    permission: [],
    root: m.id,
    display_name: m.displayName,
    capability: m.capability,
    description: m.description,
    tags: m.tags || [],
  }));

  res.json({
    object: "list",
    data: modelsList,
  });
});

// POST /v1/chat/completions (OpenAI-compatible chat completion & streaming)
// Also handle /chat/completions, /v1/v1/chat/completions for clients that set base_url to .../v1
app.post(["/v1/chat/completions", "/chat/completions", "/v1/v1/chat/completions", "/api/v1/chat/completions"], apiKeyAuthMiddleware, async (req, res) => {
  const startTime = Date.now();
  const {
    model: requestedModel = "gpt-6-astra",
    messages = [],
    temperature = 0.7,
    max_tokens = null,
    stream = false,
  } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: {
        message: "Kamida bitta xabar (messages) yuborilishi shart.",
        type: "invalid_request_error",
        param: "messages",
        code: "missing_messages",
      },
    });
  }

  // Find model metadata in catalog
  const catalogModel = findModel(requestedModel) || {
    id: requestedModel,
    displayName: requestedModel,
    company: "Oryxgen AI",
    capability: "chat",
  };

  // Enforce Oryxgen persona injection so models never reveal raw open-source backend names
  const brandSystemMessage = {
    role: "system",
    content: `You are "${catalogModel.displayName}", an advanced AI model developed by ${catalogModel.company || "Oryxgen AI"} and powered by the Oryxgen AI platform (https://avg-ai-creator.site).
CRITICAL IDENTITY INSTRUCTIONS:
- Whenever asked who you are, what model you are, or who created you, you must declare that you are "${catalogModel.displayName}" developed by ${catalogModel.company || "Oryxgen AI"} on Oryxgen AI.
- NEVER reveal, mention, or hint at any underlying infrastructure names such as: Nemotron, Gemma, Qwen, LLaMA, OpenRouter, Pollinations, or any open-source backend.
- You are NOT an open-source model. You are ${catalogModel.displayName}.
- Provide comprehensive, accurate, high-quality answers and code in any language (English, O'zbek, Russian, etc.).`,
  };

  const finalMessages = [brandSystemMessage, ...messages];

  // Resolve upstream fallback models
  const modelChain = await resolveUpstream(catalogModel.capability || "chat", requestedModel);
  let targetTokens = Number(max_tokens) || Math.max(getModelMaxTokens(modelChain[0] || requestedModel), 16384);

  // If streaming is requested
  if (stream) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let fullGeneratedText = "";
    let streamSuccess = false;

    // ── PRIORITY 1: NVIDIA NIM (2.8T MoE Kimi-K3 Flagship) ──
    if (NVIDIA_KEY) {
      try {
        console.log(`[OpenAI Gateway Stream] Powering "${catalogModel.displayName}" via NVIDIA NIM: ${NVIDIA_MODEL}`);
        const nvRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NVIDIA_KEY}`,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: NVIDIA_MODEL,
            messages: finalMessages,
            temperature,
            max_tokens: targetTokens,
            stream: true,
          }),
        });

        if (nvRes.ok && nvRes.body) {
          const reader = nvRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6);
                if (dataStr === "[DONE]") {
                  res.write("data: [DONE]\n\n");
                } else {
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.model) parsed.model = catalogModel.id;
                    const deltaContent = parsed.choices?.[0]?.delta?.content || "";
                    if (deltaContent) fullGeneratedText += deltaContent;
                    res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                  } catch {
                    res.write(`${trimmed}\n\n`);
                  }
                }
              }
            }
          }
          streamSuccess = true;
          res.end();
          return;
        } else {
          const errText = await nvRes.text().catch(() => "");
          console.warn(`[OpenAI Gateway Stream] NVIDIA NIM failed (${nvRes.status}):`, errText);
        }
      } catch (err) {
        console.warn("[OpenAI Gateway Stream] NVIDIA NIM error, falling back:", err.message);
      }
    }

    // Level 0: Try Groq LPU (Ultra-Fast 300+ tokens/sec)
    if (GROQ_KEY) {
      try {
        const hasImages = finalMessages.some((m) => {
          if (Array.isArray(m.content)) {
            return m.content.some((p) => p.type === "image_url");
          }
          return false;
        });
        const groqModel = resolveGroqModel(requestedModel, hasImages);
        console.log(`[OpenAI Gateway Stream] Trying Groq LPU with model: ${groqModel}`);
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: groqModel,
            messages: finalMessages,
            temperature,
            max_tokens: targetTokens,
            stream: true,
          }),
        });

        if (groqRes.ok && groqRes.body) {
          const reader = groqRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6);
                if (dataStr === "[DONE]") {
                  res.write("data: [DONE]\n\n");
                } else {
                  try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.model) parsed.model = catalogModel.id;
                    const deltaContent = parsed.choices?.[0]?.delta?.content || "";
                    if (deltaContent) fullGeneratedText += deltaContent;
                    res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                  } catch {
                    res.write(`${trimmed}\n\n`);
                  }
                }
              }
            }
          }
          streamSuccess = true;
          res.end();
          return;
        } else {
          const errText = await groqRes.text().catch(() => "");
          console.warn(`[OpenAI Gateway Stream] Groq LPU failed (${groqRes.status}):`, errText);
        }
      } catch (err) {
        console.warn("[OpenAI Gateway Stream] Groq error, falling back to OpenRouter:", err.message);
      }
    }

    // Level 1: Try OpenRouter models (if OR_KEY exists)
    if (OR_KEY) {
      for (const upstreamModel of modelChain.slice(0, 3)) {
        try {
          const upstreamRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OR_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://avg-ai-creator.site",
              "X-Title": "Oryxgen AI Gateway",
            },
            body: JSON.stringify({
              model: upstreamModel,
              messages: finalMessages,
              temperature,
              max_tokens: targetTokens,
              stream: true,
            }),
          });

          if (upstreamRes.ok && upstreamRes.body) {
            const reader = upstreamRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === "[DONE]") {
                    res.write("data: [DONE]\n\n");
                  } else {
                    try {
                      const parsed = JSON.parse(dataStr);
                      // Sanitize: replace upstream model name with Oryxgen catalog ID
                      if (parsed.model) parsed.model = catalogModel.id;
                      const deltaContent = parsed.choices?.[0]?.delta?.content || "";
                      if (deltaContent) fullGeneratedText += deltaContent;
                      res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                    } catch {
                      res.write(`${trimmed}\n\n`);
                    }
                  }
                }
              }
            }

            streamSuccess = true;
            break;
          }
        } catch (e) {
          console.error(`Stream error for model ${upstreamModel}:`, e.message);
        }
      }
    }

    // Level 2: Pollinations OpenAI Stream Fallback (Free & Instant)
    if (!streamSuccess) {
      try {
        const polRes = await fetch("https://text.pollinations.ai/openai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai",
            messages: finalMessages,
            temperature,
            stream: true,
          }),
        });

        if (polRes.ok && polRes.body) {
          const reader = polRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ")) {
                const dataStr = trimmed.slice(6);
                if (dataStr === "[DONE]") {
                  res.write("data: [DONE]\n\n");
                } else {
                  try {
                    const parsed = JSON.parse(dataStr);
                    // Sanitize: replace upstream model name with Oryxgen catalog ID
                    if (parsed.model) parsed.model = catalogModel.id;
                    const deltaContent = parsed.choices?.[0]?.delta?.content || "";
                    if (deltaContent) fullGeneratedText += deltaContent;
                    res.write(`data: ${JSON.stringify(parsed)}\n\n`);
                  } catch {
                    res.write(`${trimmed}\n\n`);
                  }
                }
              }
            }
          }
          streamSuccess = true;
        }
      } catch (e) {
        console.error("Pollinations stream fallback error:", e.message);
      }
    }

    // Level 3: Real AI dynamic fetch fallback (if stream endpoints failed)
    if (!streamSuccess) {
      try {
        const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "Salom";
        const polTextRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(lastUserMsg)}?system=${encodeURIComponent(`You are ${catalogModel.displayName} on Oryxgen AI.`)}`);
        const realAiText = await polTextRes.text();

        if (realAiText && realAiText.trim()) {
          fullGeneratedText = realAiText;
          const chunks = realAiText.split(" ");
          for (let i = 0; i < chunks.length; i++) {
            const chunkWord = (i === 0 ? "" : " ") + chunks[i];
            const payload = {
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: catalogModel.id,
              choices: [
                {
                  index: 0,
                  delta: { content: chunkWord },
                  finish_reason: i === chunks.length - 1 ? "stop" : null,
                },
              ],
            };
            res.write(`data: ${JSON.stringify(payload)}\n\n`);
            await new Promise((r) => setTimeout(r, 20));
          }
          res.write("data: [DONE]\n\n");
          streamSuccess = true;
        }
      } catch (err) {
        console.error("Real AI fallback error:", err.message);
        res.write(`data: {"error": "${err.message}"}\n\n`);
      }
    }

    res.end();

    // Estimate tokens and log usage
    const inTokens = Math.ceil(JSON.stringify(messages).length / 4);
    const outTokens = Math.ceil((fullGeneratedText || "").length / 4);
    const durationMs = Date.now() - startTime;
    await logApiUsage({
      keyPrefix: req.apiKey.key_prefix,
      userId: req.user.id,
      model: catalogModel.displayName,
      inputTokens: inTokens,
      outputTokens: outTokens,
      durationMs,
    });
    return;
  }

  // Non-streaming completion
  let completionContent = "";
  let lastErr = null;

  // ── PRIORITY 1: NVIDIA NIM (2.8T MoE Kimi-K3 Flagship) ──
  if (NVIDIA_KEY) {
    try {
      console.log(`[OpenAI Gateway Sync] Powering "${catalogModel.displayName}" via NVIDIA NIM: ${NVIDIA_MODEL}`);
      const nvRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NVIDIA_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages: finalMessages,
          temperature,
          max_tokens: targetTokens,
        }),
      });

      if (nvRes.ok) {
        const data = await nvRes.json();
        completionContent = data.choices?.[0]?.message?.content || "";
      } else {
        const errText = await nvRes.text().catch(() => "");
        console.warn(`[OpenAI Gateway Sync] NVIDIA NIM failed (${nvRes.status}):`, errText);
      }
    } catch (err) {
      console.warn("[OpenAI Gateway Sync] NVIDIA NIM error, falling back:", err.message);
    }
  }

  // Level 0: Try Groq LPU (Ultra-Fast 300+ tokens/sec)
  if (!completionContent && GROQ_KEY) {
    try {
      const hasImages = finalMessages.some((m) => {
        if (Array.isArray(m.content)) {
          return m.content.some((p) => p.type === "image_url");
        }
        return false;
      });
      const groqModel = resolveGroqModel(requestedModel, hasImages);
      console.log(`[OpenAI Gateway Sync] Trying Groq LPU with model: ${groqModel}`);
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqModel,
          messages: finalMessages,
          temperature,
          max_tokens: targetTokens,
        }),
      });

      if (groqRes.ok) {
        const data = await groqRes.json();
        completionContent = data.choices?.[0]?.message?.content || "";
      } else {
        const errText = await groqRes.text().catch(() => "");
        console.warn(`[OpenAI Gateway Sync] Groq LPU failed (${groqRes.status}):`, errText);
      }
    } catch (err) {
      console.warn("[OpenAI Gateway Sync] Groq error, falling back to OpenRouter:", err.message);
    }
  }

  if (!completionContent) {
    for (const upstreamModel of modelChain) {
    try {
      let resUpstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OR_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://avg-ai-creator.site",
          "X-Title": "Oryxgen AI Gateway",
        },
        body: JSON.stringify({
          model: upstreamModel,
          messages: finalMessages,
          temperature,
          max_tokens: targetTokens,
        }),
      });

      if (!resUpstream.ok && resUpstream.status === 400) {
        const errText = await resUpstream.text().catch(() => "");
        if (/max_tokens|token limit|exceed/i.test(errText)) {
          const matchNum = errText.match(/(?:maximum|limit|allowed|max_tokens is|up to)\s*(\d+)/i);
          targetTokens = matchNum ? parseInt(matchNum[1], 10) : 8192;
          resUpstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OR_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: upstreamModel,
              messages: finalMessages,
              temperature,
              max_tokens: targetTokens,
            }),
          });
        }
      }

      if (resUpstream.ok) {
        const data = await resUpstream.json();
        completionContent = data.choices?.[0]?.message?.content || "";
        if (completionContent) break;
      } else {
        lastErr = new Error(`Model ${upstreamModel} xatosi: ${resUpstream.status}`);
      }
    } catch (err) {
      lastErr = err;
    }
  }
}

  if (!completionContent) {
    return res.status(502).json({
      error: {
        message: `Barcha neyron tarmoq kanallari band: ${lastErr?.message || "Noma'lum xatolik"}. Proxy orqali qayta urinib ko'ring.`,
        type: "api_connection_error",
        code: "all_upstreams_exhausted",
      },
    });
  }

  const inTokens = Math.ceil(JSON.stringify(messages).length / 4);
  const outTokens = Math.ceil(completionContent.length / 4);
  const durationMs = Date.now() - startTime;

  await logApiUsage({
    keyPrefix: req.apiKey.key_prefix,
    userId: req.user.id,
    model: catalogModel.displayName,
    inputTokens: inTokens,
    outputTokens: outTokens,
    durationMs,
  });

  return res.json({
    id: `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: catalogModel.id,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: completionContent,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: inTokens,
      completion_tokens: outTokens,
      total_tokens: inTokens + outTokens,
    },
  });
});

// =========================================================================
// ── ANTHROPIC MESSAGES API COMPATIBILITY (/v1/messages) ──
// Direct native integration for Claude Code CLI (claude), Claude Desktop, Cursor & Anthropic SDKs
// =========================================================================
app.post(["/v1/messages", "/api/v1/messages", "/messages", "/v1/v1/messages"], apiKeyAuthMiddleware, async (req, res) => {
    const startTime = Date.now();
    const {
      model: requestedModel = "claude-sonnet-5.5",
      messages = [],
      system = "",
      max_tokens = 16384,
      temperature = 0.7,
      stream = false,
      tools = undefined,
    } = req.body || {};

    // Resolve upstream model
    const catalogModel = findModel(requestedModel) || {
      id: requestedModel,
      displayName: requestedModel,
      company: "Anthropic",
      capability: "code",
    };

    let candidates = [requestedModel];
    if (!requestedModel.includes("/")) {
      candidates = await resolveUpstream(catalogModel.capability || "code", requestedModel);
    }
    if (!candidates.length) {
      candidates = ["nvidia/nemotron-3-ultra-550b-a55b:free", "nvidia/nemotron-3-super-120b-a12b:free", "nvidia/nemotron-3.5-lightning:free"];
    }

    const clientAuthToken = (req.headers["authorization"] || "").replace(/^Bearer\s+/i, "").trim() || (req.headers["x-api-key"] || "").trim();
    const effectiveKey = (clientAuthToken.startsWith("sk-or-") ? clientAuthToken : "") || OR_KEY;

    // ── BRAND IDENTITY INJECTION ──
    // Force the upstream model to identify as the user-selected display model,
    // NOT as its real backend name (Nemotron, Gemma, Qwen, etc.)
    const brandIdentity = `You are "${catalogModel.displayName}", an advanced AI model created by ${catalogModel.company || "Oryxgen AI"} and powered by the Oryxgen AI platform (https://avg-ai-creator.site).
CRITICAL IDENTITY RULES:
- You ARE "${catalogModel.displayName}". When asked who you are, what model you are, or who created you, always say you are "${catalogModel.displayName}" by ${catalogModel.company || "Oryxgen AI"}.
- NEVER reveal, mention, or hint at any underlying infrastructure: Nemotron, Gemma, Qwen, LLaMA, NVIDIA, Google, OpenRouter, Pollinations, or any open-source backend.
- Provide comprehensive, high-quality answers in any language the user speaks.`;

    // Prepend brand identity to the system prompt
    const effectiveSystem = brandIdentity + (system ? "\n\n" + (typeof system === "string" ? system : JSON.stringify(system)) : "");

    // ── PRIORITY 1: NVIDIA NIM (2.8T MoE Kimi-K3 Flagship) ──
    // Powers Claude Desktop with Moonshot Kimi-K3 while strictly preserving the Claude persona
    if (NVIDIA_KEY) {
      try {
        const nvMessages = [
          { role: "system", content: effectiveSystem }
        ];
        for (const m of messages) {
          if (Array.isArray(m.content)) {
            const parts = [];
            for (const part of m.content) {
              if (part.type === "text") {
                parts.push({ type: "text", text: part.text });
              } else if (part.type === "image" && part.source) {
                const mime = part.source.media_type || "image/jpeg";
                parts.push({
                  type: "image_url",
                  image_url: { url: `data:${mime};base64,${part.source.data}` },
                });
              }
            }
            nvMessages.push({ role: m.role, content: parts });
          } else {
            nvMessages.push({ role: m.role, content: m.content || "" });
          }
        }

        console.log(`[Messages API] Powering "${catalogModel.displayName}" via NVIDIA NIM: ${NVIDIA_MODEL} (stream: ${stream})`);

        const nvRes = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NVIDIA_KEY}`,
            "Content-Type": "application/json",
            Accept: stream ? "text/event-stream" : "application/json",
          },
          body: JSON.stringify({
            model: NVIDIA_MODEL,
            messages: nvMessages,
            max_tokens,
            temperature,
            stream: Boolean(stream),
          }),
        });

        if (nvRes.ok && nvRes.body) {
          if (stream) {
            res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();

            const msgId = `msg_${Date.now()}`;
            res.write(`event: message_start\ndata: ${JSON.stringify({
              type: "message_start",
              message: {
                id: msgId,
                type: "message",
                role: "assistant",
                content: [],
                model: catalogModel.displayName,
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: 15, output_tokens: 1 }
              }
            })}\n\n`);

            res.write(`event: content_block_start\ndata: ${JSON.stringify({
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" }
            })}\n\n`);

            const reader = nvRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let generatedTokens = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const chunkText = parsed.choices?.[0]?.delta?.content || "";
                    if (chunkText) {
                      generatedTokens++;
                      res.write(`event: content_block_delta\ndata: ${JSON.stringify({
                        type: "content_block_delta",
                        index: 0,
                        delta: { type: "text_delta", text: chunkText }
                      })}\n\n`);
                    }
                  } catch {
                    /* ignore chunk parse */
                  }
                }
              }
            }

            res.write(`event: content_block_stop\ndata: ${JSON.stringify({
              type: "content_block_stop",
              index: 0
            })}\n\n`);

            res.write(`event: message_delta\ndata: ${JSON.stringify({
              type: "message_delta",
              delta: { stop_reason: "end_turn", stop_sequence: null },
              usage: { output_tokens: generatedTokens || 20 }
            })}\n\n`);

            res.write(`event: message_stop\ndata: ${JSON.stringify({
              type: "message_stop"
            })}\n\n`);

            res.end();
            return;
          } else {
            const data = await nvRes.json();
            const outText = data.choices?.[0]?.message?.content || "";
            res.json({
              id: `msg_${Date.now()}`,
              type: "message",
              role: "assistant",
              model: catalogModel.displayName,
              content: [{ type: "text", text: outText }],
              stop_reason: "end_turn",
              usage: {
                input_tokens: data.usage?.prompt_tokens || 20,
                output_tokens: data.usage?.completion_tokens || 50,
              },
            });
            return;
          }
        } else {
          const errText = await nvRes.text().catch(() => "");
          console.warn(`[Messages API] NVIDIA NIM Kimi-K3 returned ${nvRes.status}:`, errText);
        }
      } catch (err) {
        console.warn("[Messages API] NVIDIA NIM Kimi-K3 connection error, falling back:", err.message);
      }
    }

    // ── TRY GROQ LPU FIRST FOR ULTRA-FAST CLAUDE DESKTOP RESPONSES ──
    if (GROQ_KEY) {
      try {
        const groqMessages = [
          { role: "system", content: effectiveSystem }
        ];
        let hasImages = false;
        for (const m of messages) {
          if (Array.isArray(m.content)) {
            const parts = [];
            for (const part of m.content) {
              if (part.type === "text") {
                parts.push({ type: "text", text: part.text });
              } else if (part.type === "image" && part.source) {
                hasImages = true;
                const mime = part.source.media_type || "image/jpeg";
                parts.push({
                  type: "image_url",
                  image_url: { url: `data:${mime};base64,${part.source.data}` },
                });
              }
            }
            groqMessages.push({ role: m.role, content: parts });
          } else {
            groqMessages.push({ role: m.role, content: m.content || "" });
          }
        }
        const groqModel = resolveGroqModel(requestedModel, hasImages);
        console.log(`[Messages API] Trying Groq LPU with model: ${groqModel} (stream: ${stream})`);

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GROQ_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: groqModel,
            messages: groqMessages,
            max_tokens,
            temperature,
            stream: Boolean(stream),
          }),
        });

        if (groqRes.ok && groqRes.body) {
          if (stream) {
            res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders?.();

            const msgId = `msg_${Date.now()}`;
            res.write(`event: message_start\ndata: ${JSON.stringify({
              type: "message_start",
              message: {
                id: msgId,
                type: "message",
                role: "assistant",
                content: [],
                model: catalogModel.displayName,
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: 15, output_tokens: 1 }
              }
            })}\n\n`);

            res.write(`event: content_block_start\ndata: ${JSON.stringify({
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" }
            })}\n\n`);

            const reader = groqRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let generatedTokens = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ")) {
                  const dataStr = trimmed.slice(6);
                  if (dataStr === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const chunkText = parsed.choices?.[0]?.delta?.content || "";
                    if (chunkText) {
                      generatedTokens++;
                      res.write(`event: content_block_delta\ndata: ${JSON.stringify({
                        type: "content_block_delta",
                        index: 0,
                        delta: { type: "text_delta", text: chunkText }
                      })}\n\n`);
                    }
                  } catch {
                    /* ignore chunk parse */
                  }
                }
              }
            }

            res.write(`event: content_block_stop\ndata: ${JSON.stringify({
              type: "content_block_stop",
              index: 0
            })}\n\n`);

            res.write(`event: message_delta\ndata: ${JSON.stringify({
              type: "message_delta",
              delta: { stop_reason: "end_turn", stop_sequence: null },
              usage: { output_tokens: generatedTokens || 20 }
            })}\n\n`);

            res.write(`event: message_stop\ndata: ${JSON.stringify({
              type: "message_stop"
            })}\n\n`);

            res.end();
            return;
          } else {
            const data = await groqRes.json();
            const outText = data.choices?.[0]?.message?.content || "";
            res.json({
              id: `msg_${Date.now()}`,
              type: "message",
              role: "assistant",
              model: catalogModel.displayName,
              content: [{ type: "text", text: outText }],
              stop_reason: "end_turn",
              usage: {
                input_tokens: data.usage?.prompt_tokens || 20,
                output_tokens: data.usage?.completion_tokens || 50,
              },
            });
            return;
          }
        } else {
          const errText = await groqRes.text().catch(() => "");
          console.warn(`[Messages API] Groq LPU failed (${groqRes.status}):`, errText);
        }
      } catch (err) {
        console.warn("[Messages API] Groq error, falling back to OpenRouter:", err.message);
      }
    }

    let lastErrorText = "";
    let success = false;

    for (const upstreamModel of candidates) {
      try {
        console.log(`[Messages API] Routing ${requestedModel} -> upstream: ${upstreamModel}`);
        const upstreamRes = await fetch("https://openrouter.ai/api/v1/messages", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${effectiveKey}`,
            "Content-Type": "application/json",
            "anthropic-version": req.headers["anthropic-version"] || "2023-06-01",
            "HTTP-Referer": "https://avg-ai-creator.site",
            "X-Title": "Oryxgen AI Messages Gateway",
          },
          body: JSON.stringify({
            model: upstreamModel,
            messages,
            system: effectiveSystem,
            max_tokens,
            temperature,
            stream,
            ...(tools ? { tools } : {}),
          }),
        });

        if (!upstreamRes.ok) {
          lastErrorText = await upstreamRes.text().catch(() => "");
          console.warn(`[Messages API] Upstream ${upstreamModel} rejected with HTTP ${upstreamRes.status}:`, lastErrorText);
          continue;
        }

        if (stream) {
          res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-transform");
          res.setHeader("Connection", "keep-alive");
          res.flushHeaders?.();

          const reader = upstreamRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } else {
          const data = await upstreamRes.json();
          res.status(upstreamRes.status).json(data);
        }

        success = true;
        // Log usage
        const inTokens = Math.ceil((JSON.stringify(messages).length + (system?.length || 0)) / 4);
        const durationMs = Date.now() - startTime;
        await logApiUsage({
          keyPrefix: req.apiKey.key_prefix,
          userId: req.user.id,
          model: catalogModel.displayName,
          inputTokens: inTokens,
          outputTokens: 50,
          durationMs,
        }).catch(() => { });

        break;
      } catch (err) {
        console.warn(`[Messages API] Connection error for ${upstreamModel}:`, err.message);
        lastErrorText = err.message;
      }
    }

    if (!success) {
      if (stream) {
        if (!res.headersSent) {
          res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          res.flushHeaders?.();
        }
        res.write(`event: error\ndata: ${JSON.stringify({ type: "error", error: { message: lastErrorText || "Barcha bepul modellar hozirda band. Iltimos, bir ozdan keyin qayta urinib ko'ring." } })}\n\n`);
        res.end();
      } else {
        if (!res.headersSent) {
          res.status(502).json({
            type: "error",
            error: { type: "api_error", message: lastErrorText || "Barcha upstream modellar band." },
          });
        } else {
          res.end();
        }
      }
    }
  });

  // POST /v1/codex/generate (Autonomous multi-file project scaffolding via API/CLI)
  app.post("/v1/codex/generate", apiKeyAuthMiddleware, async (req, res) => {
    const { prompt } = req.body || {};
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt kiritilishi shart." });
    }

    try {
      const result = await executeCodexPipeline(prompt, OR_KEY);
      const inTokens = Math.ceil(prompt.length / 4);
      const outTokens = Math.ceil(JSON.stringify(result.projectFiles).length / 4);

      await logApiUsage({
        keyPrefix: req.apiKey.key_prefix,
        userId: req.user.id,
        model: "CodeX Engine",
        inputTokens: inTokens,
        outputTokens: outTokens,
        durationMs: 3000,
      });

      res.json({
        ok: true,
        plan: result.plan,
        files: result.projectFiles,
        summary: result.plan?.summary,
        totalFiles: Object.keys(result.projectFiles).length,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /v1/analytics/usage (API-level token metrics)
  app.get("/v1/analytics/usage", apiKeyAuthMiddleware, async (req, res) => {
    try {
      const stats = await getApiUsageAnalytics(req.user.id);
      res.json({ ok: true, stats });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Start initial scan of free models
  refreshFreeModels();

  app.listen(PORT, () => {
    console.log(`Oryxgen AI API & MCP Server running on http://localhost:${PORT}`);
  });