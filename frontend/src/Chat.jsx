import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  checkBackendHealth,
  clearAuthSession,
  fetchCatalog,
  getStoredUser,
  saveUserChat,
  streamChat,
} from "./api";
import AuthModal from "./AuthModal";
import LoadingScreen from "./LoadingScreen";
import { CompanyLogo } from "./Logos";
import "./Chat.css";

const DEFAULT_MODEL = "claude-4.6-opus";

// Quick Prompt Starters
const PROMPT_STARTERS = [
  { label: "🚀 Python Skript", prompt: "Python-da tezkor web-scraper yoki asinxron bot yozib ber." },
  { label: "🧠 Chuqur Fikrlash", prompt: "Kvant kompyuterlari klassik shifrlashni qanday o'zgartiradi? Bosqichma-bosqich tahlil qil." },
  { label: "💻 React Komponent", prompt: "Zamonaviy glassmorphism dark-mode card komponenti yasab ber." },
  { label: "📈 Biznes Reja", prompt: "SaaS loyihasi uchun 2026-yilgi monetizatsiya va marketing strategiyasi." },
];

export default function Chat() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "Assalomu alaykum! Men **Oryxgen AI** universal intellektual yordamchisiman. Sizga bugun qanday yordam bera olaman?",
      thinking: "",
      model: DEFAULT_MODEL,
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentThinking, setCurrentThinking] = useState("");
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  const [thinkingTime, setThinkingTime] = useState(0);

  // UI States
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [searchModel, setSearchModel] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [chats, setChats] = useState([
    { id: "chat-1", title: "Yangi suhbat", model: DEFAULT_MODEL, messages: [] },
  ]);
  const [activeChatId, setActiveChatId] = useState("chat-1");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBackendLoading, setIsBackendLoading] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const thinkingTimerRef = useRef(null);

  // Initialize catalog and backend health check
  useEffect(() => {
    let mounted = true;
    async function init() {
      const health = await checkBackendHealth();
      if (mounted) {
        setIsBackendLoading(false);
      }
      try {
        const cat = await fetchCatalog();
        if (mounted && cat.models?.length) {
          setModels(cat.models);
        }
      } catch {
        // use fallback
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentThinking]);

  // Handle thinking timer
  useEffect(() => {
    if (isStreaming && currentThinking) {
      thinkingTimerRef.current = setInterval(() => {
        setThinkingTime((t) => Number((t + 0.1).toFixed(1)));
      }, 100);
    } else {
      clearInterval(thinkingTimerRef.current);
    }
    return () => clearInterval(thinkingTimerRef.current);
  }, [isStreaming, currentThinking]);

  const activeModelMeta = models.find((m) => m.id === selectedModel) || {
    id: selectedModel,
    displayName: selectedModel.toUpperCase(),
    company: "AI",
    logoKey: selectedModel.includes("claude") ? "anthropic" : "openai",
    capability: "reason",
    isPremium: selectedModel.includes("claude"),
  };

  const handleSendMessage = async (customText = null) => {
    const text = (customText || input).trim();
    if (!text || isStreaming) return;

    setInput("");
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const newMessages = [
      ...messages,
      { id: userMsgId, role: "user", content: text },
    ];
    setMessages(newMessages);
    setIsStreaming(true);
    setCurrentThinking("");
    setThinkingTime(0);
    setThinkingExpanded(true);

    let accumulatedContent = "";
    let accumulatedThinking = "";

    try {
      await streamChat(
        selectedModel,
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        (delta) => {
          accumulatedContent += delta;
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== assistantMsgId);
            return [
              ...filtered,
              {
                id: assistantMsgId,
                role: "assistant",
                content: accumulatedContent,
                thinking: accumulatedThinking,
                model: selectedModel,
              },
            ];
          });
        },
        (thinkDelta) => {
          accumulatedThinking += thinkDelta;
          setCurrentThinking(accumulatedThinking);
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== assistantMsgId);
            return [
              ...filtered,
              {
                id: assistantMsgId,
                role: "assistant",
                content: accumulatedContent,
                thinking: accumulatedThinking,
                model: selectedModel,
              },
            ];
          });
        },
        activeChatId
      );

      // Save chat title if first message
      if (messages.length <= 1) {
        const title = text.slice(0, 28) + (text.length > 28 ? "..." : "");
        setChats((prev) =>
          prev.map((c) => (c.id === activeChatId ? { ...c, title } : c))
        );
        saveUserChat({ id: activeChatId, title, model: selectedModel });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Xatolik yuz berdi:** ${err.message || "Modelga ulanib bo'lmadi"}. Iltimos, boshqa modelni tanlang yoki qayta urinib ko'ring.`,
          model: selectedModel,
        },
      ]);
    } finally {
      setIsStreaming(false);
      setCurrentThinking("");
    }
  };

  const handleNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newChat = { id: newId, title: "Yangi suhbat", model: selectedModel, messages: [] };
    setChats([newChat, ...chats]);
    setActiveChatId(newId);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `**${activeModelMeta.displayName}** faollashtirildi. Sizga qanday yordam bera olaman?`,
        model: selectedModel,
      },
    ]);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const handleCopyCode = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Filter models
  const filteredModels = models.filter((m) => {
    const matchSearch =
      m.displayName.toLowerCase().includes(searchModel.toLowerCase()) ||
      m.company.toLowerCase().includes(searchModel.toLowerCase()) ||
      m.id.toLowerCase().includes(searchModel.toLowerCase());

    if (!matchSearch) return false;
    if (activeCategory === "all") return true;
    if (activeCategory === "claude") return m.company === "Anthropic" || m.isPremium;
    if (activeCategory === "openai") return m.company === "OpenAI";
    if (activeCategory === "deepseek") return m.company === "DeepSeek";
    if (activeCategory === "grok") return m.company === "xAI";
    if (activeCategory === "gemini") return m.company === "Google";
    if (activeCategory === "llama") return m.company === "Meta";
    if (activeCategory === "qwen") return m.company === "Alibaba";
    if (activeCategory === "reason") return m.capability === "reason" || m.tags?.includes("thinking");
    if (activeCategory === "code") return m.capability === "code" || m.tags?.includes("code");
    return true;
  });

  // Render markdown helper
  const renderMessageContent = (text) => {
    if (!text) return null;
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        const language = lines[0].trim() || "code";
        const code = lines.slice(1).join("\n") || lines[0];
        const blockId = `code-${index}-${Math.random()}`;

        return (
          <div key={index} className="chat-code-block">
            <div className="chat-code-header">
              <span className="chat-code-lang">{language}</span>
              <button
                type="button"
                className="chat-code-copy-btn"
                onClick={() => handleCopyCode(code, blockId)}
              >
                {copiedCodeId === blockId ? "✓ Nusxalandi" : "Nusxa olish"}
              </button>
            </div>
            <pre className="chat-code-content">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Simple markdown bold/italic/headings
      const formattedLines = part.split("\n").map((line, lIdx) => {
        if (line.startsWith("### ")) {
          return <h4 key={lIdx} className="chat-md-h4">{line.slice(4)}</h4>;
        }
        if (line.startsWith("## ")) {
          return <h3 key={lIdx} className="chat-md-h3">{line.slice(3)}</h3>;
        }
        if (line.startsWith("# ")) {
          return <h2 key={lIdx} className="chat-md-h2">{line.slice(2)}</h2>;
        }
        if (line.startsWith("- ")) {
          return <li key={lIdx} className="chat-md-li">{line.slice(2)}</li>;
        }
        return <p key={lIdx} className="chat-md-p">{line}</p>;
      });

      return <div key={index}>{formattedLines}</div>;
    });
  };

  if (isBackendLoading) {
    return <LoadingScreen message="Oryxgen AI xavfsiz neyrotarmog'i ishga tushirilmoqda..." />;
  }

  return (
    <div className="chat-app-layout">
      {/* Mobile Backdrop */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Link to="/" className="sidebar-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
            <span>Oryxgen<span className="logo-suffix">.ai</span></span>
          </Link>
          <button type="button" className="new-chat-btn" onClick={handleNewChat}>
            <span>+</span> Yangi suhbat
          </button>
        </div>

        {/* Chats History */}
        <div className="sidebar-chats-list">
          <div className="chats-section-title">Suhbatlar tarixi</div>
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chat-history-item ${c.id === activeChatId ? "active" : ""}`}
              onClick={() => {
                setActiveChatId(c.id);
                if (window.innerWidth <= 768) setSidebarOpen(false);
              }}
            >
              <span className="chat-item-icon">💬</span>
              <span className="chat-item-title">{c.title}</span>
            </button>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <Link to="/image" className="sidebar-nav-item">
            <span className="nav-icon">🎨</span>
            <span>Image Studio (Pollinations)</span>
          </Link>
          <Link to="/" className="sidebar-nav-item">
            <span className="nav-icon">⚡</span>
            <span>Vesper Landing</span>
          </Link>

          <div className="user-profile-bar">
            {currentUser ? (
              <div className="user-info-card">
                <div className="user-avatar-circle">
                  {currentUser.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="user-details">
                  <span className="user-name">{currentUser.name || "Foydalanuvchi"}</span>
                  <span className="user-email">{currentUser.email || currentUser.phone || "VIP Plan"}</span>
                </div>
                <button
                  type="button"
                  className="user-logout-btn"
                  title="Chiqish"
                  onClick={() => {
                    clearAuthSession();
                    setCurrentUser(null);
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="sidebar-auth-btn"
                onClick={() => setIsAuthOpen(true)}
              >
                Kirish / Ro'yxatdan o'tish
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        {/* Top Navbar */}
        <header className="chat-header">
          <div className="header-left">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Sidebar"
            >
              ☰
            </button>

            {/* Model Selector Pill */}
            <button
              type="button"
              className={`model-selector-pill ${activeModelMeta.isPremium ? "premium-pill" : ""}`}
              onClick={() => setIsModelModalOpen(true)}
            >
              <CompanyLogo name={activeModelMeta.logoKey} size={18} />
              <span className="model-name-text">{activeModelMeta.displayName}</span>
              {activeModelMeta.isPremium && <span className="luxury-badge">CLAUDE LUXURY</span>}
              <span className="model-chevron">▼</span>
            </button>
          </div>

          <div className="header-right">
            <div className="live-pool-badge" title="OpenRouter live free model pool faol">
              <span className="live-dot" />
              <span>200+ Live Models</span>
            </div>
            <Link to="/image" className="header-action-link">
              Tasvir Yaratish
            </Link>
          </div>
        </header>

        {/* Message Feed */}
        <div className="chat-messages-container">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message-row ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === "user" ? (
                  <div className="user-avatar-mark">Siz</div>
                ) : (
                  <CompanyLogo name={activeModelMeta.logoKey} size={22} />
                )}
              </div>

              <div className="message-body">
                {msg.role === "assistant" && (
                  <div className="message-header-info">
                    <span className="message-sender-name">{activeModelMeta.displayName}</span>
                    {activeModelMeta.isPremium && <span className="claude-tag">Anthropic Flagship</span>}
                  </div>
                )}

                {/* Animated Thinking Accordion */}
                {msg.thinking && (
                  <div className="thinking-accordion">
                    <div
                      className="thinking-header"
                      onClick={() => setThinkingExpanded(!thinkingExpanded)}
                    >
                      <span className="thinking-spinner" />
                      <span className="thinking-title">
                        Fikrlash jarayoni {thinkingTime > 0 ? `(${thinkingTime}s)` : ""}
                      </span>
                      <span className="thinking-toggle-icon">
                        {thinkingExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                    {thinkingExpanded && (
                      <div className="thinking-content">
                        <pre>{msg.thinking}</pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Message Text */}
                <div className="message-text-content">
                  {renderMessageContent(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming Thinking Live Block */}
          {isStreaming && currentThinking && !messages.some((m) => m.thinking === currentThinking) && (
            <div className="chat-message-row assistant">
              <div className="message-avatar">
                <CompanyLogo name={activeModelMeta.logoKey} size={22} />
              </div>
              <div className="message-body">
                <div className="thinking-accordion pulse-think">
                  <div
                    className="thinking-header"
                    onClick={() => setThinkingExpanded(!thinkingExpanded)}
                  >
                    <span className="thinking-spinner live-spin" />
                    <span className="thinking-title">
                      {activeModelMeta.displayName} chuqur fikrlamoqda... ({thinkingTime}s)
                    </span>
                  </div>
                  {thinkingExpanded && (
                    <div className="thinking-content">
                      <pre>{currentThinking}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Starters */}
        {messages.length <= 1 && (
          <div className="prompt-starters-grid">
            {PROMPT_STARTERS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className="starter-chip"
                onClick={() => handleSendMessage(s.prompt)}
              >
                <span className="starter-label">{s.label}</span>
                <span className="starter-prompt">{s.prompt}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="chat-input-wrapper">
          <form
            className="chat-input-box"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <textarea
              ref={inputRef}
              className="chat-textarea"
              placeholder={`${activeModelMeta.displayName} ga istalgan savol yoki buyruq bering... (Shift+Enter yangi qator)`}
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            <button
              type="submit"
              className="chat-send-btn"
              disabled={!input.trim() || isStreaming}
              aria-label="Send"
            >
              {isStreaming ? (
                <span className="btn-spinner" />
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </form>
          <div className="input-footer-caption">
            Oryxgen AI xatolarga yo'l qo'yishi mumkin. Muhim ma'lumotlarni tekshiring. Barcha 200+ modellar bepul va live.
          </div>
        </div>
      </main>

      {/* 200+ Models Directory Modal */}
      {isModelModalOpen && (
        <div className="model-modal-backdrop" onClick={() => setIsModelModalOpen(false)}>
          <div className="model-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="model-modal-header">
              <div className="modal-header-text">
                <h3>Barcha AI Modellar Katalogi (200+)</h3>
                <p>Anthropic Claude Luxury, OpenAI GPT-5, DeepSeek R1, Grok 4.6, Gemini 3.0 va barcha erkin modellar</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModelModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {/* Model Search & Category Pills */}
            <div className="modal-search-box">
              <input
                type="text"
                placeholder="Model nomi yoki kompaniya bo'yicha qidiring (masalan: Claude 4.6, GPT-5, DeepSeek R1)..."
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-category-tabs">
              {[
                { id: "all", label: "Barchasi" },
                { id: "claude", label: "👑 Claude Luxury" },
                { id: "openai", label: "OpenAI" },
                { id: "deepseek", label: "DeepSeek" },
                { id: "grok", label: "xAI Grok" },
                { id: "gemini", label: "Google Gemini" },
                { id: "llama", label: "Meta Llama" },
                { id: "qwen", label: "Alibaba Qwen" },
                { id: "reason", label: "🧠 Reasoning" },
                { id: "code", label: "💻 Coding" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`category-pill ${activeCategory === c.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Models Grid */}
            <div className="models-grid-scroll">
              {filteredModels.map((m) => (
                <div
                  key={m.id}
                  className={`model-card ${m.id === selectedModel ? "selected" : ""} ${
                    m.isPremium ? "premium-card" : ""
                  }`}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setIsModelModalOpen(false);
                  }}
                >
                  <div className="model-card-top">
                    <div className="model-card-logo">
                      <CompanyLogo name={m.logoKey} size={26} />
                    </div>
                    <div className="model-card-meta">
                      <div className="model-card-title-row">
                        <span className="model-card-name">{m.displayName}</span>
                        {m.isPremium && <span className="luxury-tag">CLAUDE LUXURY</span>}
                      </div>
                      <span className="model-card-company">{m.company}</span>
                    </div>
                  </div>

                  <p className="model-card-desc">{m.description}</p>

                  <div className="model-card-footer">
                    <span className="capability-tag">{m.capability.toUpperCase()}</span>
                    <span className="free-live-tag">LIVE & FREE</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}
