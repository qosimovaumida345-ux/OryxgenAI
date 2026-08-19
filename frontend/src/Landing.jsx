import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./Landing.css";

const HERO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <g transform="rotate(-30 12 12)">
        <circle cx="7.3" cy="3.2" r="1.45" />
        <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
        <circle cx="16.7" cy="20.8" r="1.45" />
      </g>
    </svg>
  );
}

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
        burger.setAttribute("aria-label", "Open menu");
      }
    };
    const toggle = () => {
      const open = document.body.classList.toggle("menu-open");
      burger?.setAttribute("aria-expanded", String(open));
      burger?.setAttribute("aria-label", open ? "Close menu" : "Open menu");
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
          <a className="logo appear appear--scale" href="#top" aria-label="Oryxgen.ai" style={{ "--d": "0.08s" }}>
            <LogoMark />
            Oryxgen<span className="logo-suffix">.ai</span>
          </a>
          <nav id="site-nav" aria-label="Primary">
            <Link className="nav-link appear appear--scale" to="/app" style={{ "--d": "0.16s" }}>
              Models
            </Link>
            <Link className="nav-link appear appear--soft" to="/app" style={{ "--d": "0.28s" }}>
              Chat
            </Link>
            <Link className="nav-link appear appear--scale" to="/image" style={{ "--d": "0.4s" }}>
              Image
            </Link>
            <a className="nav-link appear appear--soft" href="#stats" style={{ "--d": "0.52s" }}>
              Stats
            </a>
          </nav>
          <Link className="btn btn-solid header-cta appear appear--scale" to="/app" style={{ "--d": "0.34s" }}>
            Start for Free
          </Link>
          <button type="button" className="burger appear appear--scale" id="menu-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Open menu" style={{ "--d": "0.34s" }}>
            <span />
            <span />
            <span />
          </button>
        </header>

        <main className="hero" id="top">
          <div className="hero-copy">
            <div className="badge appear appear--pop" style={{ "--d": "0.22s" }}>
              <svg className="badge-star" viewBox="0 0 24 24" fill="white" width="18" height="20" aria-hidden="true">
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              Operational AI Infrastructure
            </div>
            <h1>
              <span className="headline-line appear appear--mask" style={{ "--d": "0.42s" }}>
                Train <em>AI agents</em> on your
              </span>
              <span className="headline-line appear appear--mask" style={{ "--d": "0.62s" }}>
                workflows in minutes.
              </span>
            </h1>
            <p className="lede appear appear--soft" style={{ "--d": "0.82s" }}>
              Deploy adaptive AI agents that learn, execute, and scale operational tasks across your business.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-solid appear appear--btn" to="/app" style={{ "--d": "0.96s" }}>
                Start for Free
              </Link>
              <Link className="btn btn-hero-ghost appear appear--side" to="/image" style={{ "--d": "1.10s" }}>
                See it in action
              </Link>
            </div>
          </div>
        </main>

        <footer className="stats" id="stats">
          <div className="stat appear appear--stat" style={{ "--d": "1.12s" }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <linearGradient id="g1" x1="3" y1="2" x2="14" y2="22">
                  <stop offset="0.38" stopColor="#ffffff" />
                  <stop offset="0.62" stopColor="#3a3a3a" />
                </linearGradient>
                <linearGradient id="g2" x1="3" y1="2" x2="14" y2="22">
                  <stop offset="0.38" stopColor="#3a3a3a" />
                  <stop offset="0.62" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#g1)" />
              <rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#g2)" />
              <rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
            </svg>
            4.2M+ workflows automated
          </div>
          <div className="stat appear appear--stat" style={{ "--d": "1.28s" }}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#ffffff" />
              <path d="M12 7.1v7.4M8.15 12.35L12 16.2l3.85-3.85" fill="none" stroke="#111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            92% reduction in manual operations
          </div>
          <div className="stat appear appear--stat" style={{ "--d": "1.44s" }}>
            <svg className="stat-icon-wide" viewBox="0 0 40 22" aria-hidden="true">
              <circle cx="10.2" cy="11" r="9.2" fill="#2b2b2b" />
              <ellipse cx="10.2" cy="12.1" rx="4.15" ry="3.7" fill="#f4f4f4" />
              <polygon points="6.4,9.2 7.6,6.6 8.9,9.2" fill="#f4f4f4" />
              <polygon points="11.5,9.2 12.8,6.6 14,9.2" fill="#f4f4f4" />
              <circle cx="8.7" cy="11.7" r="0.7" fill="#1a1a1a" />
              <circle cx="11.7" cy="11.7" r="0.7" fill="#1a1a1a" />
              <circle cx="20.2" cy="11" r="9.2" fill="#ffffff" />
              <circle cx="17.6" cy="10.2" r="1.7" fill="#111" />
              <circle cx="22.8" cy="10.2" r="1.7" fill="#111" />
              <ellipse cx="20.2" cy="12.4" rx="1.1" ry="0.7" fill="#111" />
              <path d="M17.8 14.4c1.4 1.4 3.4 1.4 4.8 0" fill="none" stroke="#111" strokeWidth="1.2" />
              <circle cx="30.2" cy="11" r="9.2" fill="#f26b1d" />
              <text x="30.2" y="15.1" textAnchor="middle" fill="#fff" fontSize="12.5" fontWeight="700" fontFamily="Inter, sans-serif">
                e
              </text>
            </svg>
            180+ operational teams onboarded
          </div>
        </footer>
      </div>
    </>
  );
}
