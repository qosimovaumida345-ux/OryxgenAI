import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";
import LandingPage from "./Landing.jsx";
import ChatPage from "./Chat.jsx";
import ImageStudioPage from "./ImageStudio.jsx";
import "./index.css";
import PreviewPage from "./Preview.jsx";
import McpConnect from "./McpConnect.jsx";
import PrivacyPage from "./Privacy.jsx";
import TermsPage from "./Terms.jsx";

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const isDesktop = typeof window !== "undefined" && Boolean(window.oryxgenDesktop || window.electronAPI || window.location.protocol === "file:");

  useEffect(() => {
    let resolved = false;
    const markReady = () => {
      if (!resolved) {
        resolved = true;
        setAppReady(true);
      }
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => markReady()).catch(() => markReady());
    }
    // Guaranteed fallback timer so font loading never hangs
    const timer = setTimeout(markReady, isDesktop ? 100 : 300);
    return () => clearTimeout(timer);
  }, [isDesktop]);

  if (!appReady) {
    return <LoadingScreen message="Oryxgen AI yuklanmoqda..." />;
  }

  return (
    <Routes>
      <Route path="/" element={isDesktop ? <Navigate to="/app" replace /> : <LandingPage />} />
      <Route path="/app" element={<ChatPage />} />
      <Route path="/image" element={<ImageStudioPage />} />
      <Route path="/preview/:id" element={<PreviewPage />} />
      <Route path="/mcp-connect" element={<McpConnect />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to={isDesktop ? "/app" : "/"} replace />} />
    </Routes>
  );
}