import { useState } from "react";
import { Link } from "react-router-dom";
import { imageUrl } from "./api";
import { CompanyLogo } from "./Logos";
import "./ImageStudio.css";

const IMAGE_MODELS = [
  { id: "flux", name: "Flux (Standard)", company: "Black Forest", desc: "Supreme photorealism & detail", logoKey: "flux" },
  { id: "flux-schnell", name: "Flux Schnell", company: "Black Forest", desc: "Ultra-fast generation", logoKey: "flux" },
  { id: "flux-dev", name: "Flux Dev", company: "Black Forest", desc: "Artistic precision & lighting", logoKey: "flux" },
  { id: "midjourney-v6", name: "Midjourney v6", company: "Midjourney", desc: "Cinematic aesthetics & textures", logoKey: "midjourney" },
  { id: "dalle-3", name: "DALL·E 3", company: "OpenAI", desc: "Complex semantic following", logoKey: "openai" },
  { id: "sdxl", name: "Stable Diffusion XL", company: "Stability", desc: "High-contrast dynamic art", logoKey: "stability" },
  { id: "ideogram", name: "Ideogram v2", company: "Ideogram", desc: "World-class text in image", logoKey: "ideogram" },
  { id: "imagen-3", name: "Google Imagen 3", company: "Google", desc: "DeepMind photorealism", logoKey: "google" },
];

const ASPECT_RATIOS = [
  { id: "1:1", label: "1:1 Kvadrat", width: 1024, height: 1024, icon: "square" },
  { id: "16:9", label: "16:9 Landshaft", width: 1280, height: 720, icon: "landscape" },
  { id: "9:16", label: "9:16 Portret / Reels", width: 720, height: 1280, icon: "portrait" },
  { id: "4:3", label: "4:3 Standart", width: 1024, height: 768, icon: "standard" },
  { id: "3:4", label: "3:4 Vertikal", width: 768, height: 1024, icon: "vertical" },
];

const STYLE_PRESETS = [
  { label: "Barchasi (Oddiy)", suffix: "" },
  { label: "🎬 Kinematografik", suffix: ", cinematic lighting, 8k resolution, photorealistic, octane render, unreal engine 5" },
  { label: "🌸 Anime & Manga", suffix: ", modern makoto shinkai anime style, vibrant aesthetic, highly detailed illustration" },
  { label: "📸 8K Fotorealizm", suffix: ", ultra-realistic photography, 35mm lens, depth of field, natural soft lighting" },
  { label: "🌃 Cyberpunk Neon", suffix: ", cyberpunk aesthetic, neon lights, futuristic megacity, volumetric smoke" },
  { label: "🔮 3D Render & Pixar", suffix: ", 3d character rendering, cute pixar disney style, vibrant colors, raytracing" },
  { label: "🐉 Qorong'u Fantaziya", suffix: ", dark fantasy, epic concept art, intricate armor, mystical atmosphere, trending on artstation" },
];

