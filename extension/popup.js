// Oryxgen AI — Extension Popup Controller

const API_BASE = "https://oryxgen-api.onrender.com";

let currentTabContext = null;
const conversationHistory = [];

const modelSelect = document.getElementById("modelSelect");
const tabTitleEl = document.getElementById("tabTitle");
const chatFeed = document.getElementById("chatFeed");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const btnSummarize = document.getElementById("btnSummarize");
const btnFindErrors = document.getElementById("btnFindErrors");
const btnExtract = document.getElementById("btnExtract");
const btnClear = document.getElementById("btnClear");
const statusBadge = document.getElementById("statusBadge");

// Load stored settings & fetch active tab context
document.addEventListener("DOMContentLoaded", async () => {
  chrome.storage.local.get(["selectedModel"], (data) => {
    if (data.selectedModel && modelSelect) {
      modelSelect.value = data.selectedModel;
    }
  });

  modelSelect.addEventListener("change", () => {
    chrome.storage.local.set({ selectedModel: modelSelect.value });
  });

  // Get active tab info
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      tabTitleEl.textContent = tab.title || tab.url || "Noma'lum sahifa";
      chrome.tabs.sendMessage(tab.id, { action: "getPageContext" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          tabTitleEl.textContent = tab.title || "Brauzer sahifasi";
          return;
        }
        currentTabContext = response;
        if (response.selection) {
          appendMessage("system", `Tanlangan matn: "${response.selection.slice(0, 100)}..."`);
        }
      });
    }
  } catch (err) {
    tabTitleEl.textContent = "Sahifa ma'lumoti olinmadi";
  }
});

// Quick Action: Summarize page
btnSummarize.addEventListener("click", () => {
  const contextSnippet = currentTabContext?.pageText ? `\n\n[Sahifa matni]:\n${currentTabContext.pageText.slice(0, 4000)}` : "";
  const prompt = `Ushbu sahifaning (${currentTabContext?.title || "Joriy sahifa"}) asosiy mazmuni, maqsadi va muhim nuqtalarini qisqa, aniq tahlil qilib bering.${contextSnippet}`;
  handleUserPrompt(prompt, "Sahifani tahlil qilish");
});

// Quick Action: Find errors
btnFindErrors.addEventListener("click", () => {
  const errors = currentTabContext?.detectedErrors || [];
  const errorText = errors.length > 0 ? JSON.stringify(errors, null, 2) : "Konsolda ochiq runtime xatoliklar qayd etilmagan.";
  const prompt = `Ushbu sahifada quyidagi xatoliklar aniqlandi:\n${errorText}\n\nIltimos, ushbu sahifadagi xatoliklar sababini va ularni qanday tuzatish kerakligini tushuntiring.`;
  handleUserPrompt(prompt, "Sahifadagi xatolarni tekshirish");
});

// Quick Action: Extract clean text
btnExtract.addEventListener("click", () => {
  if (currentTabContext?.selection) {
    appendMessage("assistant", `**Tanlangan matn:**\n\n${currentTabContext.selection}`);
  } else if (currentTabContext?.pageText) {
    appendMessage("assistant", `**Sahifadan olingan matn (birinchi 1,000 belgi):**\n\n${currentTabContext.pageText.slice(0, 1000)}...`);
  } else {
    appendMessage("assistant", "Sahifadan matn topilmadi.");
  }
});

// Clear conversation
btnClear.addEventListener("click", () => {
  conversationHistory.length = 0;
  chatFeed.innerHTML = `
    <div class="message assistant welcome">
      <div class="msg-header">Oryxgen AI</div>
      <div class="msg-body">Suhbat tarixi tozalandi. Yangi so'rov yuborishingiz mumkin.</div>
    </div>
  `;
});

// Handle form submission
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;
  userInput.value = "";
  handleUserPrompt(text);
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

// Append message bubble to UI
function appendMessage(role, text) {
  const msgEl = document.createElement("div");
  msgEl.className = `message ${role}`;

  const header = document.createElement("div");
  header.className = "msg-header";
  header.textContent = role === "user" ? "Siz" : role === "system" ? "Tizim" : "Oryxgen AI";

  const body = document.createElement("div");
  body.className = "msg-body";
  body.textContent = text;

  msgEl.appendChild(header);
  msgEl.appendChild(body);
  chatFeed.appendChild(msgEl);
  chatFeed.scrollTop = chatFeed.scrollHeight;
  return body;
}

// Stream response from Oryxgen AI
async function handleUserPrompt(promptText, displayPrompt = null) {
  const chosenModel = modelSelect.value || "claude-sonnet-5.5";
  appendMessage("user", displayPrompt || promptText);

  // Attach tab context to system prompt
  const tabInfoPrompt = currentTabContext
    ? `[Current Browser Tab]: URL: ${currentTabContext.url}, Title: ${currentTabContext.title}\n`
    : "";

  conversationHistory.push({ role: "user", content: promptText });

  const assistantBodyEl = appendMessage("assistant", "Javob tayyorlanmoqda...");
  sendBtn.disabled = true;
  statusBadge.textContent = "AI Streaming";
  statusBadge.style.color = "#00f0ff";

  try {
    const res = await fetch(`${API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          {
            role: "system",
            content: `You are Oryxgen AI Browser Assistant. You help the user browse the web, analyze web content, debug web errors, and automate actions. Write clean, direct responses in Uzbek or English.\n${tabInfoPrompt}`,
          },
          ...conversationHistory.slice(-10),
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Server xatosi: HTTP ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullResponse = "";
    assistantBodyEl.textContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullResponse += delta;
            assistantBodyEl.textContent = fullResponse;
            chatFeed.scrollTop = chatFeed.scrollHeight;
          }
        } catch (_) {}
      }
    }

    if (!fullResponse.trim()) {
      assistantBodyEl.textContent = "Javob muvaffaqiyatli qabul qilindi.";
    }

    conversationHistory.push({ role: "assistant", content: fullResponse || assistantBodyEl.textContent });

    // Execute automated actions if present in response
    executeBrowserActionTags(fullResponse);
  } catch (err) {
    assistantBodyEl.textContent = `Ulanishda xatolik: ${err.message}`;
    assistantBodyEl.style.color = "#ef4444";
  } finally {
    sendBtn.disabled = false;
    statusBadge.textContent = "Live";
    statusBadge.style.color = "#10b981";
  }
}

// Executes action tags (e.g. <click selector="..." />)
async function executeBrowserActionTags(responseText) {
  if (!responseText) return;
  const clickMatch = responseText.match(/<click\s+selector="([^"]+)"\s*\/>/i);
  if (clickMatch) {
    const selector = clickMatch[1];
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "clickElement", selector }, (res) => {
        if (res?.ok) appendMessage("system", `Element bosildi: ${selector}`);
      });
    }
  }

  const scrollMatch = responseText.match(/<scroll\s+direction="(up|down)"\s*\/>/i);
  if (scrollMatch) {
    const direction = scrollMatch[1];
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "scroll", direction });
    }
  }
}
