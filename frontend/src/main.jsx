import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

const isFileProto = typeof window !== "undefined" && window.location.protocol === "file:";
const isDesktop = isFileProto || (typeof window !== "undefined" && Boolean(window.oryxgenDesktop || window.electronAPI));

if (isDesktop && (!window.location.hash || window.location.hash === "#/" || window.location.hash === "#")) {
  window.location.hash = "#/app";
}

const Router = isFileProto ? HashRouter : BrowserRouter;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>
);
