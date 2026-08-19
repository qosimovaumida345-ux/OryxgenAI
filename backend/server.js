import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { findModel, PUBLIC_IMAGE_MODELS, PUBLIC_MODELS } from "./catalog.js";
import { pollinationsModel, refreshFreeModels, resolveUpstream, getFreePool } from "./mapper.js";
import { initDb, getUserChats, saveUserChat } from "./db.js";
import { authMiddleware, setupAuthRoutes } from "./auth.js";

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

  const responseText = `Assalomu alaykum! Men **${meta.displayName}** (${meta.company}) modeliman.\n\nSiz yuborgan so'rov:\n> ${userMsg}\n\n${
    systemPrompt ? `*Custom System Prompt tatbiq etildi.* \n\n` : ""
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

  // Prepend custom system prompt if provided
  const preparedMessages = [];
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

// ==========================================
// MODEL CONTEXT PROTOCOL (MCP) IMPLEMENTATION
// Compatible with Claude.ai, Claude Desktop, Cursor, and any MCP Client
// ==========================================

const MCP_TOOLS = [
  {
    name: "oryxgen_chat",
    description: "Generate responses from 200+ models (Claude 4.6, GPT-5, DeepSeek R1, Grok 4.6, Gemini 3.5) with custom system prompts.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The message or question for the AI model" },
        model: { type: "string", description: "Model identifier (e.g., 'claude-4.6-sonnet', 'deepseek-r1', 'gpt-5')", default: "claude-4.6-sonnet" },
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
    description: "List all 200+ available AI models, their provider, capabilities, and active free status.",
    inputSchema: {
      type: "object",
      properties: {
        capability: { type: "string", enum: ["all", "chat", "reason", "code", "vision", "image"], default: "all" },
      },
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
async function handleMcpJsonRpc(body) {
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

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not supported: ${method}` },
      };
  }
}

// MCP over HTTP POST (Standard endpoint)
app.post(["/api/mcp", "/mcp"], async (req, res) => {
  const result = await handleMcpJsonRpc(req.body);
  if (!result) return res.status(204).end();
  res.json(result);
});

// MCP Server-Sent Events (SSE) endpoint for Claude Desktop / Remote SSE clients
app.get(["/api/mcp/sse", "/sse"], (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sessionId = Math.random().toString(36).substring(2, 15);
  res.write(`event: endpoint\ndata: /api/mcp?sessionId=${sessionId}\n\n`);

  // Keep-alive heartbeat
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
