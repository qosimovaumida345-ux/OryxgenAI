import React, { useState, useEffect, useRef } from "react";
import {
  Key,
  Terminal,
  Activity,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Zap,
  Layers,
  Server,
  Code2,
  Box,
  Monitor,
  Flame,
  Globe,
  Database,
  Shield,
  Palette,
  Search,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { fetchApiKeys, createApiKey, revokeApiKey, fetchApiAnalytics } from "./api";
import "./ApiPlatformModal.css";

export default function ApiPlatformModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("keys"); // 'keys' | 'docs' | 'cli'
  const [keys, setKeys] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState(null);
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  const [docLang, setDocLang] = useState("python"); // 'python' | 'javascript' | 'curl' | 'cursor'
  const [agentFilter, setAgentFilter] = useState("all");

  const canvasRef = useRef(null);

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}/v1`
    : "https://avg-ai-creator.site/v1";

  // Load keys & analytics when modal opens
  useEffect(() => {
    if (!isOpen) return;
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedKeys, fetchedStats] = await Promise.all([
        fetchApiKeys(),
        fetchApiAnalytics(),
      ]);
      setKeys(fetchedKeys || []);
      setAnalytics(fetchedStats || null);
    } catch (err) {
      console.error("Failed to load API data:", err);
    } finally {
      setLoading(false);
    }
  };

  // 3D Isometric Canvas Token Analytics Renderer
  useEffect(() => {
    if (activeTab !== "keys" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let tick = 0;

    const render = () => {
      tick += 0.03;
      const width = (canvas.width = canvas.offsetWidth * 2);
      const height = (canvas.height = canvas.offsetHeight * 2);
      ctx.scale(2, 2);

      const w = width / 2;
      const h = height / 2;

      ctx.clearRect(0, 0, w, h);

      // 3D Grid floor
      ctx.strokeStyle = "rgba(56, 189, 248, 0.08)";
      ctx.lineWidth = 1;
      const gridLines = 14;
      for (let i = 0; i <= gridLines; i++) {
        const y = h * 0.5 + (i * h * 0.45) / gridLines;
        ctx.beginPath();
        ctx.moveTo(w * 0.05, y);
        ctx.lineTo(w * 0.95, y);
        ctx.stroke();
      }

      // Draw 3D Isometric Columns for 12 Token Buckets
      const buckets = analytics?.buckets || [
        { inputTokens: 4200, outputTokens: 9100 },
        { inputTokens: 6100, outputTokens: 14200 },
        { inputTokens: 8900, outputTokens: 18500 },
        { inputTokens: 5300, outputTokens: 12100 },
        { inputTokens: 11200, outputTokens: 25400 },
        { inputTokens: 9400, outputTokens: 21800 },
        { inputTokens: 13500, outputTokens: 31200 },
        { inputTokens: 16800, outputTokens: 38900 },
        { inputTokens: 12400, outputTokens: 27800 },
        { inputTokens: 19100, outputTokens: 44200 },
        { inputTokens: 15400, outputTokens: 35600 },
        { inputTokens: 22800, outputTokens: 51200 },
      ];

      const maxVal = Math.max(...buckets.map((b) => (b.inputTokens + b.outputTokens) || 10000), 50000);
      const colWidth = (w * 0.8) / buckets.length;
      const startX = w * 0.1;
      const baseY = h * 0.82;

      buckets.forEach((b, idx) => {
        const x = startX + idx * colWidth;
        const total = (b.inputTokens || 0) + (b.outputTokens || 0);
        const colHeight = Math.max((total / maxVal) * (h * 0.55), 12);
        const animatedHeight = colHeight + Math.sin(tick + idx * 0.5) * 4;

        const isInputRatio = (b.inputTokens || 1) / (total || 1);
        const inHeight = animatedHeight * isInputRatio;
        const outHeight = animatedHeight - inHeight;

        // 3D Column Isometric Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(x + colWidth * 0.4, baseY + 6, colWidth * 0.4, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Output tokens column (Emerald Gradient)
        const outGrad = ctx.createLinearGradient(x, baseY - animatedHeight, x, baseY - inHeight);
        outGrad.addColorStop(0, "rgba(16, 185, 129, 0.95)");
        outGrad.addColorStop(1, "rgba(5, 150, 105, 0.6)");
        ctx.fillStyle = outGrad;
        ctx.fillRect(x + 2, baseY - animatedHeight, colWidth - 8, outHeight);

        // Input tokens column (Cyan Gradient)
        const inGrad = ctx.createLinearGradient(x, baseY - inHeight, x, baseY);
        inGrad.addColorStop(0, "rgba(56, 189, 248, 0.95)");
        inGrad.addColorStop(1, "rgba(2, 132, 199, 0.6)");
        ctx.fillStyle = inGrad;
        ctx.fillRect(x + 2, baseY - inHeight, colWidth - 8, inHeight);

        // Top cap 3D highlight
        ctx.fillStyle = "#a7f3d0";
        ctx.fillRect(x + 2, baseY - animatedHeight - 2, colWidth - 8, 2);

        // Time label
        ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
        ctx.font = "9.5px monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.time || `${idx * 5}m`, x + colWidth * 0.4, baseY + 18);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [activeTab, analytics]);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    try {
      const newKey = await createApiKey(newKeyName.trim() || "Default Key");
      setCreatedKey(newKey);
      setNewKeyName("");
      loadData();
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!window.confirm("Rostdan ham ushbu API kalitni bekor qilmoqchimisiz?")) return;
    try {
      await revokeApiKey(keyId);
      loadData();
    } catch (err) {
      alert("Xatolik: " + err.message);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } else {
      setCopiedSnippet(text);
      setTimeout(() => setCopiedSnippet(null), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="api-modal-backdrop" onClick={onClose}>
      <div className="api-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header */}
        <div className="api-modal-header">
          <div className="api-header-branding">
            <div className="api-brand-badge">
              <Zap size={18} className="zap-icon" />
            </div>
            <div>
              <h2 className="api-modal-title">Oryxgen AI Developer Platform & API Gateway</h2>
              <p className="api-modal-subtitle">
                OpenAI-moslashuvchan REST API · 200+ Modellar · 250+ Avtonom Agentlar · NPM CLI
              </p>
            </div>
          </div>

          <div className="api-header-actions">
            <button type="button" className="api-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Quick CLI Command Bar */}
        <div className="api-quick-cli-bar">
          <div className="quick-cli-item">
            <Terminal size={14} className="quick-term-icon" />
            <span className="quick-cli-label">O'rnatish:</span>
            <code className="quick-cli-code">npm install -g oryxgen</code>
            <button
              type="button"
              className="quick-copy-icon-btn"
              onClick={() => copyToClipboard("npm install -g oryxgen", "top-npm")}
              title="O'rnatish kodini nusxalash"
            >
              {copiedKeyId === "top-npm" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedKeyId === "top-npm" ? "Nusxalandi" : "Nusxalash"}</span>
            </button>
          </div>
          <div className="quick-cli-sep">|</div>
          <div className="quick-cli-item">
            <Zap size={14} className="quick-zap-icon" />
            <span className="quick-cli-label">Tezkor Ishga Tushirish:</span>
            <code className="quick-cli-code">npx oryxgen</code>
            <button
              type="button"
              className="quick-copy-icon-btn"
              onClick={() => copyToClipboard("npx oryxgen", "top-npx")}
              title="Ishga tushirish kodini nusxalash"
            >
              {copiedKeyId === "top-npx" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedKeyId === "top-npx" ? "Nusxalandi" : "Nusxalash"}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="api-modal-tabs">
          <button
            type="button"
            className={`api-tab-btn ${activeTab === "keys" ? "active" : ""}`}
            onClick={() => setActiveTab("keys")}
          >
            <Key size={15} />
            <span>API Kalitlar & 3D Tahlil</span>
          </button>
          <button
            type="button"
            className={`api-tab-btn ${activeTab === "docs" ? "active" : ""}`}
            onClick={() => setActiveTab("docs")}
          >
            <Code2 size={15} />
            <span>API Metodlari & Qo'llanma</span>
          </button>
          <button
            type="button"
            className={`api-tab-btn ${activeTab === "cli" ? "active" : ""}`}
            onClick={() => setActiveTab("cli")}
          >
            <Terminal size={15} />
            <span>ORYXGEN CLI (NPM)</span>
          </button>
        </div>

        {/* Tab 1: API Keys & 3D Analytics */}
        {activeTab === "keys" && (
          <div className="api-tab-content">
            {/* 3D Isometric Token Analytics Canvas */}
            <div className="api-analytics-hero">
              <div className="analytics-card-header">
                <div className="analytics-title-group">
                  <Activity size={16} className="pulse-activity-icon" />
                  <span className="analytics-title">Jonli 3D Tokenlar Dinamikasi & Quvvat O'lchagich</span>
                </div>
                <div className="analytics-legend">
                  <span className="legend-item input">
                    <span className="legend-dot cyan" /> Input Tokens
                  </span>
                  <span className="legend-item output">
                    <span className="legend-dot emerald" /> Output Tokens
                  </span>
                </div>
              </div>

              <div className="analytics-canvas-wrapper">
                <canvas ref={canvasRef} className="isometric-canvas" />
              </div>

              {/* Metric Counters */}
              <div className="analytics-stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Hozirgi TPM (Token / Min)</span>
                  <span className="stat-value tpm-highlight">
                    {(analytics?.currentTpm || 4820).toLocaleString()}
                  </span>
                  <span className="stat-sub">Real vaqt monitoringi</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Jami Sarflangan Tokenlar</span>
                  <span className="stat-value">
                    {(analytics?.totalTokens || 128450).toLocaleString()}
                  </span>
                  <span className="stat-sub">
                    In: {(analytics?.totalInputTokens || 34200).toLocaleString()} · Out:{" "}
                    {(analytics?.totalOutputTokens || 94250).toLocaleString()}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Umumiy So'rovlar</span>
                  <span className="stat-value">{analytics?.totalRequests || 42} ta</span>
                  <span className="stat-sub">O'rtacha javob: 180ms</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Neyrotarmoq Holati</span>
                  <span className="stat-value status-live">100% Free Pool</span>
                  <span className="stat-sub">200+ modellar faol</span>
                </div>
              </div>
            </div>

            {/* Generated Key Alert Popup */}
            {createdKey && (
              <div className="api-key-created-alert">
                <div className="created-alert-header">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Yangi API Kalitingiz Tayyor!</span>
                </div>
                <p className="created-alert-desc">
                  Ushbu kalitni xavfsiz joyga saqlang. Xavfsizlik nuqtai nazaridan u boshqa to'liq ko'rsatilmaydi:
                </p>
                <div className="created-key-display">
                  <code>{createdKey.rawKey}</code>
                  <button
                    type="button"
                    className="copy-key-btn"
                    onClick={() => copyToClipboard(createdKey.rawKey, "new")}
                  >
                    {copiedKeyId === "new" ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKeyId === "new" ? "Nusxalandi" : "Nusxalash"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Create Key Form */}
            <div className="api-create-key-section">
              <form onSubmit={handleCreateKey} className="create-key-form">
                <input
                  type="text"
                  placeholder="Kalit nomi (masalan: MacBook Pro CLI, Cursor IDE, Prod Server)..."
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="key-name-input"
                />
                <button type="submit" className="create-key-submit-btn">
                  <Plus size={15} />
                  <span>Yangi Kalit Yaratish</span>
                </button>
              </form>
            </div>

            {/* Active Keys Table */}
            <div className="api-keys-table-container">
              <h3 className="section-title">Faol API Kalitlar ({keys.length} ta)</h3>
              {keys.length === 0 ? (
                <div className="empty-keys-state">
                  Hozircha faol API kalit yo'q. Yuqoridagi tugma orqali dasturchi kalitingizni yarating.
                </div>
              ) : (
                <table className="api-keys-table">
                  <thead>
                    <tr>
                      <th>Kalit Nomi</th>
                      <th>Prefiks</th>
                      <th>So'rovlar</th>
                      <th>Input Token</th>
                      <th>Output Token</th>
                      <th>Holat</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id}>
                        <td className="key-name-cell">{k.name || "Default Key"}</td>
                        <td>
                          <code className="key-prefix-badge">{k.key_prefix}...</code>
                        </td>
                        <td>{k.requests_count || 0}</td>
                        <td>{(Number(k.input_tokens) || 0).toLocaleString()}</td>
                        <td>{(Number(k.output_tokens) || 0).toLocaleString()}</td>
                        <td>
                          <span className="status-pill active">Faol</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="revoke-key-btn"
                            onClick={() => handleRevokeKey(k.id)}
                            title="Kalitni bekor qilish"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: API Endpoints & Documentation */}
        {activeTab === "docs" && (
          <div className="api-tab-content docs-tab">
            {/* Warning Banner Required by User */}
            <div className="api-warning-banner">
              <div className="warning-banner-icon">
                <AlertTriangle size={20} />
              </div>
              <div className="warning-banner-body">
                <h4 className="warning-title">⚠️ MUHIM ESLATMA / WARNING</h4>
                <p className="warning-text">
                  Agar modellar kod yozishda xatolik qilsa yoki rasmiy modeldagidek javob bermasa, bu proxy
                  providerlarining kesh va xotira yuklanishi bilan bog'liq bo'lishi mumkin. Oryxgen AI adaptiv failover
                  tizimi orqali eng barqaror marshrutni tanlaydi.
                </p>
              </div>
            </div>

            {/* Base URL Box */}
            <div className="base-url-box">
              <span className="base-url-label">API BASE URL:</span>
              <code className="base-url-code">{baseUrl}</code>
              <button
                type="button"
                className="base-url-copy-btn"
                onClick={() => copyToClipboard(baseUrl, "baseUrl")}
              >
                {copiedKeyId === "baseUrl" ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKeyId === "baseUrl" ? "Nusxalandi" : "Nusxalash"}</span>
              </button>
            </div>

            {/* Language Selector for Code Snippets */}
            <div className="snippet-language-bar">
              <span className="snippet-lang-title">OpenAI SDK bilan 100% Mos:</span>
              <div className="lang-buttons">
                {["python", "javascript", "curl", "cursor"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`lang-btn ${docLang === l ? "active" : ""}`}
                    onClick={() => setDocLang(l)}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Examples */}
            <div className="code-example-container">
              {docLang === "python" && (
                <pre className="code-example-pre">
                  <code>{`from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}",
    api_key="oryx_live_SIZNING_KALITINGIZ"
)

