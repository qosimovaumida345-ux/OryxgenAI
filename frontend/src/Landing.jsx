import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

const HERO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

export default function Landing() {
  useEffect(() => {
    const appears = [...document.querySelectorAll(".appear")];
    const onEnd = (e) => e.currentTarget.classList.add("is-in");
    appears.forEach((el) => el.addEventListener("animationend", onEnd, { once: true }));

    let raf = 0;
    requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const photo = document.querySelector(".hero-photo");
        const all = [...appears, photo].filter(Boolean);
        const dead = all.every((el) => {
          const anims = typeof el.getAnimations === "function" ? el.getAnimations() : [];
          return !anims.some((a) => a.playState === "running" || a.playState === "finished");
        });
        if (dead) all.forEach((el) => el.classList.add("is-in"));
      });
    });

    const burger = document.getElementById("menu-toggle");
    const nav = document.getElementById("site-nav");
    const mq = window.matchMedia("(min-width: 901px)");
    const close = () => {
      document.body.classList.remove("menu-open");
      if (burger) {
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Menuni ochish");
      }
    };
    const toggle = () => {
      const open = document.body.classList.toggle("menu-open");
      burger?.setAttribute("aria-expanded", String(open));
      burger?.setAttribute("aria-label", open ? "Yopish" : "Ochish");
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    const onResize = () => {
      if (mq.matches) close();
    };

    burger?.addEventListener("click", toggle);
    nav?.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      appears.forEach((el) => el.removeEventListener("animationend", onEnd));
      burger?.removeEventListener("click", toggle);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.classList.remove("menu-open");
    };
  }, []);

  return (
    <>
      <div className="grain" />
      <video className="hero-photo" autoPlay muted loop playsInline src={HERO_SRC} />
      <div className="page">
        <div className="menu-backdrop" onClick={() => document.body.classList.remove("menu-open")} />
        <header className="header">
          <a className="logo appear appear--scale" href="#top" aria-label="Oryxgen AI" style={{ "--d": "0.08s" }}>
            <img src="/Logo.png" alt="Oryxgen Logo" className="landing-brand-logo" />
            Oryxgen<span className="logo-suffix">.ai</span>
          </a>
          <nav id="site-nav" aria-label="Asosiy menyu">
            <Link className="nav-link appear appear--scale" to="/app" style={{ "--d": "0.16s" }}>
              200+ Modellar
            </Link>
            <Link className="nav-link appear appear--soft" to="/app" style={{ "--d": "0.28s" }}>
              Chat & Fikrlash
            </Link>
            <Link className="nav-link appear appear--scale" to="/image" style={{ "--d": "0.4s" }}>
              Tasvir Studiyasi
            </Link>
            <a className="nav-link appear appear--soft" href="#mcp-info" style={{ "--d": "0.52s" }}>
              MCP Server
            </a>
          </nav>
          <Link className="btn btn-solid header-cta appear appear--scale" to="/app" style={{ "--d": "0.34s" }}>
            Boshlash
          </Link>
          <button type="button" className="burger appear appear--scale" id="menu-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Menyu" style={{ "--d": "0.34s" }}>
            <span />
            <span />
            <span />
          </button>
        </header>

        <main className="hero" id="top">
          <div className="hero-copy">
            <div className="badge appear appear--pop" style={{ "--d": "0.22s" }}>
              <svg className="badge-star" viewBox="0 0 24 24" fill="white" width="16" height="16" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Operatsion AI Infratuzilmasi & MCP Gateway
            </div>
            <h1>
              <span className="headline-line appear appear--mask" style={{ "--d": "0.42s" }}>
                200+ ilg'or <em>AI modellari</em> bitta
              </span>
              <span className="headline-line appear appear--mask" style={{ "--d": "0.62s" }}>
                mukammal platformada.
              </span>
            </h1>
            <p className="lede appear appear--soft" style={{ "--d": "0.82s" }}>
              Claude 4.6, GPT-5, DeepSeek R1, Grok 4.6 va Gemini 3.5 modellaridan cheksiz foydalaning. Shaxsiy MCP server orqali Claude va Cursor bilan ulang.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-solid appear appear--btn" to="/app" style={{ "--d": "0.96s" }}>
                Platformani ochish
              </Link>
              <Link className="btn btn-hero-ghost appear appear--side" to="/image" style={{ "--d": "1.10s" }}>
                Tasvir yaratish
              </Link>
            </div>
          </div>
        </main>

        <footer className="stats" id="stats">
          <div className="stat appear appear--stat" style={{ "--d": "1.12s" }}>
            <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
              <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="#ffffff" />
              <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="#888888" />
              <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
            </svg>
            200+ Live AI Modellar
          </div>
          <div className="stat appear appear--stat" style={{ "--d": "1.28s" }}>
            <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
              <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
              <path d="M12 7.1v7.4M8.15 12.35L12 16.2l3.85-3.85" fill="none" stroke="#111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            MCP Server (Model Context Protocol)
          </div>
          <div className="stat appear appear--stat" style={{ "--d": "1.44s" }}>
            <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
              <circle cx="12" cy="12" r="9" stroke="#ffffff" strokeWidth="2" fill="none" />
              <path d="M12 6v6l4 2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Deep Deliberation & Thinking UI
          </div>
        </footer>
      </div>
    </>
  );
}
