import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Oryxgen ErrorBoundary caught error]:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem("oryxgen_auth_token");
      localStorage.removeItem("oryxgen_auth_user");
    } catch {}
    window.location.hash = "#/app";
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "#09090b",
          color: "#f4f4f5",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
          padding: "24px",
          textAlign: "center"
        }}>
          <div style={{
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "36px 32px",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)"
          }}>
            <img
              src="./Logo.png"
              alt="Oryxgen"
              style={{ width: "52px", height: "52px", marginBottom: "16px" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "8px", color: "#ffffff" }}>
              Oryxgen AI — Qayta yuklash kerak
            </h2>
            <p style={{ fontSize: "14px", color: "#a1a1aa", lineHeight: "1.5", marginBottom: "24px" }}>
              Ilova yuklanishida kutilmagan holat yuz berdi. Ilovani qayta yuklash orqali davom etishingiz mumkin.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background 0.15s"
                }}
              >
                Qayta yuklash
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#e4e4e7",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Sessiyani tozalash
              </button>
            </div>

            {this.state.error && (
              <details style={{ marginTop: "20px", textAlign: "left", fontSize: "11px", color: "#71717a" }}>
                <summary style={{ cursor: "pointer", marginBottom: "6px" }}>Xatolik tafsilotlari</summary>
                <pre style={{ overflowX: "auto", padding: "8px", background: "#09090b", borderRadius: "6px" }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
