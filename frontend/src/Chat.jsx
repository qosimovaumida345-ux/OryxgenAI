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
  setAuthSession,
  getUserSystemPrompt,
  updateUserSystemPrompt,
} from "./api";
import CodeXWorkspace from "./CodeXWorkspace";
import AuthModal from "./AuthModal";
import LoadingScreen from "./LoadingScreen";
import { CompanyLogo } from "./Logos";
import StructureViewer, { isDirectoryTreeCode } from "./StructureViewer";
import ApiPlatformModal from "./ApiPlatformModal";
import DesktopDeviceModal from "./DesktopDeviceModal";
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

// Comprehensive Markdown-to-HTML parser supporting tables, bold, italics, code, headings, blockquotes, lists, and links
function renderMarkdown(text) {
  if (!text) return "";

  // Extract and convert tables first to protect from raw line breaks
  const tables = [];
  let processed = text;

  if (processed.includes("|")) {
    const lines = processed.split("\n");
    const newLines = [];
    let inTable = false;
    let tableLines = [];

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      const isTableRow = trimmed.length > 2 &&
        (trimmed.startsWith("|") || (trimmed.includes("|") && trimmed.indexOf("|") !== trimmed.lastIndexOf("|"))) &&
        !trimmed.startsWith("```");

      if (isTableRow) {
        inTable = true;
        tableLines.push(trimmed);
      } else {
        if (inTable) {
          const ph = `XYZTABLETOKEN${tables.length}XYZ`;
          tables.push(convertTableLinesToHtml(tableLines));
          tableLines = [];
          inTable = false;
          newLines.push(ph);
        }
        newLines.push(rawLine);
      }
    }

    if (inTable && tableLines.length > 0) {
      const ph = `XYZTABLETOKEN${tables.length}XYZ`;
      tables.push(convertTableLinesToHtml(tableLines));
      newLines.push(ph);
    }

    processed = newLines.join("\n");
  }

  // HTML escaping for text
  let html = processed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Double backticks inline code
  html = html.replace(/``([^`]+?)``/g, '<code class="md-inline-code">$1</code>');
  // Single backtick inline code
  html = html.replace(/`([^`]+?)`/g, '<code class="md-inline-code">$1</code>');

  // Headings
  html = html
    .replace(/^##### (.+)$/gm, '<h5 class="md-h5">$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>');

  // Bold & Italic
  html = html
    .replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___([^_]+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+?)__/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>')
    .replace(/~~([^~]+?)~~/g, '<del>$1</del>');

  // Blockquotes
  html = html.replace(/^&gt;\s?(.*)$/gm, '<blockquote class="md-quote">$1</blockquote>');

  // Lists
  html = html
    .replace(/^[\*\-\+] (.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="md-li-ordered">$1</li>');

  // Horizontal divider
  html = html.replace(/^(?:---|___|\*\*\*)$/gm, '<hr class="md-hr">');

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div class="chat-md-image-box"><img src="$2" alt="$1" class="chat-md-img" loading="lazy" /></div>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

  // Paragraphs & Line Breaks
  html = html
    .replace(/\n\n/g, '<div class="md-break"></div>')
    .replace(/\n/g, '<br>');

  // Restore tables
  tables.forEach((tblHtml, idx) => {
    html = html.replace(`XYZTABLETOKEN${idx}XYZ`, tblHtml);
  });

  return html;
}

function convertTableLinesToHtml(lines) {
  if (lines.length < 2) return lines.join("\n");

  const parseCells = (l) => {
    let clean = l.trim();
    if (clean.startsWith("|")) clean = clean.substring(1);
    if (clean.endsWith("|")) clean = clean.substring(0, clean.length - 1);
    return clean.split("|").map((c) => c.trim());
  };

  const headerCells = parseCells(lines[0]);
  const delimiterCells = parseCells(lines[1]);

  const isDelimiter = delimiterCells.every((c) => /^:?-+:?$/.test(c.replace(/\s+/g, "")));
  if (!isDelimiter) {
    return lines.join("\n");
  }

  const alignments = delimiterCells.map((c) => {
    const trimmed = c.replace(/\s+/g, "");
    if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
    if (trimmed.endsWith(":")) return "right";
    return "left";
  });

  const formatInline = (cellText) => {
    let t = cellText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    t = t.replace(/`([^`]+?)`/g, '<code class="md-inline-code">$1</code>');
    t = t.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*([^*]+?)\*/g, '<em>$1</em>');
    return t;
  };

  const thead = `<thead><tr>${headerCells
    .map((h, idx) => `<th style="text-align:${alignments[idx] || "left"}">${formatInline(h)}</th>`)
    .join("")}</tr></thead>`;

  const bodyRows = lines
    .slice(2)
    .map((rowLine) => {
      const cells = parseCells(rowLine);
      const tds = cells
        .map((c, idx) => `<td style="text-align:${alignments[idx] || "left"}">${formatInline(c)}</td>`)
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  return `<div class="md-table-wrapper"><table class="md-table">${thead}<tbody>${bodyRows}</tbody></table></div>`;
}

// Helper to extract embedded <think>...</think> or <thought>...</thought> tags from content
function extractThinkingAndContent(content = "", existingThinking = "") {
  let thinking = (existingThinking || "").trim();
  let cleanContent = content || "";

  const thinkRegex = /<(?:think|thought)>([\s\S]*?)<\/(?:think|thought)>/gi;
  let match;
  while ((match = thinkRegex.exec(cleanContent)) !== null) {
    const extracted = match[1].trim();
    if (extracted) {
      thinking = thinking ? `${thinking}\n${extracted}` : extracted;
    }
  }
  cleanContent = cleanContent.replace(thinkRegex, "").trim();

  // If there's an unclosed <think> tag at the end (e.g. during live streaming)
  const unclosedMatch = cleanContent.match(/<(?:think|thought)>([\s\S]*)$/i);
  if (unclosedMatch) {
    const unclosed = unclosedMatch[1].trim();
    if (unclosed) {
      thinking = thinking ? `${thinking}\n${unclosed}` : unclosed;
    }
    cleanContent = cleanContent.replace(/<(?:think|thought)>[\s\S]*$/i, "").trim();
  }

  return { thinking, content: cleanContent };
}

function parseAttributes(attrString) {
  const attrs = {};
  if (!attrString) return attrs;
  const re = /([a-zA-Z_0-9]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let m;
  while ((m = re.exec(attrString)) !== null) {
    attrs[m[1]] = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]);
  }
  return attrs;
}

// ── Strip raw XML tool tags, thinking blocks, and leaked terminal output from user-facing text ──
export function cleanUserFacingText(text) {
  if (!text || typeof text !== "string") return "";
  let clean = text;

  // 1. Remove think/thought tags
  clean = clean.replace(/<(?:think|thought)>[\s\S]*?<\/(?:think|thought)>/gi, "");
  clean = clean.replace(/<(?:think|thought)>[\s\S]*$/gi, "");

  // 2. Remove outer <tool_call> tags
  clean = clean.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "");
  clean = clean.replace(/<tool_call>[\s\S]*$/gi, "");

  // 3. Remove all known paired tool tags with bodies
  const toolNames = "run_command|terminal_run|list_dir|read_file|write_file|launch_app|take_screenshot|screenshot|focus_window|mouse_click|keyboard_type|kill_process";
  const pairedRe = new RegExp(`<(?:${toolNames})\\b[\\s\\S]*?<\\/(?:${toolNames})>`, "gi");
  clean = clean.replace(pairedRe, "");

  // 4. Remove all self-closing tool tags
  const selfCloseRe = new RegExp(`<(?:${toolNames})\\b[^>]*\\/>`, "gi");
  clean = clean.replace(selfCloseRe, "");

  // 5. Remove unclosed / streaming tool tags
  const unclosedRe = new RegExp(`<(?:${toolNames})\\b[\\s\\S]*$`, "gi");
  clean = clean.replace(unclosedRe, "");

  // 6. Remove orphaned tool attribute fragments like cwd="C:\" /> or command="..." />
  clean = clean.replace(/\b(?:cwd|command|path)\s*=\s*"[^"]*"\s*(?:\/>|>)?/gi, "");
  clean = clean.replace(/\b(?:cwd|command|path)\s*=\s*'[^']*'\s*(?:\/>|>)?/gi, "");
  clean = clean.replace(/(?:cwd|command|path|args|text|pid|name)\s*=\s*"[^"]*"\s*\/>/gi, "");
  clean = clean.replace(/(?:cwd|command|path|args|text|pid|name)\s*=\s*'[^']*'\s*\/>/gi, "");
  clean = clean.replace(/\s*\/>\s*$/gi, "");

  // 7. Remove any leaked terminal code blocks from past sessions
  clean = clean.replace(/```(?:powershell|text|sh|cmd)?\s*⚡\s*\[Terminal Buyrug'i:[\s\S]*?```/gi, "");
  clean = clean.replace(/```(?:text)?\s*📁\s*\[Katalog Tekshirildi:[\s\S]*?```/gi, "");

  // 8. Remove empty codeblocks
  clean = clean.replace(/```(?:xml|powershell|bash|sh)?\s*```/gi, "");

  return clean.trim();
}

function extractDesktopToolCalls(text) {
  if (!text || typeof text !== "string") return [];
  const calls = [];
  const toolNames = [
    "run_command", "terminal_run", "list_dir", "read_file", "write_file",
    "launch_app", "take_screenshot", "screenshot", "focus_window",
    "mouse_click", "keyboard_type", "kill_process"
  ];

  // Unwrap outer code blocks if any
  const unwrapped = text
    .replace(/```(?:xml|powershell|bash|sh)?\s*(<(?:tool_call|run_command|list_dir|read_file|write_file|launch_app|take_screenshot|screenshot|focus_window|mouse_click|keyboard_type|kill_process)[\s\S]*?>[\s\S]*?)```/gi, "$1")
    .replace(/<\/?tool_call>/gi, "");

  // Paired tags: <run_command cwd="...">body</run_command>
  const pairedRegex = /<([a-z_]+)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = pairedRegex.exec(unwrapped)) !== null) {
    const action = match[1].toLowerCase();
    if (toolNames.includes(action)) {
      calls.push({
        action,
        attrs: parseAttributes(match[2]),
        body: match[3].trim(),
      });
    }
  }

  // Self-closing tags: <list_dir path="..." /> or <run_command command="..." />
  const selfCloseRegex = /<([a-z_]+)\b([^>]*?)\/>/gi;
  while ((match = selfCloseRegex.exec(unwrapped)) !== null) {
    const action = match[1].toLowerCase();
    if (toolNames.includes(action)) {
      calls.push({
        action,
        attrs: parseAttributes(match[2]),
        body: "",
      });
    }
  }

  return calls;
}

// ── Native Desktop Tool Execution Engine (ChatGPT & Claude Desktop Architecture) ──
async function executeDesktopToolCalls(rawContent, desktopApi) {
  if (!desktopApi || typeof rawContent !== "string") {
    return { executedText: cleanUserFacingText(rawContent), toolResultText: "", shouldFollowup: false };
  }

  const toolCalls = extractDesktopToolCalls(rawContent);
  if (!toolCalls.length) {
    return { executedText: cleanUserFacingText(rawContent), toolResultText: "", shouldFollowup: false };
  }

  let toolResultStrings = [];
  let shouldFollowup = false;

  // Visual edge glow
  try {
    if (desktopApi.startGlow) desktopApi.startGlow(2.5);
  } catch { }

  const defaultDesktop = desktopApi.desktopPath || (desktopApi.userProfile ? `${desktopApi.userProfile}\\Desktop` : "C:\\Users\\user\\Desktop");

  for (const call of toolCalls) {
    const { action, attrs, body } = call;

    // 1. list_dir
    if (action === "list_dir") {
      let targetPath = (attrs.path || body || defaultDesktop).trim().replace(/^["']|["']$/g, "");
      if (targetPath.toLowerCase() === "desktop" || targetPath.toLowerCase() === "~/desktop") {
        targetPath = defaultDesktop;
      }
      try {
        const res = await desktopApi.listDir(targetPath);
        if (res && res.success && Array.isArray(res.items)) {
          const folders = res.items.filter((i) => i.isDirectory).map((i) => i.name);
          const files = res.items.filter((i) => !i.isDirectory).map((i) => i.name);
          const summary = `Papka manzili: "${targetPath}"\nJami: ${res.items.length} ta element (${folders.length} ta papka, ${files.length} ta fayl)\n\nPapkalar (${folders.length} ta):\n${folders.map((f) => `• 📁 ${f}`).join("\n") || "(Papkalar yo'q)"}\n\nFayllar (${files.length} ta):\n${files.map((f) => `• 📄 ${f}`).join("\n") || "(Fayllar yo'q)"}`;
          toolResultStrings.push(`[TOOL RESULT: list_dir("${targetPath}")]:\n${summary}`);
          shouldFollowup = true;
        } else {
          const errMsg = res?.error || "Papka topilmadi";
          toolResultStrings.push(`[TOOL ERROR: list_dir("${targetPath}")]: ${errMsg}`);
          shouldFollowup = true;
        }
      } catch (err) {
        toolResultStrings.push(`[TOOL EXCEPTION: list_dir]: ${err.message}`);
        shouldFollowup = true;
      }
    }

    // 2. run_command
    else if (action === "run_command" || action === "terminal_run") {
      let command = (attrs.command || body || "").trim();
      let cwd = (attrs.cwd || defaultDesktop).trim().replace(/^["']|["']$/g, "");

      if ((command.startsWith('"') && command.endsWith('"')) || (command.startsWith("'") && command.endsWith("'"))) {
        command = command.slice(1, -1).trim();
      }
      if (command.startsWith("```")) {
        command = command.replace(/^```[a-z0-9_-]*\n?/i, "").replace(/\n?```$/i, "").trim();
      }
      const psMatch = command.match(/^powershell(?:\.exe)?\s+(?:-NoProfile\s+)?(?:-Command\s+)?["']?([\s\S]*?)["']?$/i);
      if (psMatch && psMatch[1] && psMatch[1].length > 2) {
        command = psMatch[1].trim();
      }
      if (command.startsWith("\\") && !command.startsWith("\\\\")) {
        command = command.slice(1).trim();
      }

      if (command) {
        try {
          const res = await desktopApi.runCommand(command, cwd);
          const out = (res?.output || res?.stdout || res?.error || (res?.success ? "Bajarildi" : "Natija yo'q")).trim();
          toolResultStrings.push(`[TOOL RESULT: run_command("${command}")]:\n${out}`);
          shouldFollowup = true;
        } catch (err) {
          toolResultStrings.push(`[TOOL ERROR: run_command("${command}")]: ${err.message}`);
          shouldFollowup = true;
        }
      }
    }

    // 3. read_file
    else if (action === "read_file") {
      const filePath = (attrs.path || body || "").trim().replace(/^["']|["']$/g, "");
      if (filePath) {
        try {
          const res = await desktopApi.readFile(filePath);
          if (res && res.success) {
            toolResultStrings.push(`[TOOL RESULT: read_file("${filePath}")]:\n${res.content}`);
            shouldFollowup = true;
          } else {
            const errMsg = res?.error || "Fayl topilmadi";
            toolResultStrings.push(`[TOOL ERROR: read_file("${filePath}")]: ${errMsg}`);
            shouldFollowup = true;
          }
        } catch (err) {
          toolResultStrings.push(`[TOOL EXCEPTION: read_file]: ${err.message}`);
          shouldFollowup = true;
        }
      }
    }

    // 4. write_file
    else if (action === "write_file") {
      const filePath = (attrs.path || "").trim().replace(/^["']|["']$/g, "");
      const content = body || attrs.content || "";
      if (filePath) {
        try {
          const res = await desktopApi.writeFile(filePath, content);
          if (res && res.success) {
            toolResultStrings.push(`[TOOL RESULT: write_file("${filePath}")]: Successfully saved ${content.length} bytes.`);
            shouldFollowup = true;
          } else {
            const errMsg = res?.error || "Fayl saqlanmadi";
            toolResultStrings.push(`[TOOL ERROR: write_file("${filePath}")]: ${errMsg}`);
            shouldFollowup = true;
          }
        } catch (err) {
          toolResultStrings.push(`[TOOL EXCEPTION: write_file]: ${err.message}`);
          shouldFollowup = true;
        }
      }
    }

    // 5. launch_app
    else if (action === "launch_app") {
      const command = (attrs.command || body || "").trim().replace(/^["']|["']$/g, "");
      const args = (attrs.args || "").trim();
      if (command) {
        try {
          await desktopApi.launchApp(command, args);
          toolResultStrings.push(`[TOOL RESULT: launch_app("${command}")]: Launched successfully.`);
          shouldFollowup = true;
        } catch (err) {
          toolResultStrings.push(`[TOOL ERROR: launch_app("${command}")]: ${err.message}`);
          shouldFollowup = true;
        }
      }
    }

    // 6. take_screenshot
    else if (action === "take_screenshot" || action === "screenshot") {
      try {
        const res = await desktopApi.takeScreenshot(0.8, null, true);
        if (res && res.success) {
          toolResultStrings.push(`[TOOL RESULT: take_screenshot]: Screenshot captured successfully (${res.width}x${res.height}) at ${res.path}.`);
          shouldFollowup = true;
        }
      } catch (err) {
        toolResultStrings.push(`[TOOL ERROR: take_screenshot]: ${err.message}`);
      }
    }

    // 7. focus_window
    else if (action === "focus_window") {
      const query = (attrs.query || body || "").trim().replace(/^["']|["']$/g, "");
      if (query) {
        try {
          await desktopApi.focusWindow(query);
          toolResultStrings.push(`[TOOL RESULT: focus_window("${query}")]: Focused.`);
          shouldFollowup = true;
        } catch (err) {
          toolResultStrings.push(`[TOOL ERROR: focus_window]: ${err.message}`);
        }
      }
    }

    // 8. mouse_click
    else if (action === "mouse_click") {
      const x = parseInt(attrs.x || "0", 10);
      const y = parseInt(attrs.y || "0", 10);
      const button = attrs.button || "left";
      const clicks = parseInt(attrs.clicks || "1", 10);
      try {
        await desktopApi.mouseClick(x, y, button, clicks);
        toolResultStrings.push(`[TOOL RESULT: mouse_click]: Clicked at (${x}, ${y}) with ${button}.`);
        shouldFollowup = true;
      } catch (err) {
        toolResultStrings.push(`[TOOL ERROR: mouse_click]: ${err.message}`);
      }
    }

    // 9. keyboard_type
    else if (action === "keyboard_type") {
      const text = attrs.text || body || "";
      try {
        await desktopApi.keyboardType(text);
        toolResultStrings.push(`[TOOL RESULT: keyboard_type]: Typed text.`);
        shouldFollowup = true;
      } catch (err) {
        toolResultStrings.push(`[TOOL ERROR: keyboard_type]: ${err.message}`);
      }
    }

    // 10. kill_process
    else if (action === "kill_process") {
      const pid = attrs.pid ? parseInt(attrs.pid, 10) : null;
      const name = (attrs.name || body || "").trim().replace(/^["']|["']$/g, "") || null;
      try {
        const res = await desktopApi.killProcess(pid, name);
        toolResultStrings.push(`[TOOL RESULT: kill_process]: ${res?.success ? "Terminated" : res?.error}`);
        shouldFollowup = true;
      } catch (err) {
        toolResultStrings.push(`[TOOL ERROR: kill_process]: ${err.message}`);
      }
    }
  }

  return {
    executedText: cleanUserFacingText(rawContent),
    toolResultText: toolResultStrings.join("\n\n"),
    shouldFollowup: shouldFollowup && toolResultStrings.length > 0,
  };
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
  const [thinkingExpandedMap, setThinkingExpandedMap] = useState({});
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
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleCaptureScreenVision = async () => {
    const desktopApi = typeof window !== "undefined" ? (window.oryxgenDesktop || window.electronAPI) : null;
    if (!desktopApi) return;
    try {
      if (desktopApi.startGlow) desktopApi.startGlow(1.5);
      const res = await desktopApi.takeScreenshot(0.8, null, true);
      if (res && res.success) {
        let ocrText = "";
        try {
          const ocrRes = await desktopApi.ocrScreen();
          if (ocrRes && ocrRes.text) ocrText = ocrRes.text;
        } catch { }

        const imgDataUrl = res.data_url || (res.base64 ? `data:image/png;base64,${res.base64}` : "");
        setAttachedImage({
          dataUrl: imgDataUrl,
          path: res.path,
          width: res.width,
          height: res.height,
          ocrText,
          name: "Ekran Skrinshoti",
          isScreenVision: true,
        });
      }
    } catch (err) {
      console.error("Screen vision capture error:", err);
    }
  };

  const handleImageFileSelect = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage({
        dataUrl: event.target.result,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setAttachedImage({
              dataUrl: event.target.result,
              name: file.name || "Clipboard Screenshot",
              size: file.size,
              type: file.type,
            });
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [searchModel, setSearchModel] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isBackendLoading, setIsBackendLoading] = useState(true);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const [showDesktopAuthBanner, setShowDesktopAuthBanner] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      const params = new URLSearchParams(window.location.search);
      if (params.has("auth_desktop")) {
        sessionStorage.setItem("auth_desktop_pending", "1");
        if (params.get("port")) sessionStorage.setItem("auth_desktop_port", params.get("port"));
        return true;
      }
      return !!sessionStorage.getItem("auth_desktop_pending");
    } catch {
      return false;
    }
  });

  const sendAuthToDesktop = async (user, token) => {
    if (!user) return;
    const targetToken = token || getAuthToken() || "auth_success";
    const userJson = encodeURIComponent(JSON.stringify(user));
    let port = "53281";
    try {
      port = sessionStorage.getItem("auth_desktop_port") || new URLSearchParams(window.location.search).get("port") || "53281";
    } catch {}

    // 1. Loopback HTTP fetch (Instant & guaranteed)
    try {
      await fetch(`http://127.0.0.1:${port}/auth_callback?token=${encodeURIComponent(targetToken)}&user=${userJson}`, {
        method: "GET",
        mode: "no-cors",
      });
    } catch {}

    // 2. Custom protocol launch
    const deepLinkUrl = `oryxgen://auth?token=${encodeURIComponent(targetToken)}&user=${userJson}`;
    try {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = deepLinkUrl;
      document.body.appendChild(iframe);
      setTimeout(() => iframe.remove(), 2500);
    } catch {}

    try {
      window.location.href = deepLinkUrl;
    } catch {}
  };

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const thinkingTimerRef = useRef(null);

  // Listen to deep-link authentication in Desktop mode
  useEffect(() => {
    const desktopApi = typeof window !== "undefined" ? (window.oryxgenDesktop || window.electronAPI) : null;
    if (!desktopApi) return;

    if (desktopApi.getPendingAuthDeepLink) {
      desktopApi.getPendingAuthDeepLink().then((data) => {
        if (data?.token && data?.user) {
          setAuthSession(data.token, data.user);
          setCurrentUser(data.user);
          setIsAuthOpen(false);
        } else if (data?.user) {
          setAuthSession("auth_success", data.user);
          setCurrentUser(data.user);
          setIsAuthOpen(false);
        }
      }).catch(() => { });
    }

    if (desktopApi.onAuthDeepLink) {
      const unsub = desktopApi.onAuthDeepLink((data) => {
        if (data?.token && data?.user) {
          setAuthSession(data.token, data.user);
          setCurrentUser(data.user);
          setIsAuthOpen(false);
        } else if (data?.user) {
          setAuthSession("auth_success", data.user);
          setCurrentUser(data.user);
          setIsAuthOpen(false);
        }
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      getUserSystemPrompt().then(prompt => {
        if (prompt && (!activeChat || activeChat.id === "chat-1" || !activeChat.messages || activeChat.messages.length === 0)) {
          setSystemPrompt(prompt);
          setActiveSkillId("custom");
        }
      });
    }
  }, [currentUser?.id]);

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
      let isDesktopPending = false;
      try {
        if (searchParams.has("auth_desktop")) {
          sessionStorage.setItem("auth_desktop_pending", "1");
          if (searchParams.get("port")) {
            sessionStorage.setItem("auth_desktop_port", searchParams.get("port"));
          }
          isDesktopPending = true;
        } else if (sessionStorage.getItem("auth_desktop_pending")) {
          isDesktopPending = true;
        }
      } catch {}

      const googleCode = searchParams.get("code");
      if (googleCode) {
        try {
          const authRes = await exchangeGoogleCode(googleCode, `${window.location.origin}/app`);
          if (authRes.user && mounted) {
            setCurrentUser(authRes.user);
            if (isDesktopPending) {
              sendAuthToDesktop(authRes.user, authRes.token);
            }
          }
        } catch (authErr) {
          console.warn("Google OAuth callback error:", authErr.message);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (isDesktopPending) {
        if (currentUser) {
          sendAuthToDesktop(currentUser, getAuthToken());
        } else {
          setIsAuthOpen(true);
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
    const rawInput = (customText || input).trim();
    if ((!rawInput && !attachedImage) || isStreaming) return;

    setInput("");

    // Detect if running in Desktop app
    const desktopApi = typeof window !== "undefined" ? (window.oryxgenDesktop || window.electronAPI) : null;

    let promptToSend = rawInput || (attachedImage ? "Ushbu tasvirni tahlil qiling va tushuntiring." : "");
    const sentImage = attachedImage?.dataUrl || null;
    if (attachedImage?.ocrText) {
      promptToSend = `${promptToSend}\n\n[📸 Ekrandan o'qilgan matn (OCR):\n${attachedImage.ocrText}]`;
    }
    setAttachedImage(null);

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const newMessages = [
      ...messages,
      { id: userMsgId, role: "user", content: promptToSend, image: sentImage, model: selectedModel },
    ];
    setMessages(newMessages);

    const persistUpdatedChat = (finalMessages, filesToSave) => {
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
              projectFiles: filesToSave || c.projectFiles,
            };
            saveUserChat(updatedChat);
            return updatedChat;
          }
          return c;
        });
        try { localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(updated)); } catch { }
        return updated;
      });
    };

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
    if (appMode === "codex") {
      return handleCodexGenerate(rawInput, newMessages, assistantMsgId);
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

      // Inject Native Windows Desktop context & tool calling schemas
      let desktopPromptContext = "";
      if (desktopApi) {
        const dPath = desktopApi.desktopPath || (desktopApi.userProfile ? `${desktopApi.userProfile}\\Desktop` : "C:\\Users\\user\\Desktop");
        const uProfile = desktopApi.userProfile || "C:\\Users\\user";
        const uName = desktopApi.username || "user";

        desktopPromptContext = `\n\n[NATIVE WINDOWS DESKTOP ENVIRONMENT]
You are running as the native Oryxgen Desktop AI Agent directly on this user's Windows computer.
Current User: ${uName}
User Profile: ${uProfile}
Desktop Folder: ${dPath}
Operating System: Windows 10/11

CRITICAL NATIVE SYSTEM INSTRUCTIONS:
- You HAVE DIRECT ACCESS to the user's computer via native desktop tools.
- NEVER claim that you do not have access to the computer, PC, files, or desktop. You DO have direct access.
- When the user asks about files, folders, running apps, desktop items, or running commands, invoke the appropriate XML tool tag in your response.

═══════════════════════════════════════
AVAILABLE TOOL TAGS (10 TOOLS):
═══════════════════════════════════════

1. RUN POWERSHELL COMMAND — Execute any real PowerShell or CMD command:
<run_command>Get-ChildItem -Path "${dPath}"</run_command>

More examples of REAL PowerShell commands:
<run_command>Get-ChildItem -Path "C:\\" -Directory</run_command>
<run_command>Get-Process | Select-Object -First 20 Name, Id, CPU</run_command>
<run_command>Get-Content -Path "C:\\Users\\${uName}\\Desktop\\file.txt"</run_command>
<run_command>Test-Path -Path "C:\\Users\\${uName}\\Documents"</run_command>
<run_command>[System.Environment]::OSVersion</run_command>
<run_command>Get-ComputerInfo | Select-Object WindowsVersion, OsArchitecture, CsTotalPhysicalMemory</run_command>
<run_command>Get-ChildItem -Path "${dPath}" -Recurse -File | Measure-Object -Property Length -Sum</run_command>

2. LIST DIRECTORY — Quick folder listing:
<list_dir path="${dPath}" />

3. READ FILE:
<read_file path="C:\\Users\\${uName}\\Desktop\\file.txt" />

4. WRITE FILE:
<write_file path="C:\\Users\\${uName}\\Desktop\\file.txt">content here</write_file>

5. LAUNCH APP:
<launch_app command="notepad.exe" />

6. SCREENSHOT:
<take_screenshot />

7. FOCUS WINDOW:
<focus_window query="Chrome" />

8. MOUSE CLICK:
<mouse_click x="500" y="300" button="left" />

9. KEYBOARD TYPE:
<keyboard_type text="hello" />

10. KILL PROCESS:
<kill_process name="notepad.exe" />

═══════════════════════════════════════
MANDATORY POWERSHELL RULES:
═══════════════════════════════════════
- ONLY use REAL PowerShell cmdlets that actually exist in Windows:
  ✅ Get-ChildItem, Get-Process, Stop-Process, Get-Content, Set-Content,
     Test-Path, Start-Process, Get-Service, Get-ComputerInfo,
     Measure-Object, Select-Object, Where-Object, Format-Table, dir, tasklist
- FORBIDDEN — these are NOT real commands, NEVER use them:
  ❌ cwd, pwd (use Get-Location instead), ls (use Get-ChildItem or dir)
- To list a specific folder, use -Path parameter: Get-ChildItem -Path "C:\\"
- Put the command INSIDE the tag body: <run_command>your command here</run_command>
- The system runs it in native 64-bit PowerShell (powershell.exe) and returns the real output.
- After receiving tool results, write a clean, natural-language answer in Uzbek. NEVER show raw XML tags or internal tool syntax to the user.\n\n`;
      }

      const finalSystemPrompt = identityPrefix + (desktopPromptContext || "") + (systemPrompt || "");

      await streamChat(
        {
          model: selectedModel,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content, image: m.image })),
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
        async () => {
          // --- Autonomous Desktop Tool Execution ---
          if (desktopApi) {
            const hasToolCalls = /<(?:tool_call>\s*)?(?:list_dir|run_command|terminal_run|read_file|write_file|launch_app|take_screenshot|screenshot|focus_window|mouse_click|keyboard_type|kill_process)/i.test(assistantContent);
            if (hasToolCalls) {
              try {
                const execution = await executeDesktopToolCalls(assistantContent, desktopApi);
                const cleanBaseText = execution?.executedText || cleanUserFacingText(assistantContent);

                if (execution && execution.shouldFollowup && execution.toolResultText) {
                  // Show clean status badge while preparing the final response (NO raw code blocks or XML tags!)
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? {
                            ...msg,
                            content: cleanBaseText
                              ? `${cleanBaseText}\n\n*⚡ Tizim tekshirilmoqda va javob tayyorlanmoqda...*`
                              : "*⚡ Tizim tekshirilmoqda va javob tayyorlanmoqda...*",
                          }
                        : msg
                    )
                  );

                  // Follow-up call so the LLM synthesizes a clean, natural-language Uzbek response
                  const toolFollowUpMessages = [
                    ...newMessages.map((m) => ({ role: m.role, content: m.content, image: m.image })),
                    { role: "assistant", content: cleanBaseText || "Tizim ma'lumotlari tahlil qilinmoqda..." },
                    {
                      role: "user",
                      content: `[KOMPYUTERDA BAJARILGAN AMAL VA NATIJALAR]:\n${execution.toolResultText}\n\nIltimos, yuqoridagi haqiqiy tizim natijalariga asoslanib, foydalanuvchining savoliga to'liq, aniq va chiroyli javob bering. Hech qanday ichki XML teglari, xom buyruqlar yoki texnik xatolik kodlarini foydalanuvchiga to'g'ridan-to'g'ri ko'rsatmang.`,
                    },
                  ];

                  let followUpText = "";
                  let followUpThinking = "";

                  await streamChat(
                    {
                      model: selectedModel,
                      messages: toolFollowUpMessages,
                      systemPrompt: finalSystemPrompt,
                      chatId: activeChatId,
                    },
                    (chunk) => {
                      followUpText += chunk;
                      const cleanFollowUp = cleanUserFacingText(followUpText);
                      const displayContent = cleanBaseText
                        ? `${cleanBaseText}\n\n${cleanFollowUp}`
                        : cleanFollowUp;

                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === assistantMsgId
                            ? {
                                ...msg,
                                content: displayContent,
                                thinking: followUpThinking || assistantThinking,
                              }
                            : msg
                        )
                      );
                    },
                    (thinkChunk) => {
                      followUpThinking += thinkChunk;
                    },
                    () => {
                      setIsStreaming(false);
                      const cleanFollowUp = cleanUserFacingText(followUpText);
                      let fullFinal = cleanBaseText
                        ? `${cleanBaseText}\n\n${cleanFollowUp}`
                        : cleanFollowUp;
                      if (!fullFinal.trim()) {
                        fullFinal = "Tizim ma'lumotlari muvaffaqiyatli tahlil qilindi.";
                      }

                      const finalMessages = [
                        ...newMessages,
                        { id: assistantMsgId, role: "assistant", content: fullFinal, thinking: followUpThinking || assistantThinking, model: selectedModel },
                      ];
                      setMessages(finalMessages);
                      persistUpdatedChat(finalMessages, projectFiles);
                    },
                    (errMsg) => {
                      setIsStreaming(false);
                      const finalMessages = [
                        ...newMessages,
                        { id: assistantMsgId, role: "assistant", content: cleanBaseText || "Tizim tahlili yakunlandi.", thinking: assistantThinking, model: selectedModel },
                      ];
                      setMessages(finalMessages);
                      persistUpdatedChat(finalMessages, projectFiles);
                    }
                  );
                  return;
                } else if (cleanBaseText) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: cleanBaseText }
                        : msg
                    )
                  );
                }
              } catch (toolErr) {
                console.error("Desktop tool execution error:", toolErr);
              }
            }
          }

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

          const finalMessages = [
            ...newMessages,
            { id: assistantMsgId, role: "assistant", content: assistantContent, thinking: assistantThinking, model: selectedModel },
          ];
          setMessages(finalMessages);
          persistUpdatedChat(finalMessages, filesChanged ? updatedFiles : projectFiles);
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
      {/* Desktop App Auth Redirect Banner for Web Users */}
      {showDesktopAuthBanner && currentUser && (
        <div className="desktop-auth-top-banner">
          <div className="desktop-auth-content">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <div className="desktop-auth-text">
              <strong>Oryxgen Desktop ilovasi uchun kirish tasdiqlandi:</strong>
              <span>{currentUser.name || currentUser.email} sifatida kirdingiz</span>
            </div>
            <button
              type="button"
              className="desktop-auth-open-btn"
              onClick={() => {
                sendAuthToDesktop(currentUser);
              }}
            >
              Desktop Ilovada Ochish ↗
            </button>
            <button
              type="button"
              className="desktop-auth-close-btn"
              onClick={() => setShowDesktopAuthBanner(false)}
              title="Yopish"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand">
            <img src="./Logo.png" alt="Oryxgen Logo" className="chat-brand-logo" />
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
          {typeof window !== "undefined" && Boolean(window.oryxgenDesktop || window.electronAPI) && (
            <button
              type="button"
              className="sidebar-tool-btn"
              onClick={() => setIsDeviceModalOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Device Access & Computer Use
            </button>
          )}
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
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="Avatar" className="user-avatar" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="user-avatar" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "50%", background: "#3b82f6", color: "#fff", fontWeight: "600", fontSize: "13px" }}>
                  {(currentUser.name || currentUser.email || "U")[0].toUpperCase()}
                </div>
              )}
              <div className="user-info-text">
                <div className="user-name">{currentUser.name || "Foydalanuvchi"}</div>
                <div className="user-sub">{currentUser.email || currentUser.phone || ""}</div>
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
      <div className={`chat-layout-content ${appMode === "codex" ? (isCodexCollapsed ? "codex-collapsed" : "codex-active") : ""}`}>
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
              {appMode === "codex" && isCodexCollapsed && (
                <button
                  type="button"
                  className="nav-btn-action codex-nav-open-btn"
                  onClick={toggleCodexCollapsed}
                  title="CodeX Workspace panelini ochish"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>CodeX IDE</span>
                </button>
              )}

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
              <button
                type="button"
                className="nav-btn-action nav-btn-api"
                onClick={() => setIsApiModalOpen(true)}
                title="Oryxgen AI Developer Platform & NPM CLI"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>API Platformasi</span>
              </button>
              {typeof window !== "undefined" && Boolean(window.oryxgenDesktop || window.electronAPI) && (
                <button
                  type="button"
                  className="nav-btn-action"
                  onClick={() => setIsDeviceModalOpen(true)}
                  title="Device Access & Computer Use"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span>Device Access</span>
                </button>
              )}
              <Link to="/image" className="nav-btn-action">
                Tasvir
              </Link>
              {typeof window !== "undefined" && !(window.oryxgenDesktop || window.electronAPI) && (
                <a
                  href="https://oryxgen-api.onrender.com/download/OryxgenSetup.exe"
                  download="OryxgenSetup.exe"
                  className="nav-btn-action"
                  title="Oryxgen AI Desktop ilovasini kompyuteringizga o'rnating (.exe)"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Desktop Ilova</span>
                </a>
              )}
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
                  <img src="./Logo.png" alt="Oryxgen Logo" className="empty-brand-logo" />
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
                {messages.map((m, idx) => {
                  const isLastStreaming = isStreaming && idx === messages.length - 1;
                  const { thinking: msgThinking, content: rawMsgContent } = extractThinkingAndContent(m.content, m.thinking);
                  const msgContent = m.role === "assistant" ? cleanUserFacingText(rawMsgContent) : rawMsgContent;
                  const isExpanded = isLastStreaming ? true : !!thinkingExpandedMap[m.id];
                  const hasThinking = Boolean(msgThinking && msgThinking.trim().length > 0);
                  return (
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
                        {hasThinking && (
                          <div className="thinking-accordion">
                            <button
                              type="button"
                              className="thinking-toggle-header"
                              onClick={() => setThinkingExpandedMap((prev) => ({ ...prev, [m.id]: !isExpanded }))}
                            >
                              <div className="thinking-status-indicator">
                                <span className={`pulse-dot ${isLastStreaming ? "active" : ""}`} />
                                <span>Mantiqiy tahlil jarayoni {isLastStreaming && `(${thinkingTime}s)`}</span>
                              </div>
                              <svg
                                viewBox="0 0 24 24"
                                width="14"
                                height="14"
                                fill="currentColor"
                                style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}
                              >
                                <path d="M7 10l5 5 5-5z" />
                              </svg>
                            </button>
                            {isExpanded && (
                              <div className="thinking-body">
                                <pre>{msgThinking}</pre>
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
                                  {codexPlan.isFallbackTemplate && (
                                    <span style={{ color: "#ef4444", marginLeft: "10px", fontSize: "11px", fontWeight: "bold" }}>⚠️ Standart Qolip</span>
                                  )}
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
                            {m.image && (
                              <div className="message-image-attachment">
                                <img
                                  src={m.image}
                                  alt="Biriktirilgan tasvir"
                                  className="message-attached-img"
                                  onClick={() => setZoomedImage(m.image)}
                                />
                              </div>
                            )}
                            {msgContent.split("```").map((part, idx) => {
                              if (idx % 2 === 1) {
                                const lines = part.split("\n");
                                const lang = lines[0].trim() || "code";
                                const code = lines.slice(1).join("\n");
                                const codeId = `${m.id}-${idx}`;

                                if (isDirectoryTreeCode(code)) {
                                  return (
                                    <StructureViewer
                                      key={codeId}
                                      code={code}
                                      lang={lang}
                                      codeId={codeId}
                                      onCopy={copyCode}
                                    />
                                  );
                                }

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
                  );
                })}

                {/* Real-time streaming thinking placeholder removed because main accordion handles it now */}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="chat-input-bar">
            {attachedImage && (
              <div className="attached-screenshot-preview">
                <div className="attached-screenshot-thumb-wrapper">
                  {attachedImage.dataUrl ? (
                    <img src={attachedImage.dataUrl} alt="Preview" className="attached-preview-thumb" />
                  ) : (
                    <span className="screenshot-icon">📸</span>
                  )}
                </div>
                <div className="attached-screenshot-info">
                  <span className="screenshot-title">{attachedImage.name || "Biriktirilgan Tasvir"}</span>
                  {attachedImage.width && attachedImage.height && (
                    <span className="screen-res-badge">{attachedImage.width}×{attachedImage.height}</span>
                  )}
                  {attachedImage.ocrText && (
                    <span className="ocr-badge">OCR: {attachedImage.ocrText.slice(0, 35)}...</span>
                  )}
                </div>
                <button
                  type="button"
                  className="remove-screenshot-btn"
                  onClick={() => setAttachedImage(null)}
                  title="O'chirish"
                >
                  ✕
                </button>
              </div>
            )}
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

                {/* File picker for images */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className={`action-screen-btn ${attachedImage && !attachedImage.isScreenVision ? "has-screen" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  title="Rasm biriktirish (PNG, JPG, WebP) yoki Ctrl+V bosing"
                  aria-label="Rasm biriktirish"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>

                {typeof window !== "undefined" && Boolean(window.oryxgenDesktop || window.electronAPI) && (
                  <button
                    type="button"
                    className={`action-screen-btn ${attachedImage?.isScreenVision ? "has-screen" : ""}`}
                    onClick={handleCaptureScreenVision}
                    title="Ekranni ko'rish va matnini tahlil qilish (Screen Vision)"
                    aria-label="Ekran tasvirini biriktirish"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </button>
                )}

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
                onPaste={handlePaste}
                rows={1}
              />
              <button
                type="button"
                className="send-btn"
                onClick={() => handleSendMessage()}
                disabled={(!input.trim() && !attachedImage) || isStreaming}
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
                onClick={async () => {
                  setIsSkillModalOpen(false);
                  if (currentUser) {
                    try {
                      await updateUserSystemPrompt(systemPrompt);
                      setCurrentUser({ ...currentUser, default_system_prompt: systemPrompt });
                    } catch (e) { }
                  }
                }}
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

      {/* Developer Platform & API Key Management Modal */}
      <ApiPlatformModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />

      {/* Desktop Device Access & Computer Use Modal */}
      <DesktopDeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />

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

      {/* Image Lightbox Modal */}
      {zoomedImage && (
        <div className="image-zoom-overlay" onClick={() => setZoomedImage(null)}>
          <div className="image-zoom-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="image-zoom-close" onClick={() => setZoomedImage(null)}>✕</button>
            <img src={zoomedImage} alt="Kattalashtirilgan rasm" className="image-zoom-preview" />
          </div>
        </div>
      )}
    </div>
  );
}