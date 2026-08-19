import { useState } from "react";

const IMAGE_MAP = {
  anthropic: "/models/anthropic.jpg",
  claude: "/models/anthropic.jpg",
  openai: "/models/openai.jpg",
  chatgpt: "/models/openai.jpg",
  google: "/models/google.jpg",
  gemini: "/models/google.jpg",
  deepseek: "/models/deepseek.jpg",
  meta: "/models/meta.jpg",
  llama: "/models/meta.jpg",
  alibaba: "/models/alibaba.jpg",
  qwen: "/models/alibaba.jpg",
  mistral: "/models/mistral.png",
  mixtral: "/models/mixtral.png",
  cohere: "/models/cohere.png",
  fireworks: "/models/fireworks.png",
  xai: "/models/xai.png",
  grok: "/models/xai.png",
};

export function CompanyLogo({ name = "openai", size = 20, className = "" }) {
  const [imgError, setImgError] = useState(false);
  const key = String(name).toLowerCase().trim();
  const imageSrc = IMAGE_MAP[key];

  if (imageSrc && !imgError) {
    return (
      <img
        src={imageSrc}
        alt={name}
        width={size}
        height={size}
        className={`company-logo-img ${className}`}
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius: 4,
          display: "inline-block",
          verticalAlign: "middle",
          background: "#111",
        }}
        onError={() => setImgError(true)}
      />
    );
  }

  // High-Resolution Vector Fallbacks
  switch (key) {
    case "anthropic":
    case "claude":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M13.8 2.5 19.5 21.5h-3.4l-1.3-4.4H9.2l-1.3 4.4H4.5L10.2 2.5h3.6zm-1.8 4.7-2 6.7h4l-2-6.7z" fill="#D97757" />
        </svg>
      );

    case "openai":
    case "chatgpt":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zm-1.8-8.52a4.47 4.47 0 0 1 2.34-1.975V13.6a.795.795 0 0 0 .39.682l5.84 3.37-2.02 1.166a.08.08 0 0 1-.07 0l-4.839-2.79A4.504 4.504 0 0 1 1.8 9.784zm16.596 3.804-5.84-3.37 2.02-1.167a.08.08 0 0 1 .07 0l4.839 2.79a4.508 4.508 0 0 1-.69 8.143v-5.714a.79.79 0 0 0-.399-.682zm2.01-4.088a4.468 4.468 0 0 1-.14 3.014l-.14-.085-4.784-2.759a.776.776 0 0 0-.78 0l-5.843 3.369V9.547a.08.08 0 0 1 .033-.062l4.84-2.795a4.5 4.5 0 0 1 6.814 2.809zM8.715 11.23l2.02-1.168a.795.795 0 0 0 .392-.681V2.644a4.5 4.5 0 0 1 7.37 3.456l-.142.08-4.78 2.76a.776.776 0 0 0-.392.68v6.737l-2.02-1.168a.07.07 0 0 1-.038-.052v-3.907zm1.196-1.528 2.089-1.206 2.09 1.206v2.413l-2.09 1.206-2.089-1.206v-2.413z" fill="#10A37F" />
        </svg>
      );

    case "google":
    case "gemini":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
          <path d="M12 2C12 7.5 7.5 12 2 12C7.5 12 12 16.5 12 22C12 16.5 16.5 12 22 12C16.5 12 12 7.5 12 2Z" fill="url(#gemini_grad)" />
          <defs>
            <linearGradient id="gemini_grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4E82EE" />
              <stop offset="0.5" stopColor="#9B72CB" />
              <stop offset="1" stopColor="#D96570" />
            </linearGradient>
          </defs>
        </svg>
      );

    case "deepseek":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 3C7.03 3 3 7.03 3 12c0 2.64 1.15 5.01 2.98 6.64l.9-1.15A7.47 7.47 0 0 1 4.5 12c0-4.14 3.36-7.5 7.5-7.5s7.5 3.36 7.5 7.5c0 2.15-.9 4.09-2.35 5.46l.9 1.15A8.96 8.96 0 0 0 21 12c0-4.97-4.03-9-9-9zm-1.5 5v5.5l4.5 2.5.75-1.23-3.75-2.02V8h-1.5z" fill="#1E88E5" />
          <circle cx="12" cy="12" r="3" fill="#00D2FF" />
        </svg>
      );

    case "xai":
    case "grok":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="#FFFFFF" />
        </svg>
      );

    case "meta":
    case "llama":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M16.671 2.5C13.882 2.5 12.632 4.67 12 5.867C11.368 4.67 10.118 2.5 7.329 2.5C3.284 2.5 0 6.068 0 10.457C0 15.65 4.35 19.86 10.024 21.366C10.74 21.556 11.488 21.65 12 21.65C12.512 21.65 13.26 21.556 13.976 21.366C19.65 19.86 24 15.65 24 10.457C24 6.068 20.716 2.5 16.671 2.5ZM12 18.98C7.03 17.65 3.3 14.1 3.3 10.457C3.3 7.82 5.09 5.8 7.329 5.8C9.57 5.8 11.04 7.9 11.04 10.457C11.04 10.75 11.08 11.04 11.16 11.32C11.36 12.02 11.75 12.62 12 13.06C12.25 12.62 12.64 12.02 12.84 11.32C12.92 11.04 12.96 10.75 12.96 10.457C12.96 7.9 14.43 5.8 16.671 5.8C18.91 5.8 20.7 7.82 20.7 10.457C20.7 14.1 16.97 17.65 12 18.98Z" fill="#0668E1" />
        </svg>
      );

    case "mistral":
    case "mixtral":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <rect x="2" y="3" width="4" height="4" fill="#FF7000" />
          <rect x="18" y="3" width="4" height="4" fill="#FF7000" />
          <rect x="2" y="7" width="4" height="4" fill="#FF7000" />
          <rect x="6" y="7" width="4" height="4" fill="#FF7000" />
          <rect x="14" y="7" width="4" height="4" fill="#FF7000" />
          <rect x="18" y="7" width="4" height="4" fill="#FF7000" />
          <rect x="2" y="11" width="4" height="4" fill="#FF7000" />
          <rect x="6" y="11" width="4" height="4" fill="#FF7000" />
          <rect x="10" y="11" width="4" height="4" fill="#FF7000" />
          <rect x="14" y="11" width="4" height="4" fill="#FF7000" />
          <rect x="18" y="11" width="4" height="4" fill="#FF7000" />
          <rect x="2" y="15" width="4" height="4" fill="#FF7000" />
          <rect x="10" y="15" width="4" height="4" fill="#FF7000" />
          <rect x="18" y="15" width="4" height="4" fill="#FF7000" />
          <rect x="2" y="19" width="4" height="4" fill="#FF7000" />
          <rect x="18" y="19" width="4" height="4" fill="#FF7000" />
        </svg>
      );

    case "qwen":
    case "alibaba":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 3.2l6 3.3v6.9l-6 3.3-6-3.3v-6.9l6-3.3z" fill="#615CED" />
          <circle cx="12" cy="12" r="2.5" fill="#615CED" />
        </svg>
      );

    case "cohere":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <circle cx="12" cy="12" r="9" stroke="#39594C" strokeWidth="2.5" fill="none" />
          <circle cx="12" cy="12" r="4.5" fill="#D16643" />
        </svg>
      );

    case "nvidia":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M7.7 5.8c0-.3.2-.5.5-.5h7.6c.3 0 .5.2.5.5v12.4c0 .3-.2.5-.5.5H8.2c-.3 0-.5-.2-.5-.5V5.8z" fill="#76B900" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 17c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z" fill="#76B900" />
        </svg>
      );

    case "microsoft":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022" />
          <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00" />
          <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
          <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
        </svg>
      );

    case "perplexity":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 3l5 3.1v6.2l-5 3.1-5-3.1V8.1L12 5z" fill="#20B2AA" />
          <path d="M12 8v8M8 10l8 4M8 14l8-4" stroke="#20B2AA" strokeWidth="1.5" />
        </svg>
      );

    case "flux":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <polygon points="12,2 22,12 12,22 2,12" fill="#8B5CF6" />
          <polygon points="12,6 18,12 12,18 6,12" fill="#EC4899" />
        </svg>
      );

    case "midjourney":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 2C8 6 4 10 4 15c0 4.4 3.6 7 8 7s8-2.6 8-7c0-5-4-9-8-13zm0 18c-3 0-5-2-5-5 0-3 2-6 5-9 3 3 5 6 5 9 0 3-2 5-5 5z" fill="#93C5FD" />
        </svg>
      );

    case "stability":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <circle cx="12" cy="12" r="4" fill="#A855F7" />
          <circle cx="12" cy="4" r="2.5" fill="#A855F7" />
          <circle cx="20" cy="12" r="2.5" fill="#A855F7" />
          <circle cx="12" cy="20" r="2.5" fill="#A855F7" />
          <circle cx="4" cy="12" r="2.5" fill="#A855F7" />
        </svg>
      );

    case "ideogram":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M4 4h16v16H4V4zm3 3v10h10V7H7z" fill="#F43F5E" />
          <circle cx="12" cy="12" r="2" fill="#F43F5E" />
        </svg>
      );

    case "kimi":
    case "moonshot":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a7 7 0 1 1-7.54-7.54c-.44-.06-.9-.1-1.36-.1z" fill="#38BDF8" />
        </svg>
      );

    case "zhipu":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <polygon points="12,2 20,8 16,22 8,22 4,8" fill="#3B82F6" />
        </svg>
      );

    case "amazon":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M3 15c4.5 3 13.5 3 18 0" stroke="#FF9900" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M18 13l3 2-2 3" fill="#FF9900" />
        </svg>
      );

    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l3 3" />
        </svg>
      );
  }
}
