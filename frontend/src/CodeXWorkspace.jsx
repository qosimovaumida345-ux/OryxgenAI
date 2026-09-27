import React, { useState, useEffect } from "react";
import JSZip from "jszip";

// In-Browser Multi-File Sandbox Builder for React & Web Projects
export function buildMultiFileSandboxHtml(files = {}) {
  const fileKeys = Object.keys(files);
  if (fileKeys.length === 0) {
    return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>CodeX Sandbox</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #09090b;
      color: #94a3b8;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .empty-card {
      max-width: 400px;
      padding: 32px 24px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .icon-box {
      width: 52px;
      height: 52px;
      margin-bottom: 16px;
      border-radius: 12px;
      background: rgba(37, 99, 235, 0.1);
      border: 1px solid rgba(37, 99, 235, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #60a5fa;
    }
    h3 {
      margin: 0 0 8px;
      color: #f1f5f9;
      font-size: 16px;
      font-weight: 600;
    }
    p {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="empty-card">
    <div class="icon-box">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M9 3v18M3 9h18"/>
      </svg>
    </div>
    <h3>CodeX Sandbox Tayyor</h3>
    <p>Loyiha fayllari hali mavjud emas. CodeX rejimida chat orqali biror g'oya bering (masalan: <i>"Zamonaviy hisob-kitob ilovasi yarat"</i>).</p>
  </div>
</body>
</html>`;
  }

  // Pure HTML mode
  const indexHtmlKey = fileKeys.find((k) => k.endsWith("index.html"));
  if (indexHtmlKey && !files[indexHtmlKey].includes("export default") && !files[indexHtmlKey].includes("ReactDOM")) {
    return files[indexHtmlKey];
  }

  // 1. Gather all CSS
  const customCss = Object.entries(files)
    .filter(([name]) => name.endsWith(".css"))
    .map(([, content]) => content)
    .join("\n");

  // 2. Identify and order code files:
  // Exclude scaffolds (index.html, main.jsx, configs, etc.) from in-browser concatenation
  const codeEntries = Object.entries(files).filter(
    ([name]) =>
      /\.(jsx?|tsx?)$/i.test(name) &&
      !name.endsWith(".d.ts") &&
      !name.endsWith("main.jsx") &&
      !name.endsWith("main.js") &&
      !name.includes("vite.config") &&
      !name.includes("tailwind.config") &&
      !name.includes("postcss.config")
  );

  const scoreFile = (path) => {
    const lower = path.toLowerCase();
    if (lower.includes("app.jsx") || lower.includes("app.js")) return 100;
    if (lower.includes("component")) return 50;
    if (lower.includes("context") || lower.includes("store")) return 30;
    if (lower.includes("hook")) return 20;
    if (lower.includes("service") || lower.includes("util") || lower.includes("storage")) return 10;
    return 40;
  };

  codeEntries.sort((a, b) => scoreFile(a[0]) - scoreFile(b[0]));

  // 3. Transform and concatenate code files into a single unified script block
  const transformedModules = codeEntries
    .map(([path, code]) => {
      let transformed = code
        // Strip all import statements (single-line or multi-line)
        .replace(/import\s+(?:type\s+)?[\s\S]*?from\s+['"][^'"]+['"];?/g, "")
        .replace(/import\s+['"][^'"]+['"];?/g, "")
        // Convert exports to declarations
        .replace(/export\s+default\s+function\s*([A-Za-z0-9_]*)/g, "function $1")
        .replace(/export\s+default\s+class\s*([A-Za-z0-9_]*)/g, "class $1")
        .replace(/export\s+default\s+([A-Za-z0-9_]+);?/g, "/* export default $1 */")
        .replace(/export\s+const\s+/g, "const ")
        .replace(/export\s+let\s+/g, "let ")
        .replace(/export\s+var\s+/g, "var ")
        .replace(/export\s+function\s+/g, "function ")
        .replace(/export\s+class\s+/g, "class ")
        .replace(/export\s+\{[^}]*\};?/g, "")
        .replace(/export\s+/g, "");

      return `\n// --- File: ${path} ---\n${transformed}\n`;
    })
    .join("\n");

  return `
    <!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CodeX Live Preview</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f8fafc; }
        * { box-sizing: border-box; }
        ${customCss}
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="text/babel">
        try {
          const { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext } = React;

          // Utility Polyfills
          window.clsx = (...args) => args.flat().filter(Boolean).join(' ');
          window.cn = window.clsx;

          // Universal Safe Lucide Icon Component Generator
          function createSafeIcon(name) {
            return (props) => {
              const size = props?.size || 18;
              const strokeWidth = props?.strokeWidth || 2;
              const className = props?.className || '';
              return React.createElement('svg', {
                ...props,
                viewBox: '0 0 24 24',
                width: size,
                height: size,
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: strokeWidth,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
                className: 'inline-block align-middle ' + className
              },
                name.includes('Search') ? React.createElement(React.Fragment, null, React.createElement('circle', { cx: 11, cy: 11, r: 8 }), React.createElement('line', { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })) :
                name.includes('Cart') || name.includes('Bag') ? React.createElement(React.Fragment, null, React.createElement('circle', { cx: 9, cy: 21, r: 1 }), React.createElement('circle', { cx: 20, cy: 21, r: 1 }), React.createElement('path', { d: 'M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6' })) :
                name.includes('Trash') ? React.createElement(React.Fragment, null, React.createElement('polyline', { points: '3 6 5 6 21 6' }), React.createElement('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' })) :
                name.includes('Check') ? React.createElement('polyline', { points: '20 6 9 17 4 12' }) :
                name.includes('Plus') ? React.createElement(React.Fragment, null, React.createElement('line', { x1: 12, y1: 5, x2: 12, y2: 19 }), React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 })) :
                name.includes('Minus') ? React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 }) :
                name.includes('X') || name.includes('Close') ? React.createElement(React.Fragment, null, React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 }), React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 })) :
                name.includes('Edit') ? React.createElement(React.Fragment, null, React.createElement('path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }), React.createElement('path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' })) :
                name.includes('Star') ? React.createElement('polygon', { points: '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' }) :
                name.includes('Heart') ? React.createElement('path', { d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' }) :
                name.includes('Arrow') && name.includes('Right') ? React.createElement(React.Fragment, null, React.createElement('line', { x1: 5, y1: 12, x2: 19, y2: 12 }), React.createElement('polyline', { points: '12 5 19 12 12 19' })) :
                name.includes('Arrow') && name.includes('Left') ? React.createElement(React.Fragment, null, React.createElement('line', { x1: 19, y1: 12, x2: 5, y2: 12 }), React.createElement('polyline', { points: '12 19 5 12 12 5' })) :
                name.includes('Chevron') && name.includes('Down') ? React.createElement('polyline', { points: '6 9 12 15 18 9' }) :
                name.includes('Chevron') && name.includes('Up') ? React.createElement('polyline', { points: '18 15 12 9 6 15' }) :
                name.includes('Chevron') && name.includes('Right') ? React.createElement('polyline', { points: '9 18 15 12 9 6' }) :
                name.includes('Chevron') && name.includes('Left') ? React.createElement('polyline', { points: '15 18 9 12 15 6' }) :
                name.includes('User') ? React.createElement(React.Fragment, null, React.createElement('path', { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }), React.createElement('circle', { cx: 12, cy: 7, r: 4 })) :
                name.includes('Settings') ? React.createElement(React.Fragment, null, React.createElement('circle', { cx: 12, cy: 12, r: 3 }), React.createElement('path', { d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' })) :
                name.includes('Filter') ? React.createElement('polygon', { points: '22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' }) :
                name.includes('Send') ? React.createElement(React.Fragment, null, React.createElement('line', { x1: 22, y1: 2, x2: 11, y2: 13 }), React.createElement('polygon', { points: '22 2 15 22 11 13 2 9 22 2' })) :
                name.includes('Bell') ? React.createElement(React.Fragment, null, React.createElement('path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }), React.createElement('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })) :
                React.createElement('circle', { cx: 12, cy: 12, r: 8 })
              );
            };
          }

          // Register all PascalCase JSX tags in window so ANY Lucide icon works!
          const allCode = ${JSON.stringify(transformedModules)};
          const potentialIcons = (allCode.match(/<([A-Z][a-zA-Z0-9]+)/g) || [])
            .map(s => s.replace('<', ''))
            .filter(name => !['App', 'React', 'Fragment'].includes(name));
          
          potentialIcons.forEach(iconName => {
            if (typeof window[iconName] === 'undefined') {
              window[iconName] = createSafeIcon(iconName);
            }
          });

          // Concatenated project modules
          ${transformedModules}

          // Locate root component
          const ComponentToRender = typeof App !== 'undefined' ? App : (typeof main !== 'undefined' ? main : null);
          if (ComponentToRender) {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<ComponentToRender />);
          } else {
            document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif;color:#6b7280;"><h3>Interfeys yuklandi</h3><p>App komponenti topilmadi.</p></div>';
          }
        } catch (err) {
          console.error("Live Preview Sandbox Error:", err);
          document.getElementById('root').innerHTML = '<div style="color:#ef4444;background:#18181b;padding:24px;border:1px solid #3f3f46;border-radius:12px;margin:20px;font-family:monospace;"><strong>Ishga tushirishda xatolik:</strong><br/><pre style="white-space:pre-wrap;margin-top:10px;color:#fca5a5;">' + err.message + '</pre></div>';
        }
      </script>
    </body>
    </html>
  `;
}

// Minimal Syntax Formatter / Highlighter
function formatCodeWithTokens(code = "", language = "javascript") {
  if (!code) return "";
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  let highlighted = escaped
    .replace(/(\/\/[^\n]*)/g, '<span class="tok-comment">$1</span>')
    .replace(/(#\s[^\n]*)/g, '<span class="tok-comment">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="tok-string">$1</span>')
    .replace(/\b(import|export|from|default|function|const|let|var|return|if|else|async|await|try|catch|class|def|as|while|for|in)\b/g, '<span class="tok-keyword">$1</span>')
    .replace(/\b(React|useState|useEffect|useRef|useMemo|console|document|window|ApplicationBuilder|Update|CommandHandler|Flask|jsonify)\b/g, '<span class="tok-builtin">$1</span>')
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
    const filesToZip = { ...projectFiles };
    const cleanTitle = (activeChatTitle || "codex-project").replace(/[^a-zA-Z0-9_\-]/g, "_");
    const cleanName = cleanTitle.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "") || "codex-app";

    // Guarantee that standard Vite + React scaffold files are present to prevent 404 in localhost:5173
    if (!isBackendOrBot) {
      if (!filesToZip["index.html"]) {
        filesToZip["index.html"] = `<!DOCTYPE html>
<html lang="uz">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${activeChatTitle || "Oryxgen App"}</title>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;
      }

      if (!filesToZip["src/main.jsx"] && !filesToZip["main.jsx"]) {
        filesToZip["src/main.jsx"] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;
      }

      if (!filesToZip["vite.config.js"]) {
        filesToZip["vite.config.js"] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
`;
      }

      if (!filesToZip["package.json"]) {
        filesToZip["package.json"] = JSON.stringify({
          name: cleanName,
          private: true,
          version: "1.0.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview"
          },
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
            "lucide-react": "^0.460.0",
            clsx: "^2.1.1",
            "tailwind-merge": "^2.5.5"
          },
          devDependencies: {
            "@vitejs/plugin-react": "^4.3.4",
            vite: "^6.0.0",
            tailwindcss: "^3.4.15",
            postcss: "^8.4.49",
            autoprefixer: "^10.4.20"
          }
        }, null, 2);
      }

      if (!filesToZip["tailwind.config.js"]) {
        filesToZip["tailwind.config.js"] = `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
`;
      }

      if (!filesToZip["postcss.config.js"]) {
        filesToZip["postcss.config.js"] = `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
`;
      }

      if (!filesToZip["src/index.css"] && !filesToZip["index.css"]) {
        filesToZip["src/index.css"] = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #09090b;
  color: #f8fafc;
}
`;
      }

      if (!filesToZip["README.md"]) {
        filesToZip["README.md"] = `# ${activeChatTitle || "Oryxgen App"}

## Ishga tushirish (Local Development)

1. Kutubxonalarni o'rnatish:
\`\`\`bash
npm install
\`\`\`

2. Dasturni ishga tushirish:
\`\`\`bash
npm run dev
\`\`\`

Brauzeringizda quyidagi manzilni oching:
👉 **http://localhost:5173**
`;
      }
    }

    const zip = new JSZip();
    Object.entries(filesToZip).forEach(([filePath, content]) => {
      zip.file(filePath, content);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cleanTitle}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isCollapsed) {
    return (
      <aside className="codex-collapsed-strip">
        <button
          type="button"
          className="codex-expand-btn"
          onClick={onToggleCollapse}
          title="CodeX Workspace panelini ochish"
          aria-label="CodeX Workspace panelini ochish"
        >
          <div className="codex-expand-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </div>
          <span className="codex-expand-text">CodeX IDE</span>
        </button>
      </aside>
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
