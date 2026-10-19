import { useState } from "react";
import "./AppsDownloadModal.css";

export default function AppsDownloadModal({ isOpen, onClose, initialTab = "extension" }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const claudeConfigText = JSON.stringify(
    {
      mcpServers: {
        "oryxgen-ai": {
          command: "node",
          args: ["C:\\Users\\user\\Desktop\\OrygenAI\\cli\\bin\\oryxgen.js", "--mcp"],
          env: {
            ORYXGEN_BASE_URL: "https://oryxgen-api.onrender.com/v1",
            ORYXGEN_API_KEY: "oryx_live_demo_free_access",
          },
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
                <a
                  href="/download/oryxgen-extension.zip"
                  download="oryxgen-extension.zip"
                  className="download-primary-btn"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Extensionni Yuklab Olish (.zip)</span>
                </a>
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
                      <p>Agar "Windows protected your PC" ogohlantirishi chiqsa, <strong>{"\"More info\" \u2192 \"Run anyway\""}</strong> tugmasini bosing.</p>
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
                  <h4>Oryxgen AI — Telegram Bot</h4>
                  <p>
                    Oryxgen AI platformasidagi barcha 80+ modellarni bevosita Telegram orqali suhbat xotirasi bilan ishlating.
                  </p>
                </div>
                <a
                  href="https://t.me/OryxgenAIBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-primary-btn telegram-btn"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>Telegram Botni Ochish</span>
                </a>
              </div>

              <div className="install-steps-section">
                <h5 className="steps-title">Bot Buyruqlari va Imkoniyatlari:</h5>
                <div className="commands-grid">
                  <div className="command-card">
                    <code>/model</code>
                    <span>Inline tugmalar orqali istalgan AI modelini (Claude, Nemotron, DeepSeek, GPT-6) tanlash.</span>
                  </div>
                  <div className="command-card">
                    <code>/clear</code>
                    <span>Suhbat xotirasini tozalab, yangi mavzu boshlash.</span>
                  </div>
                  <div className="command-card">
                    <code>/status</code>
                    <span>Hozirgi faol model va xotira holatini ko'rish.</span>
                  </div>
                  <div className="command-card">
                    <code>/start</code>
                    <span>Bot bilan tanishish va yo'riqnomani qayta o'qish.</span>
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
                    O'zingizning Claude akkauntingizga Oryxgen AI modellarini va kompyuter vositalarini ulash.
                  </p>
                </div>
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
              </div>

              <div className="install-steps-section">
                <h5 className="steps-title">Claude Desktop-ga ulash bo'yicha ko'rsatma:</h5>
                <ol className="install-steps-list">
                  <li>
                    <span className="step-num">1</span>
                    <div className="step-content">
                      <strong>Sozlamalar faylini oching:</strong>
                      <p>Windows-da: <code>%APPDATA%\Claude\claude_desktop_config.json</code> faylini matn muharririda oching.</p>
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
                      <strong>Claude Desktop-ni qayta ishga tushiring (Restart):</strong>
                      <p>O'ng pastki burchakda 🔨 belgisi paydo bo'ladi va barcha 80+ modellar hamda fayl/terminal buyruqlari ishlaydi!</p>
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
