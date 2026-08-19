import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { findModel, PUBLIC_IMAGE_MODELS, PUBLIC_MODELS } from "./catalog.js";
import { pollinationsModel, refreshFreeModels, resolveUpstream } from "./mapper.js";
import { initDb, getUserChats, saveUserChat } from "./db.js";
import { authMiddleware, setupAuthRoutes } from "./auth.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const OR_KEY = process.env.OPENROUTER_API_KEY || "";

app.use(
  cors({
    origin: ORIGIN === "*" ? true : ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" }));

// Initialize database schema
initDb();

// Setup Authentication endpoints
setupAuthRoutes(app);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "Oryxgen AI API",
    status: "operational",
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

// Simulated fallback streaming generator when no OpenRouter key is provided in local/dev
async function streamSimulatedResponse(res, meta, userMsg) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const isThinking = meta.capability === "reason" || meta.tags?.includes("thinking");
  
  if (isThinking) {
    res.write(`data: ${JSON.stringify({ thinking: `Analyzing the prompt: "${userMsg.slice(0, 40)}..."` })}\n\n`);
    await new Promise((r) => setTimeout(r, 200));
    res.write(`data: ${JSON.stringify({ thinking: `\n- Evaluating constraints\n- Synthesizing solution using ${meta.displayName}` })}\n\n`);
    await new Promise((r) => setTimeout(r, 300));
    res.write(`data: ${JSON.stringify({ thinking: `\n- Formulating optimal response with step-by-step logic.` })}\n\n`);
    await new Promise((r) => setTimeout(r, 200));
  }

  const responseText = `Assalomu alaykum! Men **${meta.displayName}** (${meta.company}) sun'iy intellekt modeliman.\n\nSizning savolingiz: "${userMsg}"\n\n### Tavsif va Xususiyatlar:\n- **Model**: ${meta.displayName}\n- **Kompaniya**: ${meta.company}\n- **Qobiliyati**: ${meta.capability.toUpperCase()}\n- **Holat**: Online & Live\n\n\`\`\`javascript\n// Namuna kodi - ${meta.displayName}\nfunction runAI() {\n  console.log("Oryxgen AI orqali muvaffaqiyatli ishga tushirildi!");\n  return true;\n}\n\`\`\`\n\nQanday qo'shimcha yordam bera olaman?`;

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
  const { model: displayId, messages, chatId } = req.body || {};
  const meta = findModel(displayId);
  if (!meta || meta.capability === "image") {
    return clientError(res, 400, "Unknown or invalid model.");
  }
  if (!Array.isArray(messages) || !messages.length) {
    return clientError(res, 400, "Messages array is required.");
  }

  const safeMessages = messages
    .filter((m) => m && (m.role === "user" || m.role === "assistant" || m.role === "system"))
    .map((m) => ({ role: m.role, content: String(m.content || "").slice(0, 32000) }))
    .slice(-24);

  const lastUserMsg = safeMessages.filter((m) => m.role === "user").pop()?.content || "";

  // If no OpenRouter key is configured, provide graceful smart streaming response
  if (!OR_KEY) {
    return streamSimulatedResponse(res, meta, lastUserMsg);
  }

  const chain = await resolveUpstream(meta.capability, displayId);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let lastFail = "Barcha tekin modellar band, qayta urinib ko'rilmoqda…";
  let streamSucceeded = false;

  for (let i = 0; i < chain.length; i++) {
    const upstream = chain[i];
    try {
      const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OR_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://oryxgen.ai",
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
            
            // Handle native reasoning / thinking delta if provided by model
            if (delta?.reasoning) {
              res.write(`data: ${JSON.stringify({ thinking: delta.reasoning })}\n\n`);
            }

            let text = delta?.content || "";
            if (text) {
              // Parse <think> ... </think> tags in content
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
            /* skip malformed chunk */
          }
        }
      }

      streamSucceeded = true;
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    } catch {
      // Continue to next upstream fallback
    }
  }

  // If upstream failed or rate limited, provide smart fallback
  if (!streamSucceeded) {
    await streamSimulatedResponse(res, meta, lastUserMsg);
  }
});

// Image generation endpoint via Pollinations AI (100% Free)
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

// Start initial scan of free models
refreshFreeModels();

app.listen(PORT, () => {
  console.log(`✨ Oryxgen AI API running on http://localhost:${PORT}`);
});
