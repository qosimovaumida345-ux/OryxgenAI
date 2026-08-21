import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  checkBackendHealth,
  clearAuthSession,
  deleteUserChat,
  exchangeGoogleCode,
  fetchCatalog,
  fetchUserChats,
  getStoredUser,
  saveUserChat,
  streamChat,
  streamCodexGenerate,
  getAuthToken,
} from "./api";
import CodeXWorkspace from "./CodeXWorkspace";
import AuthModal from "./AuthModal";
import LoadingScreen from "./LoadingScreen";
import { CompanyLogo } from "./Logos";
import "./Chat.css";

const DEFAULT_MODEL = "claude-4.6-opus";
const CHATS_STORAGE_KEY = "oryxgen_saved_chats";
const ACTIVE_CHAT_KEY = "oryxgen_active_chat_id";

function getStoredChats() {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch { }
  return [{
    id: "chat-1",
    title: "Yangi suhbat",
    model: DEFAULT_MODEL,
    messages: [],
    mode: "chat",
    systemPrompt: SKILL_PRESETS[0].systemPrompt,
    skillId: "default",
    projectFiles: {}
  }];
}

function getStoredActiveId(initialChats) {
  try {
    const savedId = localStorage.getItem(ACTIVE_CHAT_KEY);
    if (savedId && initialChats.some((c) => c.id === savedId)) {
      return savedId;
    }
  } catch { }
  return initialChats[0]?.id || "chat-1";
}

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

// Build Live React / Tailwind Sandbox HTML from projectFiles
function buildSandboxHtml(files) {
  if (!files || Object.keys(files).length === 0) {
    return `<!DOCTYPE html><html><body style="background:#09090b;color:#71717a;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg><p style="margin-top:14px;font-size:14px;">Loyiha fayllari hali mavjud emas. CodeX orqali biror g'oya bering.</p></body></html>`;
  }

  const fileKeys = Object.keys(files);
  const mainFileKey = fileKeys.find(k => k.endsWith("App.jsx") || k.endsWith("App.js") || k.endsWith("index.jsx") || k.endsWith("index.html")) || fileKeys[0];
  const mainFile = files[mainFileKey] || "";
  const customCss = files["styles.css"] || files["index.css"] || files["App.css"] || "";

  // If pure HTML
  if (mainFileKey.endsWith(".html") && !mainFile.includes("export default") && !mainFile.includes("React")) {
    return mainFile;
  }

  // Clean React imports/exports for Babel in-browser standalone execution
  const cleanedReactCode = mainFile
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, "")
    .replace(/import\s+['"][^'"]+['"];?/g, "")
    .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, "function $1")
    .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, "")
    .replace(/export\s+/g, "");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CodeX Live Preview</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #ffffff; color: #111827; }
        * { box-sizing: border-box; }
        ${customCss}
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="text/babel">
        try {
          ${cleanedReactCode}

          const ComponentToRender = typeof App !== 'undefined' ? App : (typeof main !== 'undefined' ? main : null);
          if (ComponentToRender) {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<ComponentToRender />);
          } else {
            document.getElementById('root').innerHTML = \`${mainFile.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\`;
          }
        } catch (err) {
          document.getElementById('root').innerHTML = '<div style="color:#ef4444;background:#fef2f2;padding:24px;border:1px solid #fecaca;border-radius:12px;margin:20px;font-family:monospace;"><strong>Ishga tushirishda xatolik:</strong><br/><pre style="white-space:pre-wrap;margin-top:10px;">' + err.message + '</pre></div>';
        }
      </script>
    </body>
    </html>
  `;
}

// Simple markdown-to-HTML renderer for inline formatting
function renderMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;b&gt;/g, "<b>").replace(/&lt;\/b&gt;/g, "</b>")
    .replace(/&lt;i&gt;/g, "<i>").replace(/&lt;\/i&gt;/g, "</i>")
    .replace(/&lt;em&gt;/g, "<em>").replace(/&lt;\/em&gt;/g, "</em>")
    .replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>")
    .replace(/&lt;br\s*\/?\s*&gt;/g, "<br>")
    .replace(/^#### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    .replace(/^[\-\*] (.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="md-li-ordered">$1</li>')
    .replace(/^---$/gm, '<hr class="md-hr">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>')
    .replace(/\n\n/g, '<div class="md-break"></div>')
    .replace(/\n/g, '<br>');

  return html;
}

