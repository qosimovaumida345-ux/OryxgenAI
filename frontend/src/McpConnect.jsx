import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AuthModal from "./AuthModal";
import { completeMcpAuthorize, getAuthToken, getStoredUser } from "./api";
import "./Chat.css";

// Landing page for the MCP OAuth authorization-code flow. The backend's
// GET /authorize redirects the MCP client's browser here (see server.js),
// forwarding redirect_uri / code_challenge / state as query params. This
// page's only job is: make sure the user is logged in (reusing the existing
// AuthModal — no separate login UI to build or keep in sync), then call
// /api/mcp/complete-authorize to mint the code and send the browser back to
// whichever MCP client is waiting for it.
export default function McpConnect() {
    const [searchParams] = useSearchParams();
    const redirectUri = searchParams.get("redirect_uri") || "";
    const codeChallenge = searchParams.get("code_challenge") || "";
    const codeChallengeMethod = searchParams.get("code_challenge_method") || "S256";
    const state = searchParams.get("state") || "";

    const [status, setStatus] = useState("checking"); // checking | needs_login | completing | error
    const [errorMsg, setErrorMsg] = useState("");
    const [authModalOpen, setAuthModalOpen] = useState(false);

    const missingParams = !redirectUri || !codeChallenge;

    const finishAuthorize = async () => {
        setStatus("completing");
        setErrorMsg("");
        try {
            const { redirectTo } = await completeMcpAuthorize({
                redirectUri,
                codeChallenge,
                codeChallengeMethod,
                state,
            });
            window.location.href = redirectTo;
        } catch (err) {
            setStatus("error");
            setErrorMsg(err.message || "Ulanishni yakunlab bo'lmadi.");
        }
    };

    useEffect(() => {
        if (missingParams) {
            setStatus("error");
            setErrorMsg("So'rov noto'g'ri — redirect_uri yoki code_challenge yetishmayapti. MCP mijozidan qaytadan urinib ko'ring.");
            return;
        }
        const existingToken = getAuthToken();
        const existingUser = getStoredUser();
        if (existingToken && existingUser) {
            finishAuthorize();
        } else {
            setStatus("needs_login");
            setAuthModalOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAuthSuccess = () => {
        setAuthModalOpen(false);
        finishAuthorize();
    };

    return (
        <div className="mcp-connect-page" style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#050505",
            color: "#eee",
            padding: 24,
            textAlign: "center",
            gap: 18,
        }}>
            <img src="/Logo.png" alt="Oryxgen AI" style={{ width: 40, height: 40 }} />
            <h2 style={{ margin: 0, fontSize: 20 }}>Oryxgen AI — MCP ulanish</h2>

            {status === "checking" && <p style={{ color: "#888" }}>Tekshirilmoqda...</p>}

            {status === "needs_login" && (
                <p style={{ color: "#888", maxWidth: 360 }}>
                    MCP mijozini (masalan Claude) Oryxgen AI hisobingizga ulash uchun avval tizimga kiring.
                </p>
            )}

            {status === "completing" && <p style={{ color: "#888" }}>Ulanish yakunlanmoqda, hozir qaytarib yuboriladi...</p>}

            {status === "error" && (
                <div style={{ color: "#f87171", maxWidth: 360 }}>
                    <p>{errorMsg}</p>
                </div>
            )}

            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
                onAuthSuccess={handleAuthSuccess}
                closable={false}
            />
        </div>
    );
}
