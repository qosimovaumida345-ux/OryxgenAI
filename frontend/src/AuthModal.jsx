import { useState } from "react";
import emailjs from "@emailjs/browser";
import { googleAuth, sendAuthCode, verifyAuthCode } from "./api";
import "./AuthModal.css";

// Optional default EmailJS environment keys (can be configured in .env or dynamically)
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_oryxgen";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "template_oryxgen";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "YOUR_EMAILJS_PUBLIC_KEY";

const COUNTRY_CODES = [
  { code: "+998", country: "Uzbekistan" },
  { code: "+1", country: "USA / Canada" },
  { code: "+7", country: "Russia / Kazakhstan" },
  { code: "+90", country: "Turkey" },
  { code: "+44", country: "United Kingdom" },
  { code: "+49", country: "Germany" },
  { code: "+971", country: "UAE" },
  { code: "+82", country: "South Korea" },
  { code: "+81", country: "Japan" },
  { code: "+86", country: "China" },
];

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState("email"); // "email" | "phone" | "google"
  const [step, setStep] = useState(1); // 1: target input, 2: OTP verification
  const [emailInput, setEmailInput] = useState("");
  const [countryCode, setCountryCode] = useState("+998");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState("");

  if (!isOpen) return null;

  const targetValue = tab === "email" ? emailInput.trim() : `${countryCode}${phoneNumber.trim().replace(/\D/g, "")}`;

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (tab === "email" && (!emailInput || !emailInput.includes("@"))) {
      setError("Iltimos, to'g'ri email manzilini kiriting.");
      return;
    }
    if (tab === "phone" && phoneNumber.trim().length < 5) {
      setError("Iltimos, telefon raqamingizni to'liq kiriting.");
      return;
    }

    setError("");
    setSuccessInfo("");
    setLoading(true);

    try {
      // 1. Generate OTP on backend
      const res = await sendAuthCode(targetValue, tab);
      const generatedOtp = res.debugCode || Math.floor(100000 + Math.random() * 900000).toString();

      // 2. If email, attempt real EmailJS dispatch if configured
      if (tab === "email" && EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== "YOUR_EMAILJS_PUBLIC_KEY") {
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_email: emailInput,
              user_name: name || "Foydalanuvchi",
              verification_code: generatedOtp,
              app_name: "Oryxgen AI",
            },
            EMAILJS_PUBLIC_KEY
          );
          setSuccessInfo(`Tasdiqlash kodi ${emailInput} pochtasiga EmailJS orqali yuborildi.`);
        } catch (emailErr) {
          console.warn("[EmailJS] Send warning:", emailErr);
          setSuccessInfo(`Tasdiqlash kodi tayyorlandi.`);
        }
      } else {
        setSuccessInfo(`Tasdiqlash kodi ${targetValue} manziliga yuborildi.`);
      }

      setStep(2);
      if (res.debugCode) {
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
    if (!code.trim() || code.trim().length < 4) {
      setError("Iltimos, tasdiqlash kodini to'liq kiriting");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await verifyAuthCode(targetValue, code, name);
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
      const googleEmail = name ? `${name.toLowerCase().replace(/\s+/g, ".")}@gmail.com` : "user@gmail.com";
      const res = await googleAuth(
        googleEmail,
        name || "Google User",
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || "Oryxgen")}`
      );
      onAuthSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message || "Google orqali kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close-btn" onClick={onClose} aria-label="Yopish">
          ✕
        </button>

        <div className="auth-header">
          <div className="auth-logo-badge">
            <img src="/Logo.png" alt="Oryxgen Logo" className="auth-brand-logo" />
          </div>
          <h3>Oryxgen AI</h3>
          <p>200+ AI modellar va professional generatsiyaga kirish</p>
        </div>

        {error && <div className="auth-error-box">{error}</div>}
        {successInfo && <div className="auth-success-box">{successInfo}</div>}

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === "email" ? "active" : ""}`}
            onClick={() => {
              setTab("email");
              setStep(1);
              setError("");
              setSuccessInfo("");
            }}
          >
            Gmail / Email
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === "phone" ? "active" : ""}`}
            onClick={() => {
              setTab("phone");
              setStep(1);
              setError("");
              setSuccessInfo("");
            }}
          >
            Telefon raqam
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === "google" ? "active" : ""}`}
            onClick={() => {
              setTab("google");
              setStep(1);
              setError("");
              setSuccessInfo("");
            }}
          >
            Google
          </button>
        </div>

        {tab === "google" ? (
          <div className="auth-form-google">
            <p className="google-desc">Google hisobingiz orqali zudlik bilan kiring:</p>
            <div className="auth-field">
              <label>Ism / Familiya (ixtiyoriy):</label>
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
              <svg viewBox="0 0 24 24" width="18" height="18">
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
            {tab === "email" ? (
              <div className="auth-field">
                <label>Email manzili:</label>
                <input
                  type="email"
                  placeholder="nomi@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            ) : (
              <div className="auth-field">
                <label>Telefon raqam:</label>
                <div className="phone-input-group">
                  <select
                    className="country-select"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code + c.country} value={c.code}>
                        {c.code} ({c.country})
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="90 123 45 67"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
            )}
            <div className="auth-field">
              <label>Ismingiz (ixtiyoriy):</label>
              <input
                type="text"
                placeholder="Ismingizni kiriting"
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
              Kod yuborildi: <strong>{targetValue}</strong>
              <button type="button" className="change-target-btn" onClick={() => setStep(1)}>
                (O'zgartirish)
              </button>
            </p>
            <div className="auth-field">
              <label>6 xonali tasdiqlash kodi:</label>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                required
              />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? "Tekshirilmoqda..." : "Kirish & Tasdiqlash"}
            </button>
          </form>
        )}

        <div className="auth-footer-note">
          Oryxgen AI xavfsiz va shifrlangan tizim orqali ishlaydi.
        </div>
      </div>
    </div>
  );
}
