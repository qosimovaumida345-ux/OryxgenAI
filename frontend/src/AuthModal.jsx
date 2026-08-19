import { useState } from "react";
import { googleAuth, sendAuthCode, verifyAuthCode } from "./api";
import "./AuthModal.css";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState("email"); // "email" | "phone" | "google"
  const [step, setStep] = useState(1); // 1: input target, 2: input code
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugCode, setDebugCode] = useState("");

  if (!isOpen) return null;

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!target.trim()) {
      setError(tab === "email" ? "Iltimos, emailingizni kiriting" : "Iltimos, telefon raqamingizni kiriting");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await sendAuthCode(target, tab);
      setStep(2);
      if (res.debugCode) {
        setDebugCode(res.debugCode);
        setCode(res.debugCode);
      }
    } catch (err) {
      setError(err.message || "Kod yuborishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Iltimos, 6 xonali tasdiqlash kodini kiriting");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await verifyAuthCode(target, code, name);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || "Kod noto'g'ri yoki muddati o'tgan");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const demoEmail = name ? `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com` : "user@gmail.com";
      const res = await googleAuth(demoEmail, name || "Oryxgen User", `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "Oryxgen")}`);
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || "Google orqali kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="auth-header">
          <div className="auth-logo-badge">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
          </div>
          <h3>Oryxgen AI ga xush kelibsiz</h3>
          <p>Barcha 200+ AI modellar va tasvir generatsiyasiga cheksiz kirish</p>
        </div>

        {error && <div className="auth-error-box">{error}</div>}

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === "email" ? "active" : ""}`}
            onClick={() => { setTab("email"); setStep(1); setError(""); }}
          >
            Gmail / Email
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === "phone" ? "active" : ""}`}
            onClick={() => { setTab("phone"); setStep(1); setError(""); }}
          >
            Telefon raqam
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === "google" ? "active" : ""}`}
            onClick={() => { setTab("google"); setStep(1); setError(""); }}
          >
            Google
          </button>
        </div>

        {tab === "google" ? (
          <div className="auth-form-google">
            <p className="google-desc">
              Google profilingiz orqali 1-klikda ro'yxatdan o'ting yoki tizimga kiring:
            </p>
            <div className="auth-field">
              <label>Ismingiz (ixtiyoriy):</label>
              <input
                type="text"
                placeholder="Masalan: Umida Qosimova"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="google-action-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              {loading ? "Kirilmoqda..." : "Google orqali davom etish"}
            </button>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleSendCode} className="auth-form">
            <div className="auth-field">
              <label>{tab === "email" ? "Gmail / Email manzilingiz:" : "Telefon raqamingiz:"}</label>
              <input
                type={tab === "email" ? "email" : "tel"}
                placeholder={tab === "email" ? "name@example.com" : "+998 90 123 45 67"}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                autoFocus
              />
            </div>
            <div className="auth-field">
              <label>Ismingiz (ixtiyoriy):</label>
              <input
                type="text"
                placeholder="Ismingiz"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Yuborilmoqda..." : "Tasdiqlash kodini olish"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="auth-form">
            <p className="code-sent-info">
              Kod yuborildi: <strong>{target}</strong>
              <button type="button" className="change-target-btn" onClick={() => setStep(1)}>
                (O'zgartirish)
              </button>
            </p>
            {debugCode && (
              <div className="debug-code-pill">
                Tasdiqlash kodi: <strong>{debugCode}</strong>
              </div>
            )}
            <div className="auth-field">
              <label>6 xonali tasdiqlash kodi:</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Tekshirilmoqda..." : "Kirish & Tasdiqlash"}
            </button>
          </form>
        )}

        <div className="auth-footer-note">
          Davom etish orqali siz Oryxgen AI foydalanish shartlariga rozilik bildirasiz.
        </div>
      </div>
    </div>
  );
}
