import { useState } from "react";
import JSZip from "jszip";
import "./AppsDownloadModal.css";

// Built-in extension files for 100% infallible client-side zip generation
const EXTENSION_FILES = {
  manifest: JSON.stringify(
    {
      manifest_version: 3,
      name: "Oryxgen AI — Browser Automator & Intelligence Extension",
      version: "1.0.0",
      description: "Control your browser with 80+ AI models, automate actions, summarize pages, inspect errors, and write code seamlessly.",
      permissions: ["activeTab", "scripting", "storage", "tabs", "contextMenus"],
      host_permissions: ["<all_urls>"],
      action: {
        default_popup: "popup.html",
        default_title: "Oryxgen AI Browser Assistant",
      },
      background: {
        service_worker: "background.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content.js"],
          run_at: "document_end",
        },
      ],
    },
    null,
    2
  ),
  background: `// Oryxgen AI — Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "oryxgen_explain",
    title: "Oryxgen AI: Tanlangan matnni tushuntirish",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "oryxgen_summarize_page",
    title: "Oryxgen AI: Ushbu sahifani tahlil qilish",
    contexts: ["page"],
  });
  chrome.storage.local.get(["apiUrl", "selectedModel"], (data) => {
    if (!data.apiUrl) chrome.storage.local.set({ apiUrl: "https://oryxgen-api.onrender.com" });
    if (!data.selectedModel) chrome.storage.local.set({ selectedModel: "claude-sonnet-5.5" });
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "oryxgen_explain" || info.menuItemId === "oryxgen_summarize_page") {
    chrome.action.openPopup?.();
  }
});
`,
  content: `// Oryxgen AI — Browser Content Script
(() => {
  const pageErrors = [];
  window.addEventListener("error", (event) => {
    pageErrors.push({
      message: event.message,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      time: new Date().toISOString(),
    });
    if (pageErrors.length > 20) pageErrors.shift();
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPageContext") {
      const selection = window.getSelection() ? window.getSelection().toString().trim() : "";
      const clone = document.body ? document.body.cloneNode(true) : null;
      if (clone) {
        clone.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
      }
      const rawText = clone ? clone.innerText || clone.textContent || "" : "";
      const cleanedText = rawText.replace(/\\s+/g, " ").trim().slice(0, 16000);

      sendResponse({
        ok: true,
        url: window.location.href,
        title: document.title,
        selection,
        pageText: cleanedText,
        detectedErrors: pageErrors,
      });
      return true;
    }

    if (request.action === "clickElement") {
      const el = document.querySelector(request.selector);
      if (el) {
        el.click();
        sendResponse({ ok: true, message: "Clicked: " + request.selector });
      } else {
        sendResponse({ ok: false, error: "Element not found" });
      }
      return true;
    }

    if (request.action === "fillInput") {
      const el = document.querySelector(request.selector);
      if (el) {
        el.value = request.value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false });
      }
      return true;
    }

    if (request.action === "scroll") {
      const dy = request.direction === "up" ? -(request.amount || 400) : (request.amount || 400);
      window.scrollBy({ top: dy, behavior: "smooth" });
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });
})();
`,
  popupHtml: `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oryxgen AI Extension</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="app-container">
    <header class="header">
      <div class="brand">
        <div class="logo-orb"></div>
        <span class="brand-title">Oryxgen AI</span>
        <span class="status-badge" id="statusBadge">Live</span>
      </div>
      <div class="model-select-wrapper">
        <select id="modelSelect" class="model-select" title="Modelni tanlang">
          <option value="claude-sonnet-5.5">Claude Sonnet 5.5</option>
          <option value="claude-opus-5.5">Claude Opus 5.5</option>
          <option value="nvidia/nemotron-3-ultra-550b-a55b">Nemotron 3 Ultra 550B</option>
          <option value="nvidia/nemotron-3-super-120b-a12b">Nemotron 3 Super 120B</option>
          <option value="deepseek-ai/deepseek-v4.1-flash">DeepSeek V4.1 Flash</option>
          <option value="google/gemma-4-31b-it">Google Gemma 4 31B</option>
          <option value="gpt-6-astra">GPT-6 Astra</option>
        </select>
      </div>
    </header>

    <div class="quick-actions">
      <button class="pill-btn" id="btnSummarize">Sahifani tahlil</button>
      <button class="pill-btn" id="btnFindErrors">Xatolarni topish</button>
      <button class="pill-btn" id="btnExtract">Matnni olish</button>
      <button class="pill-btn" id="btnClear">Tozalash</button>
    </div>

    <div class="tab-context" id="tabContext">
      <span class="tab-label">Joriy sahifa:</span>
      <span class="tab-title" id="tabTitle">Yuklanmoqda...</span>
    </div>

    <main class="chat-feed" id="chatFeed">
      <div class="message assistant welcome">
        <div class="msg-header">Oryxgen AI</div>
        <div class="msg-body">
          Assalomu alaykum! Men Oryxgen AI brauzer yordamchisiman. Ushbu sahifa bo'yicha savol bering yoki harakat buyuring.
        </div>
      </div>
    </main>

    <footer class="footer">
      <form id="chatForm" class="chat-form">
        <textarea id="userInput" class="chat-input" rows="2" placeholder="Savol yoki buyruq yozing..."></textarea>
        <button type="submit" id="sendBtn" class="send-btn">Yuborish</button>
      </form>
    </footer>
  </div>
  <script src="popup.js"></script>
</body>
</html>
`,
  popupCss: `* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
body { width: 440px; height: 580px; background-color: #090a0f; color: #e2e8f0; overflow: hidden; }
.app-container { display: flex; flex-direction: column; height: 100%; }
.header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(15, 23, 42, 0.75); border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.brand { display: flex; align-items: center; gap: 8px; }
.logo-orb { width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #00f0ff, #3b82f6); }
.brand-title { font-size: 14px; font-weight: 700; color: #ffffff; }
.status-badge { font-size: 10px; padding: 2px 6px; border-radius: 999px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
.model-select { background: #111827; color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; padding: 5px 8px; font-size: 11px; outline: none; }
.quick-actions { display: flex; gap: 6px; padding: 8px 12px; background: #0b0f19; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.pill-btn { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); color: #cbd5e1; padding: 5px 9px; border-radius: 6px; font-size: 11px; cursor: pointer; }
.pill-btn:hover { background: rgba(0, 240, 255, 0.1); color: #00f0ff; border-color: rgba(0, 240, 255, 0.3); }
.tab-context { display: flex; gap: 6px; padding: 6px 12px; background: rgba(2, 6, 23, 0.6); font-size: 11px; }
.tab-label { color: #64748b; font-weight: 600; }
.tab-title { color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-feed { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.message { border-radius: 8px; padding: 9px 12px; font-size: 12.5px; line-height: 1.5; max-width: 92%; }
.message.user { align-self: flex-end; background: #1e293b; color: #f1f5f9; }
.message.assistant { align-self: flex-start; background: #0f172a; border: 1px solid rgba(0, 240, 255, 0.15); color: #e2e8f0; }
.msg-header { font-size: 10.5px; font-weight: 700; color: #00f0ff; margin-bottom: 4px; }
.footer { padding: 10px 12px; background: #0b0f19; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.chat-form { display: flex; gap: 8px; }
.chat-input { flex: 1; background: #111827; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; color: #f8fafc; padding: 8px 10px; font-size: 12px; resize: none; outline: none; }
.send-btn { background: #00f0ff; border: none; border-radius: 8px; color: #020617; padding: 0 14px; font-weight: 700; cursor: pointer; }
`,
  popupJs: `const API_BASE = "https://oryxgen-api.onrender.com";
let currentTabContext = null;
const conversationHistory = [];
const modelSelect = document.getElementById("modelSelect");
const tabTitleEl = document.getElementById("tabTitle");
const chatFeed = document.getElementById("chatFeed");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      tabTitleEl.textContent = tab.title || "Brauzer sahifasi";
      chrome.tabs.sendMessage(tab.id, { action: "getPageContext" }, (res) => {
        if (!chrome.runtime.lastError && res) currentTabContext = res;
      });
    }
  } catch (_) {}
});

function appendMessage(role, text) {
  const el = document.createElement("div");
  el.className = "message " + role;
  el.innerHTML = '<div class="msg-header">' + (role === "user" ? "Siz" : "Oryxgen AI") + '</div><div class="msg-body">' + text + '</div>';
  chatFeed.appendChild(el);
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;
  userInput.value = "";
  appendMessage("user", text);
  conversationHistory.push({ role: "user", content: text });

  const aiEl = document.createElement("div");
  aiEl.className = "message assistant";
  aiEl.innerHTML = '<div class="msg-header">Oryxgen AI</div><div class="msg-body">Javob tayyorlanmoqda...</div>';
  chatFeed.appendChild(aiEl);
  chatFeed.scrollTop = chatFeed.scrollHeight;

  try {
    const res = await fetch(API_BASE + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelSelect.value,
        messages: [
          { role: "system", content: "Siz Oryxgen AI Chrome yordamchisisiz. Sahifa konteksti: " + (currentTabContext?.pageText?.slice(0, 4000) || "Mavjud emas") },
          ...conversationHistory
        ]
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "Javob olinmadi.";
    aiEl.querySelector(".msg-body").textContent = reply;
    conversationHistory.push({ role: "assistant", content: reply });
  } catch (err) {
    aiEl.querySelector(".msg-body").textContent = "Xatolik: " + err.message;
  }
});
`,
  readme: `# Oryxgen AI Chrome Extension
1. chrome://extensions oching
2. "Developer mode" ni yoqing
3. "Load unpacked" tugmasini bosib ushbu papkani tanlang!
`,
};

