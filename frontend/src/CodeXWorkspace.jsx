import React, { useState, useEffect } from "react";
import JSZip from "jszip";

// In-Browser Multi-File Sandbox Builder for React & Web Projects
export function buildMultiFileSandboxHtml(files = {}) {
  const fileKeys = Object.keys(files);
  if (fileKeys.length === 0) {
    return `<!DOCTYPE html><html><body style="background:#09090b;color:#71717a;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;margin:0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3f3f46" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></svg><p style="margin-top:14px;font-size:14px;">Loyiha fayllari hali mavjud emas. CodeX orqali biror g'oya bering.</p></body></html>`;
  }

  // 1. Identify main entry file and CSS files
  const mainFileKey = fileKeys.find(
    (k) => k.endsWith("App.jsx") || k.endsWith("App.js") || k.endsWith("index.jsx") || k.endsWith("index.html")
  ) || fileKeys[0];

  const customCss = Object.entries(files)
    .filter(([name]) => name.endsWith(".css"))
    .map(([, content]) => content)
    .join("\n");

  // Pure HTML mode
  if (mainFileKey.endsWith(".html") && !files[mainFileKey].includes("export default") && !files[mainFileKey].includes("React")) {
    return files[mainFileKey];
  }

  // 2. Prepare all JS/JSX files into a bundle registry
  // Escape backticks and template literals safely for inlined script
  const serializedFiles = JSON.stringify(files);

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
          const projectFiles = ${serializedFiles};
          const moduleRegistry = {};

          // Helper to normalize relative import paths
          function resolveModulePath(currentPath, importPath) {
            if (!importPath.startsWith('.')) return importPath;
            const parts = currentPath.split('/');
            parts.pop(); // remove current filename
            const segs = importPath.split('/');
            for (const seg of segs) {
              if (seg === '.') continue;
              if (seg === '..') parts.pop();
              else parts.push(seg);
            }
            const base = parts.join('/');
            // Try with extensions
            for (const ext of ['', '.jsx', '.js', '.tsx', '.ts', '.css']) {
              const candidate = base + ext;
              if (projectFiles[candidate] !== undefined) return candidate;
              const srcCandidate = 'src/' + base + ext;
              if (projectFiles[srcCandidate] !== undefined) return srcCandidate;
            }
            return base;
          }

          // Compile each file
          for (const [filePath, code] of Object.entries(projectFiles)) {
            if (filePath.endsWith('.css') || filePath.endsWith('.json') || filePath.endsWith('.md')) continue;

            // Strip imports and standard exports for simple browser execution
            let transformed = code
              .replace(/import\\s+React(?:,\\s*\\{[^}]*\\})?\\s+from\\s+['"][^'"]+['"];?/g, '')
              .replace(/import\\s+['"][^'"]+['"];?/g, '')
              .replace(/import\\s+([A-Za-z0-9_]+)\\s+from\\s+['"][^'"]+['"];?/g, '')
              .replace(/import\\s+\\{([^}]+)\\}\\s+from\\s+['"][^'"]+['"];?/g, '')
              .replace(/export\\s+default\\s+function\\s+([A-Za-z0-9_]+)/g, 'function $1')
              .replace(/export\\s+default\\s+([A-Za-z0-9_]+);?/g, '')
              .replace(/export\\s+const\\s+/g, 'const ')
              .replace(/export\\s+function\\s+/g, 'function ')
              .replace(/export\\s+/g, '');

            try {
              // Evaluate module in global scope
              const transpiled = Babel.transform(transformed, { presets: ['react'] }).code;
              const fn = new Function('React', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', transpiled);
              fn(React, React.useState, React.useEffect, React.useRef, React.useMemo, React.useCallback);
            } catch (moduleErr) {
              console.warn("Module evaluation warning for " + filePath + ":", moduleErr);
            }
          }

          // Find root component
          const ComponentToRender = typeof App !== 'undefined' ? App : (typeof main !== 'undefined' ? main : null);
          if (ComponentToRender) {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<ComponentToRender />);
          } else {
            const entryCode = projectFiles["${mainFileKey}"] || Object.values(projectFiles)[0] || "";
            document.getElementById('root').innerHTML = \`<div style="padding:24px;font-family:sans-serif;"><h3>\${entryCode.slice(0, 100)}</h3></div>\`;
          }
        } catch (err) {
          document.getElementById('root').innerHTML = '<div style="color:#ef4444;background:#fef2f2;padding:24px;border:1px solid #fecaca;border-radius:12px;margin:20px;font-family:monospace;"><strong>Ishga tushirishda xatolik yuz berdi:</strong><br/><pre style="white-space:pre-wrap;margin-top:10px;">' + err.message + '</pre></div>';
        }
      </script>
    </body>
    </html>
  `;
}

