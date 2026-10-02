import React, { useState, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  FileJson,
  Server,
  Monitor,
  Database,
  Shield,
  Layers,
  Box,
  GitBranch,
  Container,
  TestTube,
  Settings,
  Check,
  Copy,
  ChevronDown,
  ChevronRight,
  Search,
  Code2,
  Sparkles,
  Filter,
  Eye,
  FileTerminal,
} from "lucide-react";
import "./StructureViewer.css";

// Check if a code string represents a directory/architecture tree
export function isDirectoryTreeCode(code = "") {
  if (!code || typeof code !== "string") return false;
  const lines = code.trim().split("\n");
  if (lines.length < 3) return false;

  // Never match terminal outputs, PowerShell error stack traces, or command logs
  if (
    code.includes("CategoryInfo") ||
    code.includes("FullyQualifiedErrorId") ||
    code.includes("The term '") ||
    code.includes("CommandNotFoundException") ||
    code.includes("Terminal") ||
    code.includes("powershell") ||
    code.includes("CMD") ||
    code.includes("bash:") ||
    code.includes("Traceback (most recent call last)")
  ) {
    return false;
  }

  let treeMarkers = 0;
  for (const line of lines) {
    // Only true box-drawing tree characters or structured directory notations
    if (/[├──└──│──]/.test(line) || /^[│|\s]*[├└]──\s*\S+/.test(line)) {
      treeMarkers++;
    }
  }
  return treeMarkers >= 2;
}

function stripEmojis(str = "") {
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Hierarchical directory tree parser with ancestor category inheritance
function parseTree(treeText) {
  const lines = treeText.trim().split("\n");
  const nodes = [];
  const parentStack = []; // [{ depth, category, fullPath }]

  let rootTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) continue;

    // Detect indent / tree characters
    const treeMatch = rawLine.match(/^([\s│├──└──\t|\\-]+)(.*)$/);
    let prefix = "";
    let rest = rawLine;

    if (treeMatch && /[├──└──│|\\]/.test(treeMatch[1])) {
      prefix = treeMatch[1];
      rest = treeMatch[2];
    } else {
      const leadSpaces = rawLine.match(/^(\s*)(.*)$/);
      if (leadSpaces && leadSpaces[1]) {
        prefix = leadSpaces[1];
        rest = leadSpaces[2];
      }
    }

    let name = rest.trim();
    let comment = "";
    const hashIndex = name.indexOf("#");
    if (hashIndex !== -1) {
      comment = stripEmojis(name.substring(hashIndex + 1).trim());
      name = name.substring(0, hashIndex).trim();
    }

    if (!name) continue;

    if (!rootTitle && (name.endsWith("/") || i === 0)) {
      rootTitle = name;
    }

    // Calculate depth
    const cleanPrefix = prefix.replace(/\t/g, "    ");
    const bars = (cleanPrefix.match(/[│|]/g) || []).length;
    const branches = (cleanPrefix.match(/[├──└──\\-]/g) || []).length > 0 ? 1 : 0;
    const spaces = cleanPrefix.replace(/[│├──└──\-|]/g, "").length;
    let depth = bars + branches + Math.floor(spaces / 3);
    if (depth < 0) depth = 0;

    const isDir = name.endsWith("/") || (!name.includes(".") && !name.includes("-config") && !comment.toLowerCase().includes("file"));

    // Detect explicit category
    const fullContext = (name + " " + comment).toLowerCase();
    let explicitCategory = null;

    if (fullContext.includes("admin")) {
      explicitCategory = "ADMIN";
    } else if (fullContext.includes("package") || fullContext.includes("packages") || fullContext.includes("shared")) {
      explicitCategory = "PACKAGES";
    } else if (
      fullContext.includes("web/") ||
      fullContext.includes("frontend") ||
      fullContext.includes("react") ||
      fullContext.includes("next.js") ||
      fullContext.includes("components/") ||
      fullContext.includes("pages/") ||
      fullContext.includes("(shop)") ||
      fullContext.includes("(dashboard)") ||
      fullContext.includes("(auth)")
    ) {
      explicitCategory = "FRONTEND";
    } else if (
      fullContext.includes("api/") ||
      fullContext.includes("backend") ||
      fullContext.includes("nest") ||
      fullContext.includes("controller") ||
      fullContext.includes("service") ||
      fullContext.includes("module") ||
      fullContext.includes("guard") ||
      fullContext.includes("interceptor") ||
      fullContext.includes("pipe")
    ) {
      explicitCategory = "BACKEND";
    } else if (
      fullContext.includes("prisma") ||
      fullContext.includes("database") ||
      fullContext.includes("postgres") ||
      fullContext.includes("redis") ||
      fullContext.includes("schema.prisma")
    ) {
      explicitCategory = "DATABASE";
    } else if (
      fullContext.includes("docker") ||
      fullContext.includes("github") ||
      fullContext.includes("workflow") ||
      fullContext.includes("husky") ||
      fullContext.includes("ci/cd") ||
      fullContext.includes("k8s")
    ) {
      explicitCategory = "DEVOPS";
    } else if (fullContext.includes("test") || fullContext.includes("e2e") || fullContext.includes("jest") || fullContext.includes("vitest")) {
      explicitCategory = "TESTS";
    } else if (
      fullContext.includes("config") ||
      fullContext.includes("eslint") ||
      fullContext.includes("tsconfig") ||
      fullContext.includes("tailwind") ||
      fullContext.includes(".env")
    ) {
      explicitCategory = "CONFIG";
    }

    // Maintain parent stack to inherit parent's domain category
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].depth >= depth) {
      parentStack.pop();
    }

    const parentCategory = parentStack.length > 0 ? parentStack[parentStack.length - 1].category : "GENERAL";
    const finalCategory = explicitCategory || (parentCategory !== "GENERAL" ? parentCategory : "GENERAL");

    const parentPath = parentStack.map((p) => p.name).join("");
    const currentFullPath = parentPath + name;

    if (isDir) {
      parentStack.push({ depth, category: finalCategory, name });
    }

    nodes.push({
      id: `node-${i}`,
      raw: rawLine,
      name,
      comment,
      isDir,
      depth,
      category: finalCategory,
      fullPath: currentFullPath,
    });
  }

  return { nodes, rootTitle };
}