export default function AppsDownloadModal({
  isOpen,
  onClose,
  initialTab = "extension",
  onOpenMcpModal,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);
  const [downloadingExt, setDownloadingExt] = useState(false);

  if (!isOpen) return null;

  // Real, functioning MCP configuration using live SSE endpoint
  const backendApiUrl = (
    import.meta.env.VITE_API_URL || "https://oryxgen-api.onrender.com"
  ).replace(/\/$/, "");
  const currentToken =
    typeof window !== "undefined"
      ? localStorage.getItem("oryxgen_auth_token") || ""
      : "";
  const tokenQuery = currentToken ? `?token=${currentToken}` : "";
  const mcpSseUrl = `${backendApiUrl}/api/mcp/sse${tokenQuery}`;

  const claudeConfigText = JSON.stringify(
    {
      mcpServers: {
        "oryxgen-ai": {
          url: mcpSseUrl,
          type: "sse",
        },
      },
    },
    null,
    2
  );

  const handleCopyClaudeConfig = () => {
    navigator.clipboard?.writeText(claudeConfigText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Triple-layer infallible extension download
  const handleDownloadExtension = async (e) => {
    e?.preventDefault();
    setDownloadingExt(true);

    const triggerBlob = (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "oryxgen-extension.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 6000);
    };

    // Layer 1: Fetch static from CDN / site
    try {
      const res = await fetch("/download/oryxgen-extension.zip");
      const cType = res.headers.get("content-type") || "";
      if (res.ok && (cType.includes("zip") || cType.includes("octet-stream"))) {
        const blob = await res.blob();
        triggerBlob(blob);
        setDownloadingExt(false);
        return;
      }
    } catch (_) {}

    // Layer 2: Fetch directly from Render backend streaming endpoint
    try {
      const res = await fetch(`${backendApiUrl}/download/oryxgen-extension.zip`);
      if (res.ok) {
        const blob = await res.blob();
        triggerBlob(blob);
        setDownloadingExt(false);
        return;
      }
    } catch (_) {}

    // Layer 3: Instant client-side JSZip in-memory generation (Guaranteed 100% success)
    try {
      const zip = new JSZip();
      zip.file("manifest.json", EXTENSION_FILES.manifest);
      zip.file("background.js", EXTENSION_FILES.background);
      zip.file("content.js", EXTENSION_FILES.content);
      zip.file("popup.html", EXTENSION_FILES.popupHtml);
      zip.file("popup.css", EXTENSION_FILES.popupCss);
      zip.file("popup.js", EXTENSION_FILES.popupJs);
      zip.file("README.md", EXTENSION_FILES.readme);

      const blob = await zip.generateAsync({ type: "blob" });
      triggerBlob(blob);
    } catch (err) {
      console.error("[Extension Download Error]:", err);
      window.location.href = `${backendApiUrl}/download/oryxgen-extension.zip`;
    } finally {
      setDownloadingExt(false);
    }
  };

  return (
    <div className="download-modal-overlay" onClick={onClose}>
      <div className="download-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="download-modal-header">
          <div className="download-modal-brand">
            <div className="download-orb"></div>
            <div>
              <h3>Ilovalar, Extension & Integratsiyalar</h3>
              <p>Oryxgen AI imkoniyatlarini brauzer, kompyuter va Telegram-da ishlating</p>
            </div>
          </div>
          <button type="button" className="download-close-btn" onClick={onClose} title="Yopish">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="download-tabs-nav">
          <button
            type="button"
            className={`download-tab-btn ${activeTab === "extension" ? "active" : ""}`}
            onClick={() => setActiveTab("extension")}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
              <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
              <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
              <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
            </svg>
            <span>Chrome Extension</span>
          </button>

          <button
            type="button"
            className={`download-tab-btn ${activeTab === "desktop" ? "active" : ""}`}
            onClick={() => setActiveTab("desktop")}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Desktop Ilova</span>
          </button>

          <button
            type="button"
            className={`download-tab-btn ${activeTab === "telegram" ? "active" : ""}`}
            onClick={() => setActiveTab("telegram")}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <span>Telegram Bot</span>
          </button>

          <button
            type="button"
            className={`download-tab-btn ${activeTab === "claude" ? "active" : ""}`}
            onClick={() => setActiveTab("claude")}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>Claude & MCP</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="download-modal-body">
          {/* TAB 1: Chrome Extension */}
          {activeTab === "extension" && (
            <div className="tab-pane">
              <div className="download-hero-card">
                <div className="hero-info">
                  <h4>Oryxgen AI — Chrome Brauzer Extension</h4>
                  <p>
                    Brauzeringizda har qanday veb-sahifani AI orqali tahlil qiling, konsol va kod xatolarini bir zumda toping,
                    matnlarni tushuntirib bering va avtomatlashtiring.
                  </p>
                </div>
                <button
                  type="button"
                  className="download-primary-btn"
                  onClick={handleDownloadExtension}
                  disabled={downloadingExt}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{downloadingExt ? "Yuklanmoqda..." : "Extensionni Yuklab Olish (.zip)"}</span>
                </button>
              </div>

              <div className="install-steps-section">
                <h5 className="steps-title">O'rnatish Qo'llanmasi (4 qadam, 30 soniya):</h5>
                <ol className="install-steps-list">
                  <li>
                    <span className="step-num">1</span>
                    <div className="step-content">
                      <strong>Faylni yuklab oling va arxivdan chiqaring</strong>
                      <p>Yuqoridagi tugma orqali <code>oryxgen-extension.zip</code> faylini yuklab olib, qulay papkaga extract qiling.</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    <div className="step-content">
                      <strong>Chrome kengaytmalar sahifasini oching</strong>
                      <p>Google Chrome brauzerida yangi tab ochib, manzil satriga <code>chrome://extensions</code> deb yozing va Enter bosing.</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    <div className="step-content">
                      <strong>Developer mode (Dasturchi rejimi)ni yoqing</strong>
                      <p>Sahifaning yuqori o'ng burchagidagi <strong>"Developer mode"</strong> tugmasini faollashtiring.</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">4</span>
                    <div className="step-content">
                      <strong>"Load unpacked" tugmasini bosing</strong>
                      <p>Chap yuqoridagi <strong>"Load unpacked"</strong> tugmasini bosib, arxivdan chiqarilgan papkani tanlang.</p>
                    </div>
                  </li>
                </ol>
                <div className="install-tip-card">
                  <span className="tip-badge">Tayyor!</span>
                  <span>Endi brauzer toolbarida Oryxgen AI belgisini pin qilib qo'yishingiz va istalgan saytda foydalanishingiz mumkin.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Desktop App */}
          {activeTab === "desktop" && (
            <div className="tab-pane">
              <div className="download-hero-card">
                <div className="hero-info">
                  <h4>Oryxgen AI — Autonomous Desktop App</h4>
                  <p>
                    Windows kompyuteringiz uchun rasmiy avtonom ilova. Kompyuterdagi fayllar, PowerShell terminal va
                    Computer Use (sichqoncha, klaviatura, skrinshot) vositalari bilan bevosita ishlaydi.
                  </p>
                </div>
                <a
                  href="/download/OryxgenSetup.exe"
                  download="OryxgenSetup.exe"
                  className="download-primary-btn"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>OryxgenSetup.exe ni Yuklab Olish</span>
                </a>
              </div>

              <div className="install-steps-section">
                <h5 className="steps-title">O'rnatish va Foydalanish Bo'yicha Maslahatlar:</h5>
                <ul className="desktop-features-list">
                  <li>
                    <div className="feature-icon-box">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                    </div>
                    <div>
                      <strong>PowerShell & Native Terminal</strong>
                      <p>AI kompyuteringizda buyruqlarni real vaqt rejimida bajarishi va natijasini ko'rishi mumkin.</p>
                    </div>
                  </li>
                  <li>
                    <div className="feature-icon-box">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div>
                      <strong>To'g'ridan-to'g'ri Fayl Tizimi</strong>
                      <p>Fayllarni o'qish, tahrirlash, kod yozish va papkalarni boshqarish to'liq integratsiya qilingan.</p>
                    </div>
                  </li>
                  <li>
                    <div className="feature-icon-box">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    </div>
                    <div>
                      <strong>Windows SmartScreen Eslatmasi</strong>
                      <p>Agar "Windows protected your PC" ogohlantirishi chiqsa, <strong>{'"More info" \u2192 "Run anyway"'}</strong> tugmasini bosing.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: Telegram Bot */}
          {activeTab === "telegram" && (
            <div className="tab-pane">
              <div className="download-hero-card">
                <div className="hero-info">
                  <h4>Oryxgen AI — Telegram Bot Integratsiyasi</h4>
                  <p>
                    Oryxgen AI platformasidagi barcha 80+ modellarni bevosita Telegram orqali, suhbat xotirasi va to'liq kontekst bilan ishlating.
                  </p>
                </div>
              </div>

              <div className="install-steps-section">
                <h5 className="steps-title">Telegram Botni Ishga Tushirish Qo'llanmasi (3 qadam):</h5>
                <ol className="install-steps-list">
                  <li>
                    <span className="step-num">1</span>
                    <div className="step-content">
                      <strong>@BotFather orqali bot yarating:</strong>
                      <p>Telegram-da <code>@BotFather</code> ga <code>/newbot</code> yuborib yangi bot oching va API tokenini oling.</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    <div className="step-content">
                      <strong>Botni token bilan ishga tushiring:</strong>
                      <p>Terminal yoki serveringizda quyidagi buyruqni bering:</p>
                      <pre className="code-snippet-box"><code>TELEGRAM_BOT_TOKEN="SIZNING_BOT_TOKENINGIZ" node telegram-bot/bot.js</code></pre>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    <div className="step-content">
                      <strong>Telegram orqali 80+ modellardan foydalaning:</strong>
                      <p>Botingizga <code>/model</code> buyrug'ini yuborib istalgan modelni tanlang, savollaringizni yozing!</p>
                    </div>
                  </li>
                </ol>

                <h5 className="steps-title" style={{ marginTop: "12px" }}>Asosiy Bot Buyruqlari:</h5>
                <div className="commands-grid">
                  <div className="command-card">
                    <code>/model</code>
                    <span>Claude, Nemotron, DeepSeek, GPT-6 modellari orasidan tanlash.</span>
                  </div>
                  <div className="command-card">
                    <code>/clear</code>
                    <span>Suhbat xotirasini tozalab yangi mavzu boshlash.</span>
                  </div>
                  <div className="command-card">
                    <code>/status</code>
                    <span>Faol model va xotira holatini ko'rish.</span>
                  </div>
                  <div className="command-card">
                    <code>/start</code>
                    <span>Bot yo'riqnomasi va xush kelibsiz xabari.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Claude Desktop & MCP */}
          {activeTab === "claude" && (
            <div className="tab-pane">
              <div className="download-hero-card">
                <div className="hero-info">
                  <h4>Claude Desktop & Claude.ai Integratsiyasi</h4>
                  <p>
                    Oryxgen AI MCP Server orqali o'zingizning Claude ilovangizga barcha 80+ modellarni va vositalarni ulang.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="download-primary-btn"
                    onClick={handleCopyClaudeConfig}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{copied ? "Nusxalandi!" : "Claude MCP Konfiguratsiyasini Nusxalash"}</span>
                  </button>
                  {onOpenMcpModal && (
                    <button
                      type="button"
                      className="download-secondary-btn"
                      onClick={() => {
                        onClose();
                        onOpenMcpModal();
                      }}
                    >
                      Batafsil MCP Gateway Oynasini Ochish
                    </button>
                  )}
                </div>
              </div>

              <div className="install-steps-section">
                <h5 className="steps-title">Claude Desktop-ga ulash bo'yicha ko'rsatma:</h5>
                <ol className="install-steps-list">
                  <li>
                    <span className="step-num">1</span>
                    <div className="step-content">
                      <strong>Sozlamalar faylini oching:</strong>
                      <p>Windows-da: <code>%APPDATA%\Claude\claude_desktop_config.json</code> faylini oching.</p>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">2</span>
                    <div className="step-content">
                      <strong>Konfiguratsiyani joylashtiring:</strong>
                      <pre className="code-snippet-box"><code>{claudeConfigText}</code></pre>
                    </div>
                  </li>
                  <li>
                    <span className="step-num">3</span>
                    <div className="step-content">
                      <strong>Claude Desktop-ni qayta ishga tushiring:</strong>
                      <p>O'ng pastki burchakda 🔨 belgisi paydo bo'ladi va Oryxgen AI serveriga to'g'ridan-to'g'ri ulanadi!</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