// Minimal Syntax Formatter / Highlighter
function formatCodeWithTokens(code = "", language = "javascript") {
  if (!code) return "";
  // Escape HTML
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Highlight comments
  let highlighted = escaped
    .replace(/(\/\/[^\n]*)/g, '<span class="tok-comment">$1</span>')
    .replace(/(#\s[^\n]*)/g, '<span class="tok-comment">$1</span>')
    // Strings
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="tok-string">$1</span>')
    // Keywords
    .replace(/\b(import|export|from|default|function|const|let|var|return|if|else|async|await|try|catch|class|def|import|from|as|while|for|in|class)\b/g, '<span class="tok-keyword">$1</span>')
    // Built-ins & React
    .replace(/\b(React|useState|useEffect|useRef|useMemo|console|document|window|ApplicationBuilder|Update|CommandHandler|Flask|jsonify)\b/g, '<span class="tok-builtin">$1</span>')
    // Numbers
    .replace(/\b(\d+)\b/g, '<span class="tok-number">$1</span>');

  return highlighted;
}

export default function CodeXWorkspace({
  projectFiles = {},
  plan = null,
  activeChatTitle = "CodeX App",
  isCollapsed = false,
  onToggleCollapse = () => {},
}) {
  const [activeTab, setActiveTab] = useState("preview"); // "preview" | "code"
  const [deviceWidth, setDeviceWidth] = useState("100%"); // "100%" | "768px" | "375px"
  const [openTabs, setOpenTabs] = useState([]);
  const [activeFile, setActiveFile] = useState("");
  const [copiedFile, setCopiedFile] = useState(false);
  const [showDeployGuide, setShowDeployGuide] = useState(false);

  const fileKeys = Object.keys(projectFiles);
  const isBackendOrBot = plan?.projectType === "backend" || plan?.projectType === "bot" || plan?.stack?.includes("python") || plan?.stack?.includes("node-express");

  useEffect(() => {
    if (fileKeys.length > 0) {
      if (!activeFile || !projectFiles[activeFile]) {
        const defaultFile = fileKeys.find((k) => k.endsWith("App.jsx") || k.endsWith("bot.py") || k.endsWith("server.js") || k.endsWith("app.py")) || fileKeys[0];
        setActiveFile(defaultFile);
        if (!openTabs.includes(defaultFile)) {
          setOpenTabs([defaultFile]);
        }
      }
    }
  }, [fileKeys.length, activeFile]);

  const handleSelectFile = (fileKey) => {
    setActiveFile(fileKey);
    if (!openTabs.includes(fileKey)) {
      setOpenTabs([...openTabs, fileKey]);
    }
    setActiveTab("code");
  };

  const handleCloseTab = (e, fileKey) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t !== fileKey);
    setOpenTabs(remaining);
    if (activeFile === fileKey) {
      setActiveFile(remaining[remaining.length - 1] || fileKeys[0] || "");
    }
  };

  const handleCopyCode = () => {
    const code = projectFiles[activeFile] || "";
    navigator.clipboard.writeText(code);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleDownloadZip = async () => {
    const filesToZip = fileKeys.length > 0 ? projectFiles : { "App.jsx": "// CodeX App" };
    const zip = new JSZip();
    Object.entries(filesToZip).forEach(([filePath, content]) => {
      zip.file(filePath, content);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const cleanTitle = (activeChatTitle || "codex-project").replace(/[^a-zA-Z0-9_\-]/g, "_");
    a.download = `${cleanTitle}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isCollapsed) {
    return (
      <button
        type="button"
        className="codex-expand-btn"
        onClick={onToggleCollapse}
        title="CodeX Workspace panelini ochish"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span>CodeX IDE</span>
      </button>
    );
  }

  const currentCode = projectFiles[activeFile] || "// Fayl tanlanmagan yoki kod bo'sh";
  const codeLines = currentCode.split("\n");

  return (
    <aside className="codex-side-panel">
      {/* Workspace Header */}
      <div className="codex-panel-header">
        <div className="codex-tabs-group">
          <button
            type="button"
            className={`codex-tab-btn ${activeTab === "preview" ? "active" : ""}`}
            onClick={() => setActiveTab("preview")}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview
          </button>
          <button
            type="button"
            className={`codex-tab-btn ${activeTab === "code" ? "active" : ""}`}
            onClick={() => setActiveTab("code")}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            Code ({fileKeys.length})
          </button>
        </div>

        <div className="codex-header-actions">
          {activeTab === "preview" && !isBackendOrBot && (
            <div className="codex-preview-device-toggle">
              <button
                type="button"
                className={`device-toggle-btn ${deviceWidth === "100%" ? "active" : ""}`}
                onClick={() => setDeviceWidth("100%")}
                title="Desktop"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </button>
              <button
                type="button"
                className={`device-toggle-btn ${deviceWidth === "768px" ? "active" : ""}`}
                onClick={() => setDeviceWidth("768px")}
                title="Planshet"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
                </svg>
              </button>
              <button
                type="button"
                className={`device-toggle-btn ${deviceWidth === "375px" ? "active" : ""}`}
                onClick={() => setDeviceWidth("375px")}
                title="Mobil"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
                </svg>
              </button>
            </div>
          )}

          <button
            type="button"
            className="codex-zip-btn"
            onClick={handleDownloadZip}
            title="Barcha fayllarni ZIP arxiv sifatida yuklab olish"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            ZIP Yuklab olish
          </button>

          <button
            type="button"
            className="codex-collapse-toggle-btn"
            onClick={onToggleCollapse}
            title="Panelni yopish (to'liq chat rejimi)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Workspace Body */}
      <div className="codex-panel-body">
        {activeTab === "preview" ? (
          isBackendOrBot ? (
            /* Backend / Bot Project Overview & Deploy Screen */
            <div className="codex-backend-preview-screen">
              <div className="backend-preview-card">
                <div className="backend-icon-badge">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#60a5fa" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                </div>
                <h3>{plan?.title || "Backend / Telegram Bot Loyihasi"}</h3>
                <p className="backend-desc">
                  Ushbu loyiha <strong>{plan?.stack || "Python/Node"}</strong> muhitida mustaqil server yoki bot sifatida ishlaydi.
                </p>

                <div className="backend-meta-grid">
                  <div className="meta-card">
                    <span className="meta-label">Stack:</span>
                    <strong>{plan?.stack || "Custom"}</strong>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Ishga tushirish buyrug'i:</span>
                    <code>{plan?.runCommand || "python bot.py"}</code>
                  </div>
                  <div className="meta-card">
                    <span className="meta-label">Yaratilgan fayllar:</span>
                    <strong>{fileKeys.length} ta fayl</strong>
                  </div>
                </div>

                <div className="backend-actions-row">
                  <button
                    type="button"
                    className="view-code-btn"
                    onClick={() => setActiveTab("code")}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    Fayllar kodini ko'rish
                  </button>
                  <button
                    type="button"
                    className="deploy-guide-btn"
                    onClick={() => setShowDeployGuide(!showDeployGuide)}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Serverga Deploy qilish
                  </button>
                </div>

                {showDeployGuide && (
                  <div className="deploy-guide-box">
                    <h4>Render.com yoki VPS da bepul ishga tushirish:</h4>
                    <ol>
                      <li>Yuqoridagi <strong>"ZIP Yuklab olish"</strong> tugmasi orqali kodni oling.</li>
                      <li>GitHub repozitoriyangizga push qiling.</li>
                      <li>Render.com da yangi <strong>Web Service</strong> yoki <strong>Background Worker</strong> yarating.</li>
                      <li>Environment variables bo'limiga bot tokeni yoki maxfiy kalitlarni kiriting va Start Command ga <code>{plan?.runCommand || "python bot.py"}</code> yozing.</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Live Multi-File Frontend Sandbox */
            <div className="codex-preview-view">
              <div className="codex-iframe-wrapper" style={{ width: deviceWidth }}>
                <iframe
                  srcDoc={buildMultiFileSandboxHtml(projectFiles)}
                  title="CodeX Multi-File Live Sandbox"
                  className="codex-preview-iframe"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                />
              </div>
            </div>
          )
        ) : (
          /* Multi-File Code Explorer & Syntax Editor */
          <div className="codex-code-explorer">
            {/* File Explorer Tree */}
            <div className="codex-file-sidebar">
              <div className="codex-file-sidebar-title">
                <span>Loyiha fayllari ({fileKeys.length})</span>
              </div>
              <div className="codex-file-list">
                {fileKeys.length === 0 ? (
                  <div className="codex-empty-file-note">Fayllar mavjud emas</div>
                ) : (
                  fileKeys.map((fKey) => (
                    <button
                      key={fKey}
                      type="button"
                      className={`codex-file-item ${activeFile === fKey ? "active" : ""}`}
                      onClick={() => handleSelectFile(fKey)}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="file-name-text">{fKey}</span>
                      <span className="file-status-dot" title="Sintaksis tasdiqlangan" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Code Viewer Panel */}
            <div className="codex-code-editor-area">
              {/* File Tabs Bar */}
              <div className="codex-tabs-bar">
                {openTabs.map((tKey) => (
                  <div
                    key={tKey}
                    className={`editor-file-tab ${activeFile === tKey ? "active" : ""}`}
                    onClick={() => setActiveFile(tKey)}
                  >
                    <span>{tKey.split("/").pop()}</span>
                    <button
                      type="button"
                      className="tab-close-icon"
                      onClick={(e) => handleCloseTab(e, tKey)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Editor Sub-Header */}
              <div className="codex-editor-topbar">
                <div className="codex-current-filename">
                  <span>{activeFile || "Fayl"}</span>
                </div>
                <button
                  type="button"
                  className="codex-copy-file-btn"
                  onClick={handleCopyCode}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {copiedFile ? "Nusxalandi" : "Nusxalash"}
                </button>
              </div>

              {/* Syntax Highlighted Editor with Line Numbers */}
              <div className="codex-editor-content-wrapper">
                <div className="line-numbers-gutter">
                  {codeLines.map((_, idx) => (
                    <span key={idx}>{idx + 1}</span>
                  ))}
                </div>
                <pre
                  className="codex-code-content-pre"
                  dangerouslySetInnerHTML={{ __html: formatCodeWithTokens(currentCode) }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
