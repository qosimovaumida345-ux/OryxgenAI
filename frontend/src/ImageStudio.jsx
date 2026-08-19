import { useState } from "react";
import { Link } from "react-router-dom";
import { getStoredUser, imageUrl } from "./api";
import { CompanyLogo } from "./Logos";
import AuthModal from "./AuthModal";
import "./ImageStudio.css";

const IMAGE_MODELS = [
  { id: "flux", name: "Flux (Standard)", company: "Black Forest", desc: "Fotorealizm va detallar", logoKey: "flux" },
  { id: "flux-schnell", name: "Flux Schnell", company: "Black Forest", desc: "Tezkor generatsiya", logoKey: "flux" },
  { id: "flux-dev", name: "Flux Dev", company: "Black Forest", desc: "Badiiy yorug'lik va tekstura", logoKey: "flux" },
  { id: "midjourney-v6", name: "Midjourney v6", company: "Midjourney", desc: "Kinematik estetika", logoKey: "midjourney" },
  { id: "dalle-3", name: "DALL·E 3", company: "OpenAI", desc: "Semantik ko'rsatmalarga aniq rioya", logoKey: "openai" },
  { id: "sdxl", name: "Stable Diffusion XL", company: "Stability", desc: "Yuqori dinamik diapazon", logoKey: "stability" },
  { id: "ideogram", name: "Ideogram v2", company: "Ideogram", desc: "Rasm ichida matn yozish", logoKey: "ideogram" },
  { id: "imagen-3", name: "Google Imagen 3", company: "Google", desc: "DeepMind fotorealistik dvigateli", logoKey: "google" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1 Kvadrat", width: 1024, height: 1024 },
  { id: "16:9", label: "16:9 Landshaft", width: 1280, height: 720 },
  { id: "9:16", label: "9:16 Portret", width: 720, height: 1280 },
  { id: "4:3", label: "4:3 Standart", width: 1024, height: 768 },
  { id: "3:4", label: "3:4 Vertikal", width: 768, height: 1024 },
];

const STYLE_PRESETS = [
  { label: "Barchasi (Oddiy)", suffix: "" },
  { label: "Kinematografik", suffix: ", cinematic lighting, 8k resolution, photorealistic, octane render, unreal engine 5" },
  { label: "Anime & Manga", suffix: ", modern makoto shinkai anime style, vibrant aesthetic, highly detailed illustration" },
  { label: "8K Fotorealizm", suffix: ", ultra-realistic photography, 35mm lens, depth of field, natural soft lighting" },
  { label: "Cyberpunk Neon", suffix: ", cyberpunk aesthetic, neon lights, futuristic megacity, volumetric smoke" },
  { label: "3D Render & Pixar", suffix: ", 3d character rendering, cute pixar disney style, vibrant colors, raytracing" },
  { label: "Qorong'u Fantaziya", suffix: ", dark fantasy, epic concept art, intricate armor, mystical atmosphere, trending on artstation" },
];

export default function ImageStudio() {
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("flux");
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [gallery, setGallery] = useState(() => {
    try {
      const saved = localStorage.getItem("oryxgen_image_gallery");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [lightboxImage, setLightboxImage] = useState(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleGenerate = (e) => {
    e?.preventDefault();
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    const fullPrompt = prompt.trim() + selectedStyle.suffix;
    const seed = Math.floor(Math.random() * 1000000);
    const url = imageUrl(fullPrompt, selectedModel, selectedRatio.width, selectedRatio.height, seed);

    const imgObj = {
      id: `img-${Date.now()}`,
      url,
      prompt: fullPrompt,
      basePrompt: prompt,
      model: selectedModel,
      ratio: selectedRatio.id,
      timestamp: new Date().toLocaleTimeString(),
    };

    const preloader = new Image();
    preloader.src = url;
    preloader.onload = () => {
      setCurrentImage(imgObj);
      const updatedGallery = [imgObj, ...gallery.slice(0, 30)];
      setGallery(updatedGallery);
      try {
        localStorage.setItem("oryxgen_image_gallery", JSON.stringify(updatedGallery));
      } catch {
        /* ignore */
      }
      setIsGenerating(false);
    };
    preloader.onerror = () => {
      setCurrentImage(imgObj);
      setIsGenerating(false);
    };
  };

  const handleEnhance = () => {
    if (!prompt.trim()) return;
    setPrompt((prev) => `${prev.trim()}, masterpiece, award winning photography, 8k, volumetric lighting, photorealistic detail`);
  };

  const handleDownload = async (imgUrl, filename = "oryxgen-ai-art.jpg") => {
    try {
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(imgUrl, "_blank");
    }
  };

  const handleCopyPrompt = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="image-studio-layout">
      {/* Header */}
      <header className="studio-header">
        <div className="header-left">
          <Link to="/" className="studio-logo">
            <img src="/Logo.png" alt="Oryxgen Logo" className="studio-brand-logo" />
            <span>Oryxgen<small className="logo-suffix">.ai</small></span>
          </Link>
          <span className="pollinations-badge">Pollinations AI Engine</span>
        </div>

        <div className="header-right">
          <Link to="/app" className="nav-btn-chat">
            Chat & Modellar
          </Link>
          <Link to="/" className="nav-btn-landing">
            Bosh sahifa
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <div className="studio-main-grid">
        {/* Controls Column */}
        <aside className="studio-controls-panel">
          <form onSubmit={handleGenerate} className="studio-prompt-form">
            {/* Prompt Input */}
            <div className="control-section">
              <div className="section-label-row">
                <label className="section-label">Tasvir Tavsifi (Prompt)</label>
                <button
                  type="button"
                  className="enhance-prompt-btn"
                  onClick={handleEnhance}
                  disabled={!prompt.trim()}
                >
                  Promptni Kuchaytirish
                </button>
              </div>
              <textarea
                className="studio-prompt-textarea"
                rows={4}
                placeholder="Yaratmoqchi bo'lgan tasviringizni batafsil tasvirlang..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                autoFocus
              />
            </div>

            {/* Model Selection */}
            <div className="control-section">
              <label className="section-label">Model Dvigateli</label>
              <div className="models-select-grid">
                {IMAGE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`image-model-card ${selectedModel === m.id ? "active" : ""}`}
                    onClick={() => setSelectedModel(m.id)}
                  >
                    <CompanyLogo name={m.logoKey} size={18} />
                    <div className="model-info">
                      <span className="model-title">{m.name}</span>
                      <span className="model-desc">{m.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="control-section">
              <label className="section-label">Tasvir Nisbati (Format)</label>
              <div className="ratios-grid">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`ratio-pill ${selectedRatio.id === r.id ? "active" : ""}`}
                    onClick={() => setSelectedRatio(r)}
                  >
                    <span className="ratio-badge">{r.id}</span>
                    <span className="ratio-title">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Presets */}
            <div className="control-section">
              <label className="section-label">Uslub (Style)</label>
              <div className="styles-scroll-row">
                {STYLE_PRESETS.map((st) => (
                  <button
                    key={st.label}
                    type="button"
                    className={`style-chip ${selectedStyle.label === st.label ? "active" : ""}`}
                    onClick={() => setSelectedStyle(st)}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              type="submit"
              className="studio-generate-btn"
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="generate-spinner" />
                  <span>Tasvir yaratilmoqda...</span>
                </>
              ) : (
                <span>Tasvirni Yaratish</span>
              )}
            </button>
          </form>
        </aside>

        {/* Preview & Gallery Column */}
        <main className="studio-preview-panel">
          {currentImage ? (
            <div className="preview-card">
              <div className="preview-image-wrapper" onClick={() => setLightboxImage(currentImage)}>
                <img
                  src={currentImage.url}
                  alt={currentImage.prompt}
                  className={`preview-img ${isGenerating ? "loading" : ""}`}
                />
                {isGenerating && (
                  <div className="preview-generating-overlay">
                    <div className="generating-pulse-ring" />
                    <span>Yangi tasvir render qilinmoqda...</span>
                  </div>
                )}
              </div>

              <div className="preview-footer">
                <p className="preview-prompt-text">{currentImage.prompt}</p>
                <div className="preview-actions-row">
                  <button
                    type="button"
                    className="action-btn primary"
                    onClick={() => handleDownload(currentImage.url, `oryxgen-${currentImage.id}.jpg`)}
                  >
                    Yuklab olish (HD)
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleCopyPrompt(currentImage.prompt)}
                  >
                    {copiedPrompt ? "Prompt nusxalandi" : "Promptni nusxalash"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="placeholder-icon">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="2" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
              <h3>Tasvir Studiyasi Tayyor</h3>
              <p>Chap panelda tavsif yozing va tugmani bosing.</p>
            </div>
          )}

          {/* History Gallery */}
          {gallery.length > 0 && (
            <section className="studio-gallery-section">
              <h4>Yaratilgan Tasvirlar ({gallery.length})</h4>
              <div className="gallery-grid">
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    className="gallery-item"
                    onClick={() => {
                      setCurrentImage(item);
                      setLightboxImage(item);
                    }}
                  >
                    <img src={item.url} alt={item.prompt} loading="lazy" />
                    <div className="gallery-item-overlay">
                      <span>{item.ratio}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Full-view Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setLightboxImage(null)}
            >
              ✕
            </button>
            <img src={lightboxImage.url} alt={lightboxImage.prompt} />
            <div className="lightbox-caption">
              <p>{lightboxImage.prompt}</p>
              <button
                type="button"
                className="action-btn primary"
                onClick={() => handleDownload(lightboxImage.url, `oryxgen-${lightboxImage.id}.jpg`)}
              >
                Yuklab olish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal Guard */}
      <AuthModal
        isOpen={!currentUser || isAuthOpen}
        closable={Boolean(currentUser)}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />
    </div>
  );
}
