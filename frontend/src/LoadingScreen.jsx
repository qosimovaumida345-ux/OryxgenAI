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
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32" className="pulse-mark">
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
          </div>
        </div>

        <h2 className="loading-title">Oryxgen<span className="logo-glow">.ai</span></h2>
        <p className="loading-subtitle">{message}</p>

        <div className="loading-status-bar">
          <div className="loading-progress-indeterminate" />
        </div>

        <div className="loading-footer-hint">
          <span className="status-dot-pulse" />
          {seconds > 5 ? `Render server uyg'onmoqda (${seconds}s)...` : "Xizmatlar tekshirilmoqda..."}
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