const CATEGORY_META = {
  ALL: { label: "Barchasi", icon: Layers, color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)" },
  FRONTEND: { label: "Frontend", icon: Monitor, color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
  BACKEND: { label: "Backend", icon: Server, color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
  ADMIN: { label: "Admin Panel", icon: Shield, color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)" },
  PACKAGES: { label: "Packages / Shared", icon: Box, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  DATABASE: { label: "Database / Prisma", icon: Database, color: "#6366f1", bg: "rgba(99, 102, 241, 0.15)" },
  DEVOPS: { label: "DevOps & CI/CD", icon: Container, color: "#f97316", bg: "rgba(249, 115, 22, 0.15)" },
  CONFIG: { label: "Konfiguratsiya", icon: Settings, color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)" },
  TESTS: { label: "Testlar", icon: TestTube, color: "#f43f5e", bg: "rgba(244, 63, 94, 0.15)" },
};

function getNodeIcon(node) {
  if (node.isDir) {
    return <FolderOpen size={16} className="tree-icon-folder" />;
  }

  const lower = node.name.toLowerCase();
  if (lower.endsWith(".tsx") || lower.endsWith(".jsx")) {
    return <Layers size={15} className="tree-icon-react" />;
  }
  if (lower.endsWith(".ts")) {
    return <Code2 size={15} className="tree-icon-ts" />;
  }
  if (lower.endsWith(".js") || lower.endsWith(".mjs")) {
    return <FileCode size={15} className="tree-icon-js" />;
  }
  if (lower.endsWith(".json")) {
    return <FileJson size={15} className="tree-icon-json" />;
  }
  if (lower.endsWith(".prisma") || lower.includes("schema.prisma")) {
    return <Database size={15} className="tree-icon-db" />;
  }
  if (lower.includes("docker") || lower.endsWith(".dockerfile")) {
    return <Container size={15} className="tree-icon-docker" />;
  }
  if (lower.endsWith(".yml") || lower.endsWith(".yaml") || lower.includes(".github")) {
    return <GitBranch size={15} className="tree-icon-git" />;
  }
  if (lower.endsWith(".css") || lower.endsWith(".scss")) {
    return <FileCode size={15} className="tree-icon-css" />;
  }
  if (lower.endsWith(".md") || lower.endsWith(".txt")) {
    return <FileText size={15} className="tree-icon-doc" />;
  }

  return <File size={15} className="tree-icon-file" />;
}

export default function StructureViewer({ code, lang = "text", codeId, onCopy }) {
  const [viewMode, setViewMode] = useState("visual"); // 'visual' | 'raw'
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedNodes, setCollapsedNodes] = useState({});
  const [copied, setCopied] = useState(false);
  const [copiedPath, setCopiedPath] = useState(null);

  const { nodes, rootTitle } = useMemo(() => parseTree(code), [code]);

  // Available categories present in this specific tree
  const presentCategories = useMemo(() => {
    const set = new Set();
    nodes.forEach((n) => {
      if (n.category && n.category !== "GENERAL") {
        set.add(n.category);
      }
    });
    return Array.from(set);
  }, [nodes]);

  const handleCopyFull = () => {
    if (onCopy) {
      onCopy(code, codeId);
    } else {
      navigator.clipboard.writeText(code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyNodePath = (e, fullPath) => {
    e.stopPropagation();
    navigator.clipboard.writeText(fullPath);
    setCopiedPath(fullPath);
    setTimeout(() => setCopiedPath(null), 1800);
  };

  const toggleCollapse = (id) => {
    setCollapsedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => setCollapsedNodes({});
  const collapseAll = () => {
    const all = {};
    nodes.forEach((n) => {
      if (n.isDir) all[n.id] = true;
    });
    setCollapsedNodes(all);
  };

  // Search filter
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) return nodes;
    const q = searchQuery.toLowerCase();
    return nodes.filter(
      (n) => n.name.toLowerCase().includes(q) || (n.comment && n.comment.toLowerCase().includes(q))
    );
  }, [nodes, searchQuery]);

  return (
    <div className="structure-explorer-card">
      {/* Top Header Bar */}
      <div className="structure-header-bar">
        <div className="structure-header-left">
          <div className="structure-badge-glow">
            <Layers size={17} className="structure-brand-icon" />
          </div>
          <div className="structure-title-group">
            <span className="structure-main-title">Loyiha Arxitekturasi & Fayllar Daraxti</span>
            <div className="structure-meta-tags">
              {rootTitle && <span className="structure-root-tag">{rootTitle}</span>}
              <span className="structure-count-tag">{nodes.length} ta komponent / fayl</span>
            </div>
          </div>
        </div>

        <div className="structure-header-right">
          {/* View Mode Toggle: Visual Tree vs Raw Text */}
          <div className="structure-mode-toggle">
            <button
              type="button"
              className={`mode-toggle-btn ${viewMode === "visual" ? "active" : ""}`}
              onClick={() => setViewMode("visual")}
              title="Vizual Daraxt Explorer"
            >
              <Eye size={13} />
              <span>Vizual Daraxt</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${viewMode === "raw" ? "active" : ""}`}
              onClick={() => setViewMode("raw")}
              title="Oddiy Kod Ko'rinishi"
            >
              <FileTerminal size={13} />
              <span>Oddiy Kod</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            className="structure-copy-btn"
            onClick={handleCopyFull}
            title="Daraxtni to'liq nusxalash"
          >
            {copied ? (
              <>
                <Check size={13} className="copy-check-icon" />
                <span>Nusxalandi</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Nusxalash</span>
              </>
            )}
          </button>
        </div>
      </div>

      {viewMode === "visual" ? (
        <>
          {/* Interactive Category Selector Tabs */}
          <div className="structure-selectors-toolbar">
            <div className="structure-category-pills">
              <button
                type="button"
                className={`category-pill-btn ${selectedCategory === "ALL" ? "active" : ""}`}
                onClick={() => setSelectedCategory("ALL")}
              >
                <Layers size={13} />
                <span>Barchasi</span>
              </button>

              {presentCategories.map((catKey) => {
                const meta = CATEGORY_META[catKey] || { label: catKey, icon: Box, color: "#fff", bg: "transparent" };
                const IconComp = meta.icon;
                const isSelected = selectedCategory === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    className={`category-pill-btn cat-${catKey.toLowerCase()} ${isSelected ? "active" : ""}`}
                    onClick={() => setSelectedCategory(isSelected ? "ALL" : catKey)}
                    style={{
                      "--cat-color": meta.color,
                      "--cat-bg": meta.bg,
                    }}
                  >
                    <IconComp size={13} />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            <div className="structure-search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Fayl yoki modulni qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="structure-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tree Body */}
          <div className="structure-tree-viewport">
            {filteredNodes.map((node, index) => {
              const isMatchCategory = selectedCategory === "ALL" || node.category === selectedCategory;
              const catMeta = CATEGORY_META[node.category] || null;
              const CatIcon = catMeta?.icon;

              return (
                <div
                  key={node.id}
                  className={`tree-row ${node.isDir ? "is-directory" : "is-file"} ${
                    !isMatchCategory ? "dimmed-row" : "highlighted-row"
                  }`}
                  style={{
                    paddingLeft: `${Math.max(node.depth * 18, 12)}px`,
                    animationDelay: `${Math.min(index * 15, 300)}ms`,
                  }}
                  onClick={() => node.isDir && toggleCollapse(node.id)}
                >
                  {/* Indentation guide lines */}
                  {Array.from({ length: node.depth }).map((_, dIdx) => (
                    <span
                      key={dIdx}
                      className="tree-guide-line"
                      style={{ left: `${dIdx * 18 + 18}px` }}
                    />
                  ))}

                  {/* Left: Icon + Name */}
                  <div className="tree-node-main">
                    <span className="tree-node-icon">{getNodeIcon(node)}</span>
                    <span className={`tree-node-name ${node.isDir ? "dir-name" : "file-name"}`}>
                      {node.name}
                    </span>
                  </div>

                  {/* Right: Category Selector Badge + Comment description */}
                  <div className="tree-node-meta">
                    {catMeta && node.category !== "GENERAL" && (
                      <span
                        className={`tree-cat-badge badge-${node.category.toLowerCase()}`}
                        style={{
                          color: catMeta.color,
                          borderColor: `${catMeta.color}40`,
                          backgroundColor: catMeta.bg,
                        }}
                      >
                        {CatIcon && <CatIcon size={11} />}
                        <span>{catMeta.label}</span>
                      </span>
                    )}

                    {node.comment && (
                      <span className="tree-comment-badge" title={node.comment}>
                        {node.comment}
                      </span>
                    )}

                    <button
                      type="button"
                      className="tree-quick-copy-btn"
                      onClick={(e) => handleCopyNodePath(e, node.name)}
                      title={`"${node.name}" nomini nusxalash`}
                    >
                      {copiedPath === node.name ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Raw Code View fallback */
        <pre className="structure-raw-pre">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
