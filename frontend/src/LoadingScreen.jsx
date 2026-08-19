import { useEffect, useState } from "react";
import "./LoadingScreen.css";

export default function LoadingScreen({ message = "Server bilan xavfsiz ulanish o'rnatilmoqda...", onRetry }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="loading-screen-overlay">
      <div className="loading-container">
        <div className="loading-ring-wrapper">
          <div className="loading-ring-outer" />
          <div className="loading-ring-inner" />
          <div className="loading-core-logo">
            <img src="/Logo.png" alt="Oryxgen Logo" className="loading-logo-img" />
          </div>
        </div>

        <h2 className="loading-title">Oryxgen<span className="logo-glow">.ai</span></h2>
        <p className="loading-subtitle">{message}</p>

        <div className="loading-status-bar">
          <div className="loading-progress-indeterminate" />
        </div>

        <div className="loading-footer-hint">
          <span className="status-dot-pulse" />
          {seconds > 5 ? `Server uyg'onmoqda (${seconds}s)...` : "Xizmatlar tekshirilmoqda..."}
        </div>

        {seconds > 10 && onRetry && (
          <button type="button" className="loading-retry-btn" onClick={onRetry}>
            Qayta tekshirish
          </button>
        )}
      </div>
    </div>
  );
}
