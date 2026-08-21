import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import JSZip from "jszip";
import { findModel, PUBLIC_IMAGE_MODELS, PUBLIC_MODELS } from "./catalog.js";
import { pollinationsModel, refreshFreeModels, resolveUpstream, resolveBestCodeModel, getFreePool } from "./mapper.js";
import { initDb, getUserChats, saveUserChat, deleteUserChat, findUserById } from "./db.js";
import {
  authMiddleware,
  setupAuthRoutes,
  verifyToken,
  generateDownloadToken,
  verifyDownloadToken,
  generateAuthorizationCode,
  verifyAuthorizationCode,
  generateToken,
  MCP_CLIENT_ID,
  FRONTEND_URL,
} from "./auth.js";
import { executeCodexPipeline } from "./codexEngine.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const OR_KEY = process.env.OPENROUTER_API_KEY || "";

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
  res.status(status).json({ error: message });
}

// Fallback streaming generator when no OpenRouter key is configured
async function streamSimulatedResponse(res, meta, userMsg, systemPrompt = "") {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const isThinking = meta.capability === "reason" || meta.tags?.includes("thinking");

  if (isThinking) {
    res.write(`data: ${JSON.stringify({ thinking: `Tahlil qilinmoqda: "${userMsg.slice(0, 45)}..."` })}\n\n`);
    await new Promise((r) => setTimeout(r, 200));
    if (systemPrompt) {
      res.write(`data: ${JSON.stringify({ thinking: `\n- Tizim ko'rsatmasi (System Prompt) yuklandi\n- Qoidalar tekshirildi` })}\n\n`);
      await new Promise((r) => setTimeout(r, 250));
    }
    res.write(`data: ${JSON.stringify({ thinking: `\n- ${meta.displayName} (${meta.company}) arxitekturasi orqali javob shakllantirilmoqda...` })}\n\n`);
    await new Promise((r) => setTimeout(r, 200));
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
  const { model: displayId, messages, systemPrompt } = req.body || {};
  const meta = findModel(displayId);
  if (!meta || meta.capability === "image") {
    return clientError(res, 400, "Noma'lum yoki noto'g'ri model tanlangan.");
  }
  if (!Array.isArray(messages) || !messages.length) {
    return clientError(res, 400, "Messages ro'yxati kiritilishi shart.");
  }

  // Mandatory Model Identity Persona
  const modelPersona = `You are "${meta.displayName}" created by ${meta.company}. You are running inside Oryxgen AI platform.
CRITICAL INSTRUCTION: If the user asks who you are, what model you are, which company made you, or what your name is, you MUST ALWAYS respond that you are "${meta.displayName}" by ${meta.company}. NEVER reveal any other internal model name or underlying provider. Maintain this identity strictly and consistently in all languages (O'zbek, English, Russian, etc.).`;

  const preparedMessages = [
    { role: "system", content: modelPersona }
  ];

  // Prepend custom system prompt if provided
  if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim()) {
    preparedMessages.push({ role: "system", content: systemPrompt.trim() });
  }

  const safeMessages = [
    ...preparedMessages,
    ...messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant" || m.role === "system"))
      .map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 32000) }))
      .slice(-24),
  ];

  const lastUserMsg = safeMessages.filter((m) => m.role === "user").pop()?.content || "";

  if (!OR_KEY) {
    return streamSimulatedResponse(res, meta, lastUserMsg, systemPrompt);
  }

  const chain = await resolveUpstream(meta.capability, displayId);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let streamSucceeded = false;

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

            if (delta?.reasoning) {
              res.write(`data: ${JSON.stringify({ thinking: delta.reasoning })}\n\n`);
            }

            let text = delta?.content || "";
            if (text) {
              if (text.includes("<think>")) {
                inThinkTag = true;
                text = text.replace("<think>", "");
              }
              if (text.includes("</think>")) {
                inThinkTag = false;
                const [thinkPart, normalPart] = text.split("</think>");
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
          description: "Display name of a model from Oryxgen AI's catalog (see oryxgen_list_models for the full list, e.g. 'claude-4.6-sonnet', 'gpt-5', 'deepseek-r1'). Note: these are catalog display names for routing/capability selection only — the actual response is generated by a free-tier backend model chosen for the requested capability, not by the named provider's real model.",
          default: "claude-4.6-sonnet",
        },
        systemPrompt: { type: "string", description: "Optional custom system instruction or skill behavior" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "oryxgen_generate_image",
    description: "Generate images using Pollinations AI (Flux, FLUX Realism, FLUX Anime, FLUX 3D, Midjourney style).",
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
    description: "List Oryxgen AI's catalog of model display names, their listed provider/company, and capability category. These are catalog labels used to select a capability when calling oryxgen_chat — they do not indicate which backend model actually generates the response (see oryxgen_chat's model parameter description).",
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
async function handleMcpJsonRpc(body, user) {
  const { id, method, params } = body || {};

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
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
                    note: "id/name/company are catalog display labels for capability selection, not the real backend model that generates responses.",
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
          // Execute full 3-phase Plan -> Generate -> Validate pipeline
          const result = await executeCodexPipeline(prompt, OR_KEY);

          const newChatId = `chat-${Date.now()}`;
          const chatObj = {
            id: newChatId,
            user_id: user.id,
            title: result.plan?.title || prompt.slice(0, 30),
            model: "CodeX Auto",
            mode: "codex",
            project_files: result.projectFiles,
            messages: [
              { id: `user-1`, role: "user", content: prompt },
              { id: `assistant-1`, role: "assistant", content: `**${result.plan?.title || "Loyiha"} muvaffaqiyatli yaratildi!**\n\n${result.plan?.summary || ""}` }
            ]
          };
          await saveUserChat(chatObj);

          const previewUrl = `https://avg-ai-creator.site/preview/${newChatId}`;
          const zipDownloadToken = generateDownloadToken(newChatId, user.id);
          const zipDownloadUrl = `https://avg-ai-creator.site/api/projects/${newChatId}/zip?token=${zipDownloadToken}`;
          const fileCount = Object.keys(result.projectFiles).length;
          const filesSummary = Object.keys(result.projectFiles).map((p) => `- \`${p}\``).join("\n");

          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Dastur muvaffaqiyatli yaratildi va barcha fayllar sintaksisi tekshirildi! 🎉\n\n**Loyiha:** ${result.plan?.title || "CodeX App"}\n**Stack:** ${result.plan?.stack || "Custom"}\n**Fayllar soni:** ${fileCount} ta\n\n${filesSummary}\n\n🔗 **Jonli ko'rish (Live Preview):** ${previewUrl}\n📦 **To'liq ZIP yuklab olish (Download Project):** ${zipDownloadUrl}`,
                },
              ],
            },
          };
        } catch (e) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32000, message: "CodeX generation failed: " + e.message },
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
    return res.status(401).json({ error: { code: -32000, message: "Authentication required. Please connect via https://avg-ai-creator.site" } });
  }
  const user = verifyToken(token);
  if (!user) {
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
  "localhost",
];

function isAllowedRedirectUri(redirectUri) {
  try {
    const parsed = new URL(redirectUri);
    return OAUTH_ALLOWED_REDIRECT_HOSTS.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

// OAuth 2.0 Authorization Server Metadata (RFC 8414) — lets MCP clients
// discover /authorize and /token without them being hardcoded on the client.
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "avg-ai-creator.site";
  const base = `${proto}://${host}`;
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

// GET /authorize — the browser is redirected here by the MCP client.
// We hand off to the frontend's login UI (which already has working OTP +
// Google auth) rather than duplicating a login form server-side, preserving
// every OAuth param so the frontend can complete the flow after login.
app.get("/authorize", (req, res) => {
  const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query;

  if (response_type !== "code") {
    return res.status(400).json({ error: "unsupported_response_type" });
  }
  if (client_id !== MCP_CLIENT_ID) {
    return res.status(400).json({ error: "unauthorized_client", error_description: "Unknown client_id." });
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

// POST /api/mcp/complete-authorize — called by the frontend's /mcp-connect
// page once the user is logged in (existing session or fresh OTP/Google
// login). Mints the short-lived authorization code bound to this user +
// PKCE challenge, and returns the redirect_uri the frontend should send the
// browser back to, completing the hop to the MCP client.
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

// POST /token — the MCP client exchanges the authorization code (+ PKCE
// code_verifier) for an access token. The access token is the same signed
// app JWT generateToken() issues for normal login, so it works identically
// with requireMcpAuth and every other authMiddleware-gated route.
app.post("/token", express.urlencoded({ extended: true }), async (req, res) => {
  const body = { ...req.query, ...req.body };
  const { grant_type, code, redirect_uri, code_verifier, client_id } = body;

  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  if (client_id && client_id !== MCP_CLIENT_ID) {
    return res.status(400).json({ error: "unauthorized_client" });
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

// Start initial scan of free models
refreshFreeModels();

app.listen(PORT, () => {
  console.log(`Oryxgen AI API & MCP Server running on http://localhost:${PORT}`);
});
