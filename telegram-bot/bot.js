#!/usr/bin/env node

/**
 * Oryxgen AI — Official Telegram Bot Service
 * Integrates 80+ models, multi-turn conversation memory, and model selection.
 */

const https = require("https");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("[Oryxgen Telegram Bot]: TELEGRAM_BOT_TOKEN muhit o'zgaruvchisi topilmadi.");
  console.error("Ishga tushirish uchun: TELEGRAM_BOT_TOKEN=\"SIZNING_BOT_TOKENINGIZ\" node bot.js");
  process.exit(1);
}
const API_BASE = process.env.ORYXGEN_API_URL || "https://oryxgen-api.onrender.com";

// In-memory conversation state per chat: { [chatId]: { model: string, history: Array<{role, content}> } }
const userSessions = new Map();

const AVAILABLE_MODELS = [
  { id: "claude-sonnet-5.5", name: "Claude Sonnet 5.5" },
  { id: "claude-opus-5.5", name: "Claude Opus 5.5" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B" },
  { id: "nvidia/nemotron-3-super-120b-a12b", name: "Nemotron 3 Super 120B" },
  { id: "nvidia/nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 Lightning 30B" },
  { id: "deepseek-ai/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash" },
  { id: "google/gemma-4-31b-it", name: "Google Gemma 4 31B" },
  { id: "gpt-6-astra", name: "GPT-6 Astra" },
];

function getSession(chatId) {
  if (!userSessions.has(chatId)) {
    userSessions.set(chatId, {
      model: "claude-sonnet-5.5",
      history: [],
    });
  }
  return userSessions.get(chatId);
}

// Telegram API Helper
async function tgCall(method, payload = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 35000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// Send chat message
async function sendMessage(chatId, text, options = {}) {
  // Telegram 4096 char limit safeguard
  const maxLen = 4000;
  if (text.length > maxLen) {
    for (let i = 0; i < text.length; i += maxLen) {
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: text.slice(i, i + maxLen),
        ...options,
      });
    }
    return;
  }
  return tgCall("sendMessage", {
    chat_id: chatId,
    text,
    ...options,
  });
}

// Send typing indicator
async function sendTyping(chatId) {
  return tgCall("sendChatAction", { chat_id: chatId, action: "typing" });
}

// Query Oryxgen AI Backend
async function queryOryxgenAi(model, messages) {
  const url = `${API_BASE}/v1/chat/completions`;
  const postData = JSON.stringify({
    model,
    messages: [
      {
        role: "system",
        content: `You are Oryxgen AI assistant running on Telegram. You remember context across all turns. Answer questions clearly, accurately, and politely in Uzbek or English. Never mention backend internal model names.`,
      },
      ...messages,
    ],
    max_tokens: 4096,
    temperature: 0.7,
  });

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 60000,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0] && json.choices[0].message) {
            resolve(json.choices[0].message.content);
          } else if (json.error) {
            reject(new Error(json.error.message || "API xatosi"));
          } else {
            reject(new Error("Kutilmagan javob formati"));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// Process single update
async function handleUpdate(update) {
  // 1. Handle inline keyboard callback queries
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    const data = cb.data || "";

    if (chatId && data.startsWith("setmodel:")) {
      const selectedModel = data.replace("setmodel:", "");
      const session = getSession(chatId);
      session.model = selectedModel;
      const modelObj = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
      await tgCall("answerCallbackQuery", { callback_query_id: cb.id, text: `Model: ${modelObj?.name || selectedModel}` });
      await sendMessage(chatId, `Faol model o'zgartirildi: *${modelObj?.name || selectedModel}*`, { parse_mode: "Markdown" });
    }
    return;
  }

  // 2. Handle text messages
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const session = getSession(chatId);

  // Commands
  if (text === "/start") {
    session.history = [];
    const welcomeText =
      `*Assalomu alaykum! Oryxgen AI Telegram botiga xush kelibsiz.*\n\n` +
      `Ushbu bot Oryxgen AI platformasi orqali 80+ eng kuchli modellarga (Claude, Nemotron, DeepSeek, GPT-6) ulangan.\n\n` +
      `⚡ *Mavjud buyruqlar:*\n` +
      `• /model — Modelni tanlash\n` +
      `• /clear — Suhbat tarixini tozalash (yangi mavzu boshlash)\n` +
      `• /status — Hozirgi tanlangan model va xotira holati\n\n` +
      `Istalgan savolingizni yozing, to'liq kontekst va xotira bilan javob beraman!`;
    return sendMessage(chatId, welcomeText, { parse_mode: "Markdown" });
  }

  if (text === "/clear") {
    session.history = [];
    return sendMessage(chatId, "Suhbat xotirasi tozalandi. Yangi suhbatni boshlashingiz mumkin.");
  }

  if (text === "/status") {
    const modelObj = AVAILABLE_MODELS.find((m) => m.id === session.model);
    return sendMessage(
      chatId,
      `*Oryxgen AI Bot Holati:*\n\n` +
        `• *Joriy Model:* ${modelObj?.name || session.model}\n` +
        `• *Xotiradagi xabarlar:* ${session.history.length} ta turn\n` +
        `• *API Ulanish:* ${API_BASE}`,
      { parse_mode: "Markdown" }
    );
  }

  if (text === "/model") {
    const keyboard = {
      inline_keyboard: AVAILABLE_MODELS.map((m) => [
        {
          text: (m.id === session.model ? "✅ " : "") + m.name,
          callback_data: `setmodel:${m.id}`,
        },
      ]),
    };
    return sendMessage(chatId, "*Kerakli AI modelini tanlang:*", {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  }

  // Regular chat turn
  session.history.push({ role: "user", content: text });
  if (session.history.length > 40) {
    session.history = session.history.slice(-30);
  }

  await sendTyping(chatId);

  try {
    const reply = await queryOryxgenAi(session.model, session.history);
    session.history.push({ role: "assistant", content: reply });
    await sendMessage(chatId, reply);
  } catch (err) {
    console.error(`[Chat Error ${chatId}]:`, err.message);
    await sendMessage(chatId, `Kechirasiz, javob olishda xatolik yuz berdi: ${err.message}`);
  }
}

// Long polling loop
let lastUpdateId = 0;
async function startPolling() {
  console.log(`[Oryxgen AI Telegram Bot] Starting long polling...`);
  console.log(`[Oryxgen AI Telegram Bot] API Base: ${API_BASE}`);

  while (true) {
    try {
      const updates = await tgCall("getUpdates", {
        offset: lastUpdateId + 1,
        timeout: 25,
      });

      if (updates.ok && Array.isArray(updates.result)) {
        for (const update of updates.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          try {
            await handleUpdate(update);
          } catch (e) {
            console.error("[Update Handler Error]:", e.message);
          }
        }
      }
    } catch (err) {
      console.warn("[Polling Error, retrying in 3s]:", err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

if (require.main === module) {
  startPolling();
}

module.exports = { startPolling, handleUpdate };
