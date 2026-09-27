import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { buildMultiFileSandboxHtml } from "./CodeXWorkspace";
import "./Chat.css";

const CHATS_STORAGE_KEY = "oryxgen_saved_chats";

export default function PreviewPage() {
  const { id } = useParams();
  const [chat, setChat] = useState(null);
  const [deviceWidth, setDeviceWidth] = useState("100%");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHATS_STORAGE_KEY);
      if (raw) {
        const chats = JSON.parse(raw);
        const target = chats.find((c) => c.id === id);
        if (target) setChat(target);
      }
    } catch {}
  }, [id]);

  if (!chat) {
    return (
      <div style={{ padding: 60, color: "white", textAlign: "center", background: "#0a0a0a", minHeight: "100vh" }}>
        <h2>Loyiha topilmadi</h2>
        <p style={{ color: "#71717a", margin: "16px 0" }}>Loyiha o'chirilgan yoki hali saqlanmagan bo'lishi mumkin.</p>
        <Link to="/app" style={{ color: "#60a5fa", textDecoration: "underline" }}>Orqaga qaytish</Link>
      </div>
    );
  }

  const files = chat.projectFiles || {};
  const hasFiles = Object.keys(files).length > 0;
  const plan = chat.codexPlan || null;
  const isBackendOrBot = plan?.projectType === "bot" || plan?.projectType === "backend" || plan?.projectType === "script";

  const htmlTemplate = buildMultiFileSandboxHtml(files);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#050505" }}>
      <header style={{ 
        display: "flex", justifyContent: "space-between", alignItems: "center", 
        padding: "10px 20px", background: "#0a0a0a", borderBottom: "1px solid #222" 
      }}>
        <div style={{ color: "white", fontWeight: "bold" }}>
          Live Preview <span style={{ color: "#666", fontSize: 12, marginLeft: 10 }}>{chat.title}</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            onClick={() => setDeviceWidth("100%")}
            style={{ background: deviceWidth === "100%" ? "#333" : "transparent", border: "1px solid #444", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
          >
            Desktop
          </button>
          <button 
            onClick={() => setDeviceWidth("768px")}
            style={{ background: deviceWidth === "768px" ? "#333" : "transparent", border: "1px solid #444", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
          >
            Tablet
          </button>
          <button 
            onClick={() => setDeviceWidth("375px")}
            style={{ background: deviceWidth === "375px" ? "#333" : "transparent", border: "1px solid #444", color: "white", padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}
          >
            Mobile
          </button>
        </div>
        <Link to="/app" style={{ color: "#aaa", textDecoration: "none", fontSize: 13 }}>Orqaga</Link>
      </header>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", background: "#000", padding: 20 }}>
        {isBackendOrBot ? (
          <div style={{ maxWidth: 580, width: "100%", padding: 32, background: "#111113", border: "1px solid #27272a", borderRadius: 16, color: "white", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 20 }}>{plan?.title || chat.title}</h3>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 20px 0" }}>
              Ushbu loyiha <strong>{plan?.stack || "Backend/Bot"}</strong> muhitida mustaqil server yoki bot sifatida ishlaydi.
            </p>
            <div style={{ background: "#09090b", border: "1px solid #1f2937", padding: "12px 16px", borderRadius: 8, fontFamily: "monospace", fontSize: 13, color: "#4ade80", marginBottom: 24, textAlign: "left" }}>
              <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 4 }}>BUYRUQ:</div>
              {plan?.runCommand || "npm start"}
            </div>
            <Link to="/app" style={{ display: "inline-block", background: "#3b82f6", color: "white", fontWeight: 600, padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>
              CodeX Kodini Ko'rish
            </Link>
          </div>
        ) : !hasFiles ? (
          <div style={{ color: "#666" }}>Fayllar hali yaratilmagan</div>
        ) : (
          <div style={{ 
            width: deviceWidth, height: "100%", transition: "width 0.3s ease",
            background: "white", boxShadow: "0 0 20px rgba(0,0,0,0.5)"
          }}>
            <iframe 
              srcDoc={htmlTemplate} 
              title="Preview Sandbox"
              style={{ width: "100%", height: "100%", border: "none" }}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}