export default function ImageStudio() {
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

    // Preload image
    const preloader = new Image();
    preloader.src = url;
    preloader.onload = () => {
      setCurrentImage(imgObj);
      const updatedGallery = [imgObj, ...gallery.slice(0, 30)];
      setGallery(updatedGallery);
      try {
        localStorage.setItem("oryxgen_image_gallery", JSON.stringify(updatedGallery));
      } catch {
        // ignore
      }
      setIsGenerating(false);
    };
    preloader.onerror = () => {
      // Still show with fallback
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
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(imgUrl, "_blank");
    }
  };

  const handleCopyPrompt = (p) => {
    navigator.clipboard.writeText(p);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="image-studio-layout">
      {/* Studio Header */}
      <header className="studio-header">
        <div className="header-left">
          <Link to="/" className="studio-logo">
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
            <span>Oryxgen<span className="logo-suffix">.ai</span> Image Studio</span>
          </Link>
          <span className="pollinations-badge">Pollinations AI Free Engine</span>
        </div>

        <div className="header-right">
          <Link to="/app" className="nav-btn-chat">
            💬 Chat-ga o'tish
          </Link>
          <Link to="/" className="nav-btn-landing">
            ⚡ Vesper Landing
          </Link>
        </div>
      </header>

      {/* Studio Content */}
      <div className="studio-main-grid">
        {/* Left Controls Panel */}
        <div className="studio-controls-panel">
          <form onSubmit={handleGenerate} className="studio-prompt-form">
            <div className="control-section">
              <div className="section-label-row">
                <label className="section-label">Tasvir Tavsifi (Prompt)</label>
                <button
                  type="button"
                  className="enhance-prompt-btn"
                  onClick={handleEnhance}
                  disabled={!prompt.trim()}
                >
                  ✨ Promptni Boyitish
                </button>
              </div>
              <textarea
                className="studio-prompt-textarea"
                rows={4}
                placeholder="Tasvirlamoqchi bo'lgan narsangizni yozing (Masalan: Toshkent 2050 yilda, neon chiroqlar, uchuvchi mashinalar, 8k fotorealizm)..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            {/* Model Selector */}
            <div className="control-section">
              <label className="section-label">Generatsiya Modeli</label>
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

            {/* Aspect Ratio Selector */}
            <div className="control-section">
              <label className="section-label">O'lcham / Nisbat (Aspect Ratio)</label>
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
              <label className="section-label">Vizual Uslub (Style Preset)</label>
              <div className="styles-scroll-row">
                {STYLE_PRESETS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`style-chip ${selectedStyle.label === s.label ? "active" : ""}`}
                    onClick={() => setSelectedStyle(s)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              className="studio-generate-btn"
              disabled={!prompt.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="generate-spinner" />
                  Sun'iy intellekt chizmoqda...
                </>
              ) : (
                <>🎨 Tasvirni Yaratish (Bepul)</>
              )}
            </button>
          </form>
        </div>

        {/* Right Preview Panel */}
        <div className="studio-preview-panel">
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
                <div className="preview-prompt-text">
                  <span>"{currentImage.prompt}"</span>
                </div>
                <div className="preview-actions-row">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleCopyPrompt(currentImage.prompt)}
                  >
                    {copiedPrompt ? "✓ Nusxalandi" : "📋 Promptdan nusxa olish"}
                  </button>
                  <button
                    type="button"
                    className="action-btn primary"
                    onClick={() => handleDownload(currentImage.url, `oryxgen-${currentImage.id}.jpg`)}
                  >
                    ⬇️ Yuklab olish (HD)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="placeholder-icon">🎨</div>
              <h3>Tasvir yaratishga tayyormisiz?</h3>
              <p>Chap tarafdagi maydonga tasvir tavsifini yozing va "Tasvirni Yaratish" tugmasini bosing.</p>
              <div className="quick-suggestions">
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Futuristik kiberpank shahar, neon chiroqlar, yomg'ir va uchuvchi transportlar");
                  }}
                >
                  🏙️ Kiberpank shahar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Kosmik fazoda suzib yurgan sehrli shisha orol, yulduzlar tumanligi");
                  }}
                >
                  🌌 Sehrli kosmik orol
                </button>
              </div>
            </div>
          )}

          {/* Past Generations Gallery */}
          {gallery.length > 0 && (
            <div className="studio-gallery-section">
              <h4>Oxirgi yaratilgan tasvirlar ({gallery.length})</h4>
              <div className="gallery-grid">
                {gallery.map((item) => (
                  <div
                    key={item.id}
                    className="gallery-item"
                    onClick={() => setCurrentImage(item)}
                  >
                    <img src={item.url} alt={item.prompt} loading="lazy" />
                    <div className="gallery-item-overlay">
                      <span>{item.model}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
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
                onClick={() => handleDownload(lightboxImage.url)}
              >
                ⬇️ Yuqori sifatda yuklab olish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
