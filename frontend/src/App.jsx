import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoadingScreen from "./LoadingScreen";
import LandingPage from "./Landing.jsx";
import ChatPage from "./Chat.jsx";
import ImageStudioPage from "./ImageStudio.jsx";
import "./index.css";
import PreviewPage from "./Preview.jsx";
import McpConnect from "./McpConnect.jsx";

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        setTimeout(() => setAppReady(true), 150);
      });
    } else {
      setTimeout(() => setAppReady(true), 400);
    }
  }, []);

  if (!appReady) {
    return <LoadingScreen message="Oryxgen AI yuklanmoqda..." />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<ChatPage />} />
      <Route path="/image" element={<ImageStudioPage />} />
      <Route path="/preview/:id" element={<PreviewPage />} />
      <Route path="/mcp-connect" element={<McpConnect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
