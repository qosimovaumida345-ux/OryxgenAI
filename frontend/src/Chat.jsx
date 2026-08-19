import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  checkBackendHealth,
  clearAuthSession,
  exchangeGoogleCode,
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

const SKILL_PRESETS = [
  {
    id: "default",
    name: "Standart Intellekt",
    description: "Aniq, lo'nda va to'liq ma'lumot beruvchi universal yordamchi.",
    systemPrompt: "Siz Oryxgen AI universal intellektual yordamchisisiz. Aniq, to'liq, professional va xatosiz javob bering.",
  },
  {
    id: "architect",
    name: "Senior Software Architect",
    description: "To'liq arxitektura, optimal kod, xavfsizlik va refaktoring.",
    systemPrompt: "You are a Principal Software Architect and Senior Full-Stack Engineer. Provide production-grade, clean, idiomatic code with robust error handling and high performance standards.",
  },
  {
    id: "reasoning",
    name: "Chuqur Mantiqiy Tahlilchi",
    description: "Bosqichma-bosqich isbotlash va murakkab muammolarni yechish.",
    systemPrompt: "Har bir savolga chuqur mulohaza, bosqichma-bosqich mantiqiy xulosalar va dalillarga asoslangan tahlil bilan javob bering.",
  },
  {
    id: "translator",
    name: "Professional Tarjimon",
    description: "O'zbek, Ingliz, Rus va 50+ tillar o'rtasida kontekstual tarjima.",
    systemPrompt: "Siz professional badiiy va texnik tarjimonsiz. Terminlarni aniq va tabiiy til grammatikasi bilan tarjima qiling.",
  },
];