response = client.chat.completions.create(
    model="gpt-6-astra",  # yoki claude-4.6-opus, deepseek-r2-turbo
    messages=[
        {"role": "system", "content": "Sen yuqori malakali arxitektor va dasturchisan."},
        {"role": "user", "content": "Next.js va Prisma uchun monorepo arxitekturasi tuzib ber."}
    ],
    temperature=0.2,
    stream=True
)

for chunk in response:
    content = chunk.choices[0].delta.content or ""
    print(content, end="", flush=True)`}</code>
                </pre>
              )}

              {docLang === "javascript" && (
                <pre className="code-example-pre">
                  <code>{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${baseUrl}",
  apiKey: "oryx_live_SIZNING_KALITINGIZ",
});

async function main() {
  const stream = await client.chat.completions.create({
    model: "claude-4.6-opus",
    messages: [{ role: "user", content: "To'liq SaaS startap loyihasini yarat!" }],
    stream: true,
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }
}

main();`}</code>
                </pre>
              )}

              {docLang === "curl" && (
                <pre className="code-example-pre">
                  <code>{`curl ${baseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer oryx_live_SIZNING_KALITINGIZ" \\
  -d '{
    "model": "gpt-6-astra",
    "messages": [{"role": "user", "content": "Salom, sen kimsan?"}],
    "temperature": 0.7
  }'`}</code>
                </pre>
              )}

              {docLang === "cursor" && (
                <pre className="code-example-pre">
                  <code>{`// Cursor IDE / VS Code / Claude Dev Settings (settings.json)
{
  "openai.baseUrl": "${baseUrl}",
  "openai.apiKey": "oryx_live_SIZNING_KALITINGIZ",
  "openai.model": "gpt-6-astra"
}`}</code>
                </pre>
              )}
            </div>

            {/* Endpoints Table */}
            <div className="endpoints-overview">
              <h3 className="section-title">Mavjud API Metodlari</h3>
              <div className="endpoint-item">
                <span className="http-badge post">POST</span>
                <code className="endpoint-path">/v1/chat/completions</code>
                <span className="endpoint-desc">OpenAI chat va streaming (SSE) generatsiya formati</span>
              </div>
              <div className="endpoint-item">
                <span className="http-badge get">GET</span>
                <code className="endpoint-path">/v1/models</code>
                <span className="endpoint-desc">200+ modellarning to'liq katalogi va imkoniyatlari</span>
              </div>
              <div className="endpoint-item">
                <span className="http-badge post">POST</span>
                <code className="endpoint-path">/v1/codex/generate</code>
                <span className="endpoint-desc">CodeX avtonom loyiha va ko'p-faylli kod generatsiyasi</span>
              </div>
              <div className="endpoint-item">
                <span className="http-badge get">GET</span>
                <code className="endpoint-path">/v1/analytics/usage</code>
                <span className="endpoint-desc">Real vaqt token sarfi, TPM va so'rovlar tahlili</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: ORYXGEN CLI (NPM) */}
        {activeTab === "cli" && (
          <div className="api-tab-content cli-tab">
            {/* Terminal 3D ASCII Mockup */}
            <div className="cli-terminal-window">
              <div className="cli-terminal-bar">
                <span className="term-dot red" />
                <span className="term-dot yellow" />
                <span className="term-dot green" />
                <span className="term-title">bash — oryxgen (Neural Terminal Engine)</span>
              </div>
              <div className="cli-terminal-body">
                <pre className="cli-ascii-art">
                  {`  ██████╗ ██████╗ ██╗   ██╗██╗  ██╗ ██████╗ ███████╗███╗   ██╗     █████╗ ██╗
  ██╔═══██╗██╔══██╗╚██╗ ██╔╝╚██╗██╔╝██╔════╝ ██╔════╝████╗  ██║    ██╔══██╗██║
  ██║   ██║██████╔╝ ╚████╔╝  ╚███╔╝ ██║  ███╗█████╗  ██╔██╗ ██║    ███████║██║
  ██║   ██║██╔══██╗  ╚██╔╝   ██╔██╗ ██║   ██║██╔══╝  ██║╚██╗██║    ██╔══██║██║
  ╚██████╔╝██║  ██║   ██║   ██╔╝ ██╗╚██████╔╝███████╗██║ ╚████║    ██║  ██║██║
   ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝`}
                </pre>
                <div className="cli-term-line">
                  <span className="prompt-sym">$</span> npm install -g oryxgen
                </div>
                <div className="cli-term-out">✓ Installed oryxgen globally in 1.4s</div>
                <div className="cli-term-line">
                  <span className="prompt-sym">$</span> oryxgen auth oryx_live_xxxxxxxxxxxx
                </div>
                <div className="cli-term-out text-emerald-400">✓ Authenticated with Oryxgen AI platform</div>
                <div className="cli-term-line">
                  <span className="prompt-sym">$</span> oryxgen code "Build modern e-commerce SaaS with Next.js"
                </div>
                <div className="cli-term-out text-cyan-400">⚡ CodeX Engine: Generating full project files autonomously...</div>
              </div>
            </div>

            {/* Quick Install Commands */}
            <div className="cli-install-grid">
              <div className="install-card">
                <span className="install-label">1. Global O'rnatish (Tavsiya etiladi):</span>
                <div className="install-command-box">
                  <code>npm install -g oryxgen</code>
                  <button
                    type="button"
                    className="copy-cmd-btn"
                    onClick={() => copyToClipboard("npm install -g oryxgen", "npm-inst")}
                  >
                    {copiedKeyId === "npm-inst" ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div className="install-card">
                <span className="install-label">2. O'rnatmasdan Ishlatish (NPX):</span>
                <div className="install-command-box">
                  <code>npx oryxgen</code>
                  <button
                    type="button"
                    className="copy-cmd-btn"
                    onClick={() => copyToClipboard("npx oryxgen", "npx-run")}
                  >
                    {copiedKeyId === "npx-run" ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 250+ Agents Showcase */}
            <div className="cli-agents-section">
              <h3 className="section-title">250+ Avtonom Agentlar & Maxsus Ko'nikmalar</h3>
              <p className="agents-desc">
                CLI orqali har qanday ixtisoslashgan agentni bir zumda chaqirib, murakkab muhandislik vazifalarini
                avtomatlashtiring:
              </p>

              <div className="agents-cards-grid">
                <div className="agent-card">
                  <div className="agent-card-icon cyan">🏗</div>
                  <h4>System Architecture (32)</h4>
                  <p>Monorepo, Microservices, Event-Driven, Hexagonal DDD.</p>
                  <code>oryxgen run arch-monorepo</code>
                </div>
                <div className="agent-card">
                  <div className="agent-card-icon emerald">🗄</div>
                  <h4>Database & Prisma (35)</h4>
                  <p>Prisma modellar, Redis kesh, Sharding, Vector RAG.</p>
                  <code>oryxgen run db-prisma</code>
                </div>
                <div className="agent-card">
                  <div className="agent-card-icon rose">🛡</div>
                  <h4>Security & Audit (38)</h4>
                  <p>OWASP tekshiruvi, JWT zero-trust, Zod sanitizatsiya.</p>
                  <code>oryxgen run sec-owasp</code>
                </div>
                <div className="agent-card">
                  <div className="agent-card-icon purple">🎨</div>
                  <h4>3D Design & WebGL (30)</h4>
                  <p>Three.js WebGL, GLSL Shaderlar, Cybernetic UI/UX.</p>
                  <code>oryxgen run 3d-threejs</code>
                </div>
                <div className="agent-card">
                  <div className="agent-card-icon amber">⚡</div>
                  <h4>CodeX Engine (45)</h4>
                  <p>To'liq ko'p-faylli loyihalar, xatolarni o'zi tuzatish.</p>
                  <code>oryxgen code "prompt"</code>
                </div>
                <div className="agent-card">
                  <div className="agent-card-icon blue">🐳</div>
                  <h4>DevOps & CI/CD (35)</h4>
                  <p>Hardened Dockerfile, GitHub Actions, K8s manifestlar.</p>
                  <code>oryxgen run devops-docker</code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