export default function Chat() {
  const [models, setModels] = useState([]);
  const [chats, setChats] = useState(getStoredChats);
  const [activeChatId, setActiveChatId] = useState(() => getStoredActiveId(chats));

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];
  const [selectedModel, setSelectedModel] = useState(() => activeChat?.model || DEFAULT_MODEL);
  const [messages, setMessages] = useState(() => activeChat?.messages || []);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentThinking, setCurrentThinking] = useState("");
  const [thinkingExpanded, setThinkingExpanded] = useState(true);
  const [thinkingTime, setThinkingTime] = useState(0);

  const [systemPrompt, setSystemPrompt] = useState(() => activeChat?.systemPrompt || SKILL_PRESETS[0].systemPrompt);
  const [activeSkillId, setActiveSkillId] = useState(() => activeChat?.skillId || "default");
  const [appMode, setAppMode] = useState(() => activeChat?.mode || "chat");
  const [projectFiles, setProjectFiles] = useState(() => activeChat?.projectFiles || {});
  const [selectedCodeFile, setSelectedCodeFile] = useState("App.jsx");
  const [codexPlan, setCodexPlan] = useState(() => activeChat?.codexPlan || null);
  const [codexFileStatus, setCodexFileStatus] = useState({}); // path -> "pending" | "writing" | "valid" | "fixed"
  const [codexPhaseMsg, setCodexPhaseMsg] = useState("");
  // Panel collapse state persists per chat: { [chatId]: boolean }
  const [codexCollapsedByChat, setCodexCollapsedByChat] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("oryxgen_codex_collapsed") || "{}");
    } catch {
      return {};
    }
  });
  const isCodexCollapsed = !!codexCollapsedByChat[activeChatId];
  const toggleCodexCollapsed = () => {
    setCodexCollapsedByChat((prev) => {
      const next = { ...prev, [activeChatId]: !prev[activeChatId] };
      try { localStorage.setItem("oryxgen_codex_collapsed", JSON.stringify(next)); } catch { }
      return next;
    });
  };

  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [mcpCopied, setMcpCopied] = useState(false);

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [searchModel, setSearchModel] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBackendLoading, setIsBackendLoading] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const thinkingTimerRef = useRef(null);

  const persistChats = (updatedChats) => {
    setChats(updatedChats);
    try {
      localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updatedChats));
    } catch { }
  };

  const updateActiveChatState = (updates) => {
    const updatedChats = chats.map((c) => {
      if (c.id === activeChatId) {
        const newChat = { ...c, ...updates };
        saveUserChat(newChat);
        return newChat;
      }
      return c;
    });
    persistChats(updatedChats);
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
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
      } catch { }

      if (currentUser) {
        try {
          const remoteChats = await fetchUserChats();
          if (mounted && Array.isArray(remoteChats) && remoteChats.length > 0) {
            setChats((localPrev) => {
              const mergedMap = new Map();
              localPrev.forEach((c) => mergedMap.set(c.id, c));
              remoteChats.forEach((c) => mergedMap.set(c.id, { ...c, messages: c.messages || [] }));
              const merged = Array.from(mergedMap.values());
              try {
                localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(merged));
              } catch { }
              return merged;
            });
          }
        } catch { }
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentThinking]);

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
    displayName: selectedModel.replace(/-/g, " ").toUpperCase(),
    company: "Anthropic",
    logoKey: "anthropic",
    capability: "reason",
    isPremium: true,
  };

  const handleSelectChat = (chatId) => {
    const target = chats.find((c) => c.id === chatId);
    if (!target) return;
    setActiveChatId(chatId);
    setMessages(target.messages || []);
    if (target.model) setSelectedModel(target.model);
    setSystemPrompt(target.systemPrompt || SKILL_PRESETS[0].systemPrompt);
    setActiveSkillId(target.skillId || "default");
    setAppMode(target.mode || "chat");
    setProjectFiles(target.projectFiles || {});
    setCurrentThinking("");
    try {
      localStorage.setItem(ACTIVE_CHAT_KEY, chatId);
    } catch { }
    setSidebarOpen(false);
  };

  const handleNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newChatObj = {
      id: newId,
      title: "Yangi suhbat",
      model: selectedModel,
      messages: [],
      mode: "chat",
      systemPrompt: SKILL_PRESETS[0].systemPrompt,
      skillId: "default",
      projectFiles: {}
    };
    const updated = [newChatObj, ...chats];
    persistChats(updated);
    setActiveChatId(newId);
    setMessages([]);
    setSystemPrompt(newChatObj.systemPrompt);
    setActiveSkillId(newChatObj.skillId);
    setAppMode(newChatObj.mode);
    setProjectFiles(newChatObj.projectFiles);
    setCurrentThinking("");
    try {
      localStorage.setItem(ACTIVE_CHAT_KEY, newId);
    } catch { }
    setSidebarOpen(false);
  };

  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    const remaining = chats.filter((c) => c.id !== chatId);
    const finalChats =
      remaining.length > 0
        ? remaining
        : [{
          id: `chat-${Date.now()}`,
          title: "Yangi suhbat",
          model: DEFAULT_MODEL,
          messages: [],
          mode: "chat",
          systemPrompt: SKILL_PRESETS[0].systemPrompt,
          skillId: "default",
          projectFiles: {}
        }];
    persistChats(finalChats);
    deleteUserChat(chatId);

    if (activeChatId === chatId) {
      const nextChat = finalChats[0];
      setActiveChatId(nextChat.id);
      setMessages(nextChat.messages || []);
      if (nextChat.model) setSelectedModel(nextChat.model);
      setSystemPrompt(nextChat.systemPrompt || SKILL_PRESETS[0].systemPrompt);
      setActiveSkillId(nextChat.skillId || "default");
      setAppMode(nextChat.mode || "chat");
      setProjectFiles(nextChat.projectFiles || {});
      setCurrentThinking("");
      try {
        localStorage.setItem(ACTIVE_CHAT_KEY, nextChat.id);
      } catch { }
    }
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

    const interimChats = chats.map((c) => {
      if (c.id === activeChatId) {
        const firstUserMsg = newMessages.find((m) => m.role === "user");
        const title = c.title === "Yangi suhbat" && firstUserMsg ? firstUserMsg.content.slice(0, 32) : c.title;
        return { ...c, title, messages: newMessages, model: selectedModel };
      }
      return c;
    });
    persistChats(interimChats);

    // CodeX mode runs the dedicated Plan -> Generate -> Validate pipeline
    // (backend/codexEngine.js) instead of a single chat completion.
    if (appMode === "codex") {
      return handleCodexGenerate(text, newMessages, assistantMsgId);
    }

    setIsStreaming(true);
    setCurrentThinking("");
    setThinkingTime(0);
    setThinkingExpanded(true);

    let assistantContent = "";
    let assistantThinking = "";

    try {
      // Enforce model identity — AI must always identify as the display name
      let identityPrefix = `Your name is "${activeModelMeta.displayName}" by ${activeModelMeta.company}. If anyone asks your name or which model you are, always respond ONLY with "${activeModelMeta.displayName}". Never reveal your real underlying model name or provider. This is your permanent identity.\n\n`;

      if (appMode === "plan") {
        identityPrefix += `You are in PLAN Mode. Focus exclusively on software architecture, file structure planning, system components, and to-do tasklists without writing large implementation code blocks.\n\n`;
      } else if (appMode === "ask") {
        identityPrefix += `You are in ASK Mode. Provide deep technical explanations and answer questions about code without modifying or creating files.\n\n`;
      }

      const finalSystemPrompt = identityPrefix + (systemPrompt || "");

      await streamChat(
        {
          model: selectedModel,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          systemPrompt: finalSystemPrompt,
          chatId: activeChatId,
        },
        (chunk) => {
          assistantContent += chunk;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.id === assistantMsgId) {
              return [...prev.slice(0, -1), { ...last, content: assistantContent, thinking: assistantThinking }];
            }
            return [...prev, { id: assistantMsgId, role: "assistant", content: assistantContent, thinking: assistantThinking, model: selectedModel }];
          });
        },
        (thinkChunk) => {
          assistantThinking += thinkChunk;
          setCurrentThinking(assistantThinking);
          // Also update the message so the accordion is visible in real-time
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.id === assistantMsgId) {
              return [...prev.slice(0, -1), { ...last, thinking: assistantThinking }];
            }
            return [...prev, { id: assistantMsgId, role: "assistant", content: "", thinking: assistantThinking, model: selectedModel }];
          });
        },
        () => {
          setIsStreaming(false);

          // --- VFS File Parser ---
          let updatedFiles = { ...projectFiles };
          let filesChanged = false;

          // VFS file parser — only used by AGENT mode's inline <file> tags.
          // CodeX mode has its own dedicated pipeline (handleCodexGenerate) and
          // never reaches this onDone callback.
          if (appMode === "agent") {
            const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
            let match;
            while ((match = fileRegex.exec(assistantContent)) !== null) {
              const filePath = match[1];
              const fileContent = match[2];
              updatedFiles[filePath] = fileContent;
              filesChanged = true;
            }
          }

          if (filesChanged) {
            setProjectFiles(updatedFiles);
            const firstKey = Object.keys(updatedFiles)[0];
            if (firstKey) setSelectedCodeFile(firstKey);
          }
          // -----------------------
          // -----------------------

          const finalMessages = [
            ...newMessages,
            { id: assistantMsgId, role: "assistant", content: assistantContent, thinking: assistantThinking, model: selectedModel },
          ];
          setMessages(finalMessages);

          setChats((prevChats) => {
            const updated = prevChats.map((c) => {
              if (c.id === activeChatId) {
                const firstUserMsg = finalMessages.find((m) => m.role === "user");
                const title = c.title === "Yangi suhbat" && firstUserMsg ? firstUserMsg.content.slice(0, 32) : c.title;
                const updatedChat = {
                  ...c,
                  title,
                  messages: finalMessages,
                  model: selectedModel,
                  projectFiles: filesChanged ? updatedFiles : c.projectFiles
                };
                saveUserChat(updatedChat);
                return updatedChat;
              }
              return c;
            });
            try { localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updated)); } catch { }
            return updated;
          });
        },
        (errMsg) => {
          setIsStreaming(false);
          const errMessages = [...newMessages, { id: `error-${Date.now()}`, role: "assistant", content: `Xatolik: ${errMsg}`, model: selectedModel, isError: true }];
          setMessages(errMessages);
          persistChats(chats.map((c) => (c.id === activeChatId ? { ...c, messages: errMessages } : c)));
        }
      );
    } catch (err) {
      setIsStreaming(false);
      const errMessages = [...newMessages, { id: `error-${Date.now()}`, role: "assistant", content: `Ulanish xatosi: ${err.message}`, model: selectedModel, isError: true }];
      setMessages(errMessages);
      persistChats(chats.map((c) => (c.id === activeChatId ? { ...c, messages: errMessages } : c)));
    }
  };

  // CodeX Autonomous Pipeline — Plan -> Generate -> Validate.
  // Streams backend/codexEngine.js events via /api/codex/generate (SSE)
  // and reflects live progress (plan + per-file status) into the chat UI.
  const handleCodexGenerate = async (promptText, newMessages, assistantMsgId) => {
    setIsStreaming(true);
    setCodexPlan(null);
    setCodexFileStatus({});
    setCodexPhaseMsg("Loyiha rejasi tuzilmoqda...");

    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "", isCodexProgress: true, model: selectedModel },
    ]);

    await streamCodexGenerate(
      { prompt: promptText, chatId: activeChatId },
      {
        onPhase: (event) => {
          setCodexPhaseMsg(event.message || "");
        },
        onPlan: (plan) => {
          setCodexPlan(plan);
          const initialStatus = {};
          (plan.files || []).forEach((f) => {
            initialStatus[f.path] = "pending";
          });
          setCodexFileStatus(initialStatus);
        },
        onFileStart: (event) => {
          setCodexFileStatus((prev) => ({ ...prev, [event.path]: "writing" }));
        },
        onFileValidate: (event) => {
          setCodexFileStatus((prev) => ({ ...prev, [event.path]: event.status === "fixed" ? "fixed" : "valid" }));
        },
        onFileDone: (event) => {
          setProjectFiles((prev) => ({ ...prev, [event.path]: event.content }));
        },
        onDone: (event) => {
          setIsStreaming(false);
          setCodexPhaseMsg("");

          const plan = event.plan || codexPlan;
          const projectFilesResult = event.projectFiles || {};
          setProjectFiles(projectFilesResult);
          const firstKey = Object.keys(projectFilesResult)[0];
          if (firstKey) setSelectedCodeFile(firstKey);

          const summaryLine = `**${plan?.title || "Loyiha"} muvaffaqiyatli yaratildi!**\n\n${plan?.summary || ""}\n\nFayllar soni: ${Object.keys(projectFilesResult).length} ta.\n\n📦 ZIP yuklab olish tugmasi orqali loyihani hozir yuklab olishingiz mumkin.`;

          const finalMessages = [
            ...newMessages,
            { id: assistantMsgId, role: "assistant", content: summaryLine, model: selectedModel },
          ];
          setMessages(finalMessages);

          setChats((prevChats) => {
            const updated = prevChats.map((c) => {
              if (c.id === activeChatId) {
                const updatedChat = {
                  ...c,
                  title: plan?.title || c.title,
                  messages: finalMessages,
                  model: selectedModel,
                  projectFiles: projectFilesResult,
                  codexPlan: plan,
                };
                saveUserChat(updatedChat);
                return updatedChat;
              }
              return c;
            });
            try { localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updated)); } catch { }
            return updated;
          });
        },
        onError: (errMsg) => {
          setIsStreaming(false);
          setCodexPhaseMsg("");
          const errMessages = [
            ...newMessages,
            { id: `error-${Date.now()}`, role: "assistant", content: `Xatolik: ${errMsg}`, model: selectedModel, isError: true },
          ];
          setMessages(errMessages);
          persistChats(chats.map((c) => (c.id === activeChatId ? { ...c, messages: errMessages } : c)));
        },
      }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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

  const backendApiUrl = (import.meta.env.VITE_API_URL || "https://oryxgen-api.onrender.com").replace(/\/$/, "");
  const currentToken = getAuthToken();
  const tokenQuery = currentToken ? `?token=${currentToken}` : "";
  const mcpSseUrl = `${backendApiUrl}/api/mcp/sse${tokenQuery}`;
  const mcpPostUrl = `${backendApiUrl}/api/mcp${tokenQuery}`;

  const mcpConfigJson = JSON.stringify(
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
          <Link to="/" className="sidebar-brand">
            <img src="/Logo.png" alt="Oryxgen Logo" className="chat-brand-logo" />
            <span>
              Oryxgen <span className="brand-suffix">AI</span>
            </span>
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
            <div
              key={c.id}
              className={`chat-list-item ${c.id === activeChatId ? "active" : ""}`}
              onClick={() => handleSelectChat(c.id)}
            >
              <div className="chat-item-main">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="1.8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>{c.title || "Suhbat"}</span>
              </div>
              <button
                type="button"
                className="chat-delete-btn"
                onClick={(e) => handleDeleteChat(e, c.id)}
                title="Suhbatni o'chirish"
                aria-label="Suhbatni o'chirish"
              >
                ✕
              </button>
            </div>
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

      {/* Main Chat Content & Split Screen */}
      <div className={`chat-layout-content ${appMode === "codex" ? "codex-active" : ""}`}>
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

              {Object.keys(projectFiles).length > 0 && (
                <a
                  href={`/preview/${activeChatId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="live-preview-btn"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Preview
                </a>
              )}

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

                      {m.isCodexProgress && isStreaming ? (
                        <div className="codex-generation-progress">
                          <div className="codex-progress-phase">
                            <span className="spinner-dot" />
                            <span>{codexPhaseMsg || "Ishlanmoqda..."}</span>
                          </div>
                          {codexPlan && (
                            <div className="codex-progress-filetree">
                              <div className="codex-progress-filetree-title">
                                {codexPlan.title} · {codexPlan.stack}
                              </div>
                              {(codexPlan.files || []).map((f) => {
                                const status = codexFileStatus[f.path] || "pending";
                                return (
                                  <div key={f.path} className={`codex-progress-file-row status-${status}`}>
                                    <span className="codex-progress-file-icon">
                                      {status === "pending" && "○"}
                                      {status === "writing" && "◐"}
                                      {status === "valid" && "●"}
                                      {status === "fixed" && "◆"}
                                    </span>
                                    <span className="codex-progress-file-path">{f.path}</span>
                                    <span className="codex-progress-file-label">
                                      {status === "pending" && "Navbatda"}
                                      {status === "writing" && "Yozilmoqda..."}
                                      {status === "valid" && "Tayyor"}
                                      {status === "fixed" && "Tuzatildi"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
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
                              <div
                                key={idx}
                                className="text-prose"
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(part) }}
                              />
                            );
                          })}
                        </div>
                      )}
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
              <div className="input-action-menu">
                <button
                  type="button"
                  className={`action-plus-btn ${isModeMenuOpen ? "open" : ""}`}
                  onClick={() => setIsModeMenuOpen(!isModeMenuOpen)}
                  aria-label="Rejimni tanlash"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>

                {isModeMenuOpen && (
                  <div className="mode-popup-menu">
                    <button
                      type="button"
                      className={`popup-mode-item ${appMode === "plan" ? "active" : ""}`}
                      onClick={() => { setAppMode("plan"); updateActiveChatState({ mode: "plan" }); setIsModeMenuOpen(false); }}
                    >
                      <div className="mode-icon">📋</div>
                      <div className="mode-text">
                        <strong>Plan</strong>
                        <span>Loyiha arxitekturasini tuzish</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`popup-mode-item ${appMode === "agent" || appMode === "chat" ? "active" : ""}`}
                      onClick={() => { setAppMode("agent"); updateActiveChatState({ mode: "agent" }); setIsModeMenuOpen(false); }}
                    >
                      <div className="mode-icon">⚡</div>
                      <div className="mode-text">
                        <strong>Agent</strong>
                        <span>Kod yozish va tahrirlash</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`popup-mode-item ${appMode === "ask" ? "active" : ""}`}
                      onClick={() => { setAppMode("ask"); updateActiveChatState({ mode: "ask" }); setIsModeMenuOpen(false); }}
                    >
                      <div className="mode-icon">💬</div>
                      <div className="mode-text">
                        <strong>Ask</strong>
                        <span>Fayllarga tegmasdan savol berish</span>
                      </div>
                    </button>
                    <div className="popup-divider"></div>
                    <button
                      type="button"
                      className={`popup-mode-item codex-mode ${appMode === "codex" ? "active" : ""}`}
                      onClick={() => { setAppMode("codex"); updateActiveChatState({ mode: "codex" }); setIsModeMenuOpen(false); }}
                    >
                      <div className="mode-icon">🚀</div>
                      <div className="mode-text">
                        <strong>CodeX</strong>
                        <span>Yagona g'oya — to'liq avtonom ilova</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                className="chat-textarea"
                placeholder={`${appMode.toUpperCase()}: ${activeModelMeta.displayName} ga yozing...`}
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

        {/* CodeX Side Panel (Preview / Code / Download) — CodeXWorkspace.jsx owns
          real multi-file preview, syntax highlighting, and its own tab/device state. */}
        {appMode === "codex" && (
          <CodeXWorkspace
            projectFiles={projectFiles}
            plan={codexPlan}
            activeChatTitle={activeChat?.title || "CodeX App"}
            isCollapsed={isCodexCollapsed}
            onToggleCollapse={toggleCodexCollapsed}
          />
        )}
      </div>

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

              {!currentToken && (
                <div style={{ padding: "10px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#fca5a5", fontSize: "12.5px" }}>
                  <strong>Diqqat:</strong> Tizimga kirmagansiz! MCP orqali xavfsiz ulanish va CodeX ishlatish uchun avval tizimga (Kirish) kiring. Aks holda ulanish rad etiladi.
                </div>
              )}

              <div className="mcp-endpoint-box">
                <span className="mcp-label">Claude.ai Connector URL (Streamable HTTP):</span>
                <code>{mcpPostUrl}</code>
              </div>

              <div className="mcp-endpoint-box">
                <span className="mcp-label">Claude Desktop / Cursor SSE URL:</span>
                <code>{mcpSseUrl}</code>
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