export default function Chat() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentThinking, setCurrentThinking] = useState("");
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  const [thinkingTime, setThinkingTime] = useState(0);

  // System Prompt & Skill Creator State
  const [systemPrompt, setSystemPrompt] = useState(SKILL_PRESETS[0].systemPrompt);
  const [activeSkillId, setActiveSkillId] = useState("default");
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

  // MCP Info Modal
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);

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

  // Initialize catalog, backend health check, and handle Google OAuth callback
  useEffect(() => {
    let mounted = true;
    async function init() {
      // Check for Google OAuth callback code in URL
      const searchParams = new URLSearchParams(window.location.search);
      const googleCode = searchParams.get("code");
      if (googleCode) {
        try {
          const authRes = await exchangeGoogleCode(googleCode, `${window.location.origin}/app`);
          if (authRes.user && mounted) {
            setCurrentUser(authRes.user);
          }
        } catch (authErr) {
          console.warn("Google OAuth callback error:", authErr.message);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      await checkBackendHealth();
      if (mounted) {
        setIsBackendLoading(false);
      }
      try {
        const cat = await fetchCatalog();
        if (mounted && cat.models?.length) {
          setModels(cat.models);
        }
      } catch {
        /* fallback handled */
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
    company: "Anthropic",
    logoKey: "anthropic",
    capability: "reason",
    isPremium: true,
  };

  const handleSendMessage = async (customText = null) => {
    const text = (customText || input).trim();
    if (!text || isStreaming) return;

    setInput("");
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const newMessages = [
      ...messages,
      { id: userMsgId, role: "user", content: text, model: selectedModel },
    ];
    setMessages(newMessages);

    setIsStreaming(true);
    setCurrentThinking("");
    setThinkingTime(0);
    setThinkingExpanded(true);

    let assistantContent = "";
    let assistantThinking = "";

    try {
      await streamChat(
        {
          model: selectedModel,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          systemPrompt: systemPrompt || undefined,
        },
        // onContent
        (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.id === assistantMsgId) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: assistantContent, thinking: assistantThinking },
              ];
            }
            return [
              ...prev,
              {
                id: assistantMsgId,
                role: "assistant",
                content: assistantContent,
                thinking: assistantThinking,
                model: selectedModel,
              },
            ];
          });
        },
        // onThinking
        (thinkChunk) => {
          assistantThinking += thinkChunk;
          setCurrentThinking(assistantThinking);
        },
        // onDone
        () => {
          setIsStreaming(false);
          // Save to chat state
          const updatedChat = {
            id: activeChatId,
            title: newMessages[0]?.content.slice(0, 30) || "Suhbat",
            model: selectedModel,
            messages: [
              ...newMessages,
              {
                id: assistantMsgId,
                role: "assistant",
                content: assistantContent,
                thinking: assistantThinking,
                model: selectedModel,
              },
            ],
          };
          saveUserChat(updatedChat);
        },
        // onError
        (errMsg) => {
          setIsStreaming(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: `Xatolik: ${errMsg}`,
              model: selectedModel,
              isError: true,
            },
          ]);
        }
      );
    } catch (err) {
      setIsStreaming(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `Ulanish xatosi: ${err.message}`,
          model: selectedModel,
          isError: true,
        },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newChatObj = { id: newId, title: "Yangi suhbat", model: selectedModel, messages: [] };
    setChats([newChatObj, ...chats]);
    setActiveChatId(newId);
    setMessages([]);
    setCurrentThinking("");
    setSidebarOpen(false);
  };

  const copyCode = (codeStr, id) => {
    navigator.clipboard.writeText(codeStr);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const filteredModels = models.filter((m) => {
    const matchesSearch =
      m.displayName.toLowerCase().includes(searchModel.toLowerCase()) ||
      m.company.toLowerCase().includes(searchModel.toLowerCase()) ||
      m.id.toLowerCase().includes(searchModel.toLowerCase());

    if (!matchesSearch) return false;
    if (activeCategory === "all") return true;
    if (activeCategory === "claude") return m.company.toLowerCase().includes("anthropic");
    if (activeCategory === "openai") return m.company.toLowerCase().includes("openai");
    if (activeCategory === "deepseek") return m.company.toLowerCase().includes("deepseek");
    if (activeCategory === "google") return m.company.toLowerCase().includes("google");
    if (activeCategory === "reason") return m.capability === "reason" || m.tags?.includes("thinking");
    if (activeCategory === "code") return m.capability === "code";
    return true;
  });

  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        "oryxgen-ai": {
          url: "https://avg-ai-creator.site/api/mcp/sse",
          type: "sse",
        },
      },
    },
    null,
    2
  );

  const copyMcpConfig = () => {
    navigator.clipboard.writeText(mcpConfigJson);
    setMcpCopied(true);
    setTimeout(() => setMcpCopied(false), 2000);
  };

  if (isBackendLoading) {
    return <LoadingScreen message="Oryxgen AI ishga tushirilmoqda..." />;
  }

  return (
    <div className="chat-layout">
      {/* Sidebar */}
      <aside className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <img src="/Logo.png" alt="Oryxgen Logo" className="chat-brand-logo" />
            <span>Oryxgen<small>.ai</small></span>
          </Link>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Yopish"
          >
            ✕
          </button>
        </div>

        <button type="button" className="new-chat-btn" onClick={handleNewChat}>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Yangi suhbat
        </button>

        <div className="sidebar-section-title">Suhbatlar tarixi</div>
        <div className="chat-list">
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chat-list-item ${c.id === activeChatId ? "active" : ""}`}
              onClick={() => {
                setActiveChatId(c.id);
                setMessages(c.messages || []);
                setSelectedModel(c.model || DEFAULT_MODEL);
                setSidebarOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{c.title || "Suhbat"}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-tools">
          <button
            type="button"
            className="sidebar-tool-btn"
            onClick={() => setIsSkillModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            System Prompt & Ko'nikmalar
          </button>
          <button
            type="button"
            className="sidebar-tool-btn"
            onClick={() => setIsMcpModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <path d="M16 12l-4 4-4-4M12 8v7" />
            </svg>
            MCP Server (Claude / Cursor)
          </button>
          <Link to="/image" className="sidebar-tool-btn">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            Tasvir Studiyasi
          </Link>
        </div>

        <div className="sidebar-user-footer">
          {currentUser ? (
            <div className="user-profile-row">
              <img src={currentUser.avatar} alt="Avatar" className="user-avatar" />
              <div className="user-info-text">
                <div className="user-name">{currentUser.name}</div>
                <div className="user-sub">{currentUser.email || currentUser.phone}</div>
              </div>
              <button
                type="button"
                className="logout-icon-btn"
                onClick={() => {
                  clearAuthSession();
                  setCurrentUser(null);
                }}
                title="Chiqish"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="sidebar-login-btn"
              onClick={() => setIsAuthOpen(true)}
            >
              Kirish / Ro'yxatdan o'tish
            </button>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        {/* Top Navbar */}
        <header className="chat-navbar">
          <div className="navbar-left">
            <button
              type="button"
              className="burger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Menyu"
            >
              <span />
              <span />
              <span />
            </button>

            {/* Model Selector Pill */}
            <button
              type="button"
              className="model-selector-pill"
              onClick={() => setIsModelModalOpen(true)}
            >
              <div className="model-pill-logo">
                <CompanyLogo name={activeModelMeta.logoKey || activeModelMeta.company} size={17} />
              </div>
              <div className="model-pill-info">
                <span className="model-pill-name">{activeModelMeta.displayName}</span>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
          </div>

          <div className="navbar-right">
            <button
              type="button"
              className="nav-btn-action"
              onClick={() => setIsSkillModalOpen(true)}
              title="Custom System Prompt"
            >
              System Prompt
            </button>
            <button
              type="button"
              className="nav-btn-action"
              onClick={() => setIsMcpModalOpen(true)}
              title="Model Context Protocol Server"
            >
              MCP Gateway
            </button>
            <Link to="/image" className="nav-btn-action">
              Tasvir
            </Link>
            {!currentUser && (
              <button
                type="button"
                className="nav-btn-login"
                onClick={() => setIsAuthOpen(true)}
              >
                Kirish
              </button>
            )}
          </div>
        </header>

        {/* Message Stream Scrollview */}
        <div className="chat-messages-container">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="empty-logo-circle">
                <img src="/Logo.png" alt="Oryxgen Logo" className="empty-brand-logo" />
              </div>
              <h2>Oryxgen AI</h2>
              <p className="empty-sub">
                Tanlangan model: <strong>{activeModelMeta.displayName}</strong> ({activeModelMeta.company})
              </p>
              {systemPrompt && (
                <div className="active-system-pill">
                  Faol ko'rsatma: <span>{systemPrompt.slice(0, 70)}...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="messages-flow">
              {messages.map((m) => (
                <div key={m.id} className={`message-row ${m.role}`}>
                  <div className="message-avatar">
                    {m.role === "user" ? (
                      currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt="User" />
                      ) : (
                        <div className="user-fallback-avatar">U</div>
                      )
                    ) : (
                      <CompanyLogo name={activeModelMeta.logoKey || activeModelMeta.company} size={18} />
                    )}
                  </div>

                  <div className="message-bubble-wrapper">
                    {/* Collapsible Reasoning Thinking Accordion */}
                    {m.thinking && (
                      <div className="thinking-accordion">
                        <button
                          type="button"
                          className="thinking-toggle-header"
                          onClick={() => setThinkingExpanded(!thinkingExpanded)}
                        >
                          <div className="thinking-status-indicator">
                            <span className="pulse-dot" />
                            <span>Mantiqiy tahlil jarayoni</span>
                          </div>
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="currentColor"
                            style={{ transform: thinkingExpanded ? "rotate(180deg)" : "none" }}
                          >
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </button>
                        {thinkingExpanded && (
                          <div className="thinking-body">
                            <pre>{m.thinking}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="message-content">
                      {m.content.split("```").map((part, idx) => {
                        if (idx % 2 === 1) {
                          const lines = part.split("\n");
                          const lang = lines[0].trim() || "code";
                          const code = lines.slice(1).join("\n");
                          const codeId = `${m.id}-${idx}`;
                          return (
                            <div key={codeId} className="code-block-box">
                              <div className="code-block-header">
                                <span className="code-lang">{lang}</span>
                                <button
                                  type="button"
                                  className="copy-code-btn"
                                  onClick={() => copyCode(code, codeId)}
                                >
                                  {copiedCodeId === codeId ? "Nusxalandi" : "Nusxalash"}
                                </button>
                              </div>
                              <pre className="code-block-pre">
                                <code>{code}</code>
                              </pre>
                            </div>
                          );
                        }
                        return (
                          <div key={idx} className="text-prose">
                            {part}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Real-time streaming thinking placeholder */}
              {isStreaming && currentThinking && !messages.find((m) => m.thinking) && (
                <div className="message-row assistant streaming">
                  <div className="message-avatar">
                    <CompanyLogo name={activeModelMeta.logoKey || activeModelMeta.company} size={18} />
                  </div>
                  <div className="message-bubble-wrapper">
                    <div className="thinking-accordion">
                      <div className="thinking-toggle-header">
                        <div className="thinking-status-indicator">
                          <span className="pulse-dot active" />
                          <span>Fikrlanmoqda ({thinkingTime}s)...</span>
                        </div>
                      </div>
                      <div className="thinking-body">
                        <pre>{currentThinking}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <div className="input-box-wrapper">
            <textarea
              ref={inputRef}
              className="chat-textarea"
              placeholder={`${activeModelMeta.displayName} ga savol yoki buyruq yozing... (Shift+Enter yangi qator)`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              type="button"
              className="send-btn"
              onClick={() => handleSendMessage()}
              disabled={!input.trim() || isStreaming}
              aria-label="Yuborish"
            >
              {isStreaming ? (
                <div className="spinner-dot" />
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Model Selection Modal */}
      {isModelModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModelModalOpen(false)}>
          <div className="models-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>200+ AI Modellari Katalogi</h3>
                <p>Oryxgen AI orqali integratsiya qilingan barcha modellar</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsModelModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-search-box">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Model nomi yoki kompaniya bo'yicha qidiring (masalan: Claude, GPT, DeepSeek, Grok)..."
                value={searchModel}
                onChange={(e) => setSearchModel(e.target.value)}
                autoFocus
              />
            </div>

            <div className="modal-category-filters">
              {[
                { id: "all", label: "Barchasi (200+)" },
                { id: "claude", label: "Claude Luxury" },
                { id: "openai", label: "OpenAI GPT" },
                { id: "deepseek", label: "DeepSeek" },
                { id: "google", label: "Google Gemini" },
                { id: "reason", label: "Reasoning" },
                { id: "code", label: "Dasturlash" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`cat-chip ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="models-list-grid">
              {filteredModels.map((m) => (
                <div
                  key={m.id}
                  className={`model-card-item ${m.id === selectedModel ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setIsModelModalOpen(false);
                  }}
                >
                  <div className="model-item-logo">
                    <CompanyLogo name={m.logoKey || m.company} size={22} />
                  </div>
                  <div className="model-item-content">
                    <div className="model-item-title-row">
                      <span className="model-item-name">{m.displayName}</span>
                    </div>
                    <div className="model-item-company">{m.company}</div>
                    <div className="model-item-desc">{m.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Prompt & Skill Creator Modal */}
      {isSkillModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSkillModalOpen(false)}>
          <div className="skills-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Custom System Prompt & Ko'nikmalar</h3>
                <p>AI modeliga beriladigan maxsus xatti-harakat va qoidalar</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsSkillModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="skill-presets-grid">
              {SKILL_PRESETS.map((sk) => (
                <button
                  key={sk.id}
                  type="button"
                  className={`skill-preset-card ${activeSkillId === sk.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveSkillId(sk.id);
                    setSystemPrompt(sk.systemPrompt);
                  }}
                >
                  <div className="skill-name">{sk.name}</div>
                  <div className="skill-desc">{sk.description}</div>
                </button>
              ))}
            </div>

            <div className="custom-prompt-field">
              <label>Shaxsiy System Prompt ko'rsatmasi:</label>
              <textarea
                rows={5}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="AI modeliga qanday yo'l tutishi kerakligini yozing..."
              />
            </div>

            <div className="modal-actions-footer">
              <button
                type="button"
                className="btn-apply-skill"
                onClick={() => setIsSkillModalOpen(false)}
              >
                Ko'rsatmani saqlash & Qo'llash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MCP Gateway Connection Modal */}
      {isMcpModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsMcpModalOpen(false)}>
          <div className="mcp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Model Context Protocol (MCP) Server</h3>
                <p>Claude.ai, Claude Desktop yoki Cursor bilan to'g'ridan-to'g'ri integratsiya</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsMcpModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mcp-info-body">
              <p className="mcp-desc">
                Oryxgen AI to'liq MCP server sifatida ishlaydi. 200+ modellar, tasvir generatsiyasi va avtomatlashtirish imkoniyatlarini Claude ilovangizga ulang:
              </p>

              <div className="mcp-endpoint-box">
                <span className="mcp-label">Server SSE URL (Claude uchun):</span>
                <code>https://avg-ai-creator.site/api/mcp/sse</code>
              </div>

              <div className="mcp-endpoint-box">
                <span className="mcp-label">JSON-RPC HTTP POST:</span>
                <code>https://avg-ai-creator.site/api/mcp</code>
              </div>

              <div className="claude-config-wrapper">
                <div className="claude-config-header">
                  <span>Claude Desktop Config (`claude_desktop_config.json`):</span>
                  <button type="button" className="copy-config-btn" onClick={copyMcpConfig}>
                    {mcpCopied ? "Nusxalandi" : "Nusxalash"}
                  </button>
                </div>
                <pre>{mcpConfigJson}</pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal - Guard */}
      <AuthModal
        isOpen={!currentUser || isAuthOpen}
        closable={Boolean(currentUser)}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />
    </div>
  );
}
