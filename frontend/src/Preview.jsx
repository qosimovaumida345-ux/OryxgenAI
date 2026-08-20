import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
        const target = chats.find(c => c.id === id);
        if (target) setChat(target);
      }
    } catch {}
  }, [id]);

  if (!chat) {
    return (
      <div style={{ padding: 40, color: "white", textAlign: "center" }}>
        <h2>Loyiha topilmadi</h2>
        <Link to="/app" style={{ color: "#60a5fa" }}>Orqaga qaytish</Link>
      </div>
    );
  }

  const files = chat.projectFiles || {};
  const hasFiles = Object.keys(files).length > 0;

  // Extract main entry point. Default to App.jsx or App.js, or first file
  const mainFile = files["App.jsx"] || files["App.js"] || files["index.jsx"] || files["index.html"] || Object.values(files)[0];

  // A very robust basic Sandbox template for React + Tailwind
  const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Oryxgen Live Preview</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
      <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
      <style>
        body { margin: 0; padding: 0; font-family: sans-serif; background: #ffffff; color: #000; }
        * { box-sizing: border-box; }
        ${files["styles.css"] || files["index.css"] || ""}
      </style>
    </head>
    <body>
      <div id="root"></div>
      <script type="text/babel">
        try {
          ${
            mainFile.includes("export default") || mainFile.includes("function App") || mainFile.includes("React")
              ? mainFile.replace(/export default function/g, 'function').replace(/import .*?;/g, '') + `\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<App />);`
              : `document.getElementById('root').innerHTML = \`${mainFile}\`;`
          }
        } catch (err) {
          document.getElementById('root').innerHTML = '<div style="color:red;padding:20px;">Xatolik yuz berdi:<br><pre>' + err.message + '</pre></div>';
        }
      </script>
    </body>
    </html>
  `;

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

      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", background: "#000" }}>
        {!hasFiles ? (
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
