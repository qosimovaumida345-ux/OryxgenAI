import { useEffect, useState } from "react";
import "./DesktopDeviceModal.css";

export default function DesktopDeviceModal({ isOpen, onClose }) {
  const [settings, setSettings] = useState({
    allowComputerUse: true,
    allowScreenVision: true,
    allowTerminal: true,
    allowFilesystem: true,
    autonomousMode: true,
    defaultWorkspace: "C:\\Users\\user\\Desktop",
  });

  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [testOutput, setTestOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const isDesktop = typeof window !== "undefined" && Boolean(window.oryxgenDesktop);

  useEffect(() => {
    if (isOpen && isDesktop) {
      window.oryxgenDesktop.getDeviceSettings().then((s) => {
        if (s) setSettings(s);
      });
    }
  }, [isOpen, isDesktop]);

  if (!isOpen) return null;

  const handleToggle = (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    if (isDesktop) {
      window.oryxgenDesktop.setDeviceSettings(updated);
    }
  };

  const handleModeChange = (autonomous) => {
    const updated = { ...settings, autonomousMode: autonomous };
    setSettings(updated);
    if (isDesktop) {
      window.oryxgenDesktop.setDeviceSettings(updated);
    }
  };

  const handleTakeScreenshot = async () => {
    if (!isDesktop) {
      setTestOutput("Desktop rejim faqat .exe ilovada ishlaydi.");
      return;
    }
    setLoading(true);
    try {
      const res = await window.oryxgenDesktop.takeScreenshot(0.8);
      if (res && res.success) {
        setScreenshotPreview(`file://${res.path}?t=${Date.now()}`);
        setTestOutput(`✅ Skrinshot olindi: ${res.width}x${res.height} (${Math.round(res.file_size / 1024)} KB)`);
      } else {
        setTestOutput(`❌ Xatolik: ${res?.error || "Noma'lum"}`);
      }
    } catch (err) {
      setTestOutput(`❌ Xatolik: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestMouse = async () => {
    if (!isDesktop) return;
    setLoading(true);
    try {
      const res = await window.oryxgenDesktop.mouseClick(500, 400, "left", 1);
      setTestOutput(`🖱️ Sichqoncha (500, 400) koordinatasiga olib borilib bosildi!`);
    } catch (err) {
      setTestOutput(`❌ Xatolik: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestTerminal = async () => {
    if (!isDesktop) return;
    setLoading(true);
    try {
      const res = await window.oryxgenDesktop.runCommand("Get-Date");
      setTestOutput(`⚡ PowerShell chiqimi:\n${res.output || res.error || ""}`);
    } catch (err) {
      setTestOutput(`❌ Xatolik: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="device-modal-overlay" onClick={onClose}>
      <div className="device-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="device-modal-header">
          <div className="device-modal-title">
            <span className="device-modal-icon">🛡️</span>
            <div>
              <h3>Device Access & Computer Use</h3>
              <p>Oryxgen AI Desktop — Qurilma xavfsizligi va boshqaruv ruxsatlari</p>
            </div>
          </div>
          <button type="button" className="device-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="device-modal-body">
          {/* Permission Toggles */}
          <div className="device-section">
            <div className="device-section-header">Qurilma Ruxsatlari (Permissions)</div>
            <div className="device-toggle-list">
              <div className="device-toggle-item">
                <div className="device-toggle-info">
                  <div className="device-toggle-label">🖱️ Computer Use (Sichqoncha & Klaviatura)</div>
                  <div className="device-toggle-desc">Sichqonchani harakatlantirish, aniq koordinatalarni bosish va klaviaturadan kiritish</div>
                </div>
                <button
                  type="button"
                  className={`device-switch ${settings.allowComputerUse ? "active" : ""}`}
                  onClick={() => handleToggle("allowComputerUse")}
                >
                  <span className="device-switch-handle" />
                </button>
              </div>

              <div className="device-toggle-item">
                <div className="device-toggle-info">
                  <div className="device-toggle-label">📸 Screen Vision (Ekran Ko'rish)</div>
                  <div className="device-toggle-desc">Kompyuter ekranini skrinshot qilish va AI orqali vizual tahlil qilish</div>
                </div>
                <button
                  type="button"
                  className={`device-switch ${settings.allowScreenVision ? "active" : ""}`}
                  onClick={() => handleToggle("allowScreenVision")}
                >
                  <span className="device-switch-handle" />
                </button>
              </div>

              <div className="device-toggle-item">
                <div className="device-toggle-info">
                  <div className="device-toggle-label">⚡ Terminal & Buyruqlar (PowerShell)</div>
                  <div className="device-toggle-desc">PowerShell va CMD terminal buyruqlarini lokal bajarish</div>
                </div>
                <button
                  type="button"
                  className={`device-switch ${settings.allowTerminal ? "active" : ""}`}
                  onClick={() => handleToggle("allowTerminal")}
                >
                  <span className="device-switch-handle" />
                </button>
              </div>

              <div className="device-toggle-item">
                <div className="device-toggle-info">
                  <div className="device-toggle-label">📁 Fayl Tizimi (Filesystem Access)</div>
                  <div className="device-toggle-desc">Lokal fayllarni o'qish, yaratish, tahrirlash va papkalarni ko'rish</div>
                </div>
                <button
                  type="button"
                  className={`device-switch ${settings.allowFilesystem ? "active" : ""}`}
                  onClick={() => handleToggle("allowFilesystem")}
                >
                  <span className="device-switch-handle" />
                </button>
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="device-section">
            <div className="device-section-header">Boshqaruv Rejimi</div>
            <div className="device-mode-grid">
              <div
                className={`device-mode-card ${settings.autonomousMode ? "selected" : ""}`}
                onClick={() => handleModeChange(true)}
              >
                <div className="device-mode-title">⚡ To'liq Avtonom Rejim</div>
                <div className="device-mode-desc">AI topshiriqlarni tezkor va to'liq avtomatik tarzda bajaradi (Tavsiya etiladi).</div>
              </div>
              <div
                className={`device-mode-card ${!settings.autonomousMode ? "selected" : ""}`}
                onClick={() => handleModeChange(false)}
              >
                <div className="device-mode-title">🔒 Tasdiqlash Rejimi</div>
                <div className="device-mode-desc">Xavfli tizim operatsiyalari va fayl o'zgartirishlardan oldin ruxsat so'raladi.</div>
              </div>
            </div>
          </div>

          {/* Quick Diagnostics & Test */}
          <div className="device-section">
            <div className="device-section-header">Tezkor Sinov & Diagnostika</div>
            <div className="device-actions-row">
              <button
                type="button"
                className="device-action-btn primary"
                onClick={handleTakeScreenshot}
                disabled={loading}
              >
                📸 Ekranni Skrinshot Qilish
              </button>
              <button
                type="button"
                className="device-action-btn"
                onClick={handleTestMouse}
                disabled={loading}
              >
                🖱️ Sichqoncha Testi (500, 400)
              </button>
              <button
                type="button"
                className="device-action-btn"
                onClick={handleTestTerminal}
                disabled={loading}
              >
                ⚡ PowerShell Testi
              </button>
            </div>

            {testOutput && (
              <pre className="device-output-box">{testOutput}</pre>
            )}

            {screenshotPreview && (
              <div className="device-screenshot-preview">
                <img src={screenshotPreview} alt="Screenshot Preview" />
              </div>
            )}
          </div>
        </div>

        <div className="device-modal-footer">
          <div className="device-status-badge">
            <span className="status-dot green" />
            <span>Desktop Agent Faol</span>
          </div>
          <button type="button" className="device-save-btn" onClick={onClose}>
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
