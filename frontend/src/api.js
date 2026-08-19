const API = import.meta.env.VITE_API_URL || "";

// Auth storage helpers
const TOKEN_KEY = "oryxgen_auth_token";
const USER_KEY = "oryxgen_auth_user";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// API Headers helper
function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// Health check
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false };
  }
}

// Catalog
export async function fetchCatalog() {
  try {
    const res = await fetch(`${API}/api/models`);
    if (!res.ok) throw new Error("Catalog fetch failed");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback catalog:", err.message);
    return { models: [], imageModels: [] };
  }
}

// Chat Streaming
export async function streamChat(arg1, arg2, arg3, arg4, arg5) {
  let model, messages, systemPrompt, chatId, onDelta, onThinking, onDone, onError;

  if (typeof arg1 === "object" && !Array.isArray(arg1)) {
    model = arg1.model;
    messages = arg1.messages;
    systemPrompt = arg1.systemPrompt;
    chatId = arg1.chatId;
    onDelta = arg2;
    onThinking = arg3;
    onDone = arg4;
    onError = arg5;
  } else {
    model = arg1;
    messages = arg2;
    onDelta = arg3;
    onThinking = arg4;
    chatId = arg5;
  }

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ model, messages, systemPrompt, chatId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server band yoki xatolik yuz berdi" }));
      throw new Error(err.error || "So'rov bajarilmadi");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          if (json.error) throw new Error(json.error);
          if (json.thinking && onThinking) onThinking(json.thinking);
          if (json.content && onDelta) onDelta(json.content);
        } catch (err) {
          if (err.message && !err.message.includes("JSON")) throw err;
        }
      }
    }

    if (onDone) onDone();
  } catch (err) {
    if (onError) onError(err.message || "Xatolik yuz berdi");
    else throw err;
  }
}

// Image URL builder
export function imageUrl(prompt, model = "flux", width = 1024, height = 1024, seed = null) {
  const params = new URLSearchParams({
    prompt,
    model,
    width: String(width),
    height: String(height),
  });
  if (seed) params.set("seed", String(seed));
  return `${API}/api/image?${params.toString()}`;
}

// Authentication API
export async function sendAuthCode(target, type = "email") {
  const res = await fetch(`${API}/api/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, type }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send code");
  return data;
}

export async function verifyAuthCode(target, code, name) {
  const res = await fetch(`${API}/api/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, code, name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed");
  if (data.token) {
    setAuthSession(data.token, data.user);
  }
  return data;
}

export async function fetchGoogleAuthUrl(redirectUri) {
  const targetRedirect = redirectUri || `${window.location.origin}/app`;
  const res = await fetch(`${API}/api/auth/google/url?redirect_uri=${encodeURIComponent(targetRedirect)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Google auth URL yaratib bo'lmadi");
  return data.url;
}

export async function exchangeGoogleCode(code, redirectUri) {
  const targetRedirect = redirectUri || `${window.location.origin}/app`;
  const res = await fetch(`${API}/api/auth/google/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, redirect_uri: targetRedirect }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Google orqali kirishda xatolik");
  if (data.token) {
    setAuthSession(data.token, data.user);
  }
  return data;
}

export async function googleAuth(email, name, avatar) {
  const res = await fetch(`${API}/api/auth/google/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name, avatar }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Google auth failed");
  if (data.token) {
    setAuthSession(data.token, data.user);
  }
  return data;
}

export async function fetchUserChats() {
  try {
    const res = await fetch(`${API}/api/chats`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.chats || [];
  } catch {
    return [];
  }
}

export async function saveUserChat(chat) {
  try {
    await fetch(`${API}/api/chats`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ chat }),
    });
  } catch {
    // ignore
  }
}

export async function deleteUserChat(chatId) {
  try {
    await fetch(`${API}/api/chats/${encodeURIComponent(chatId)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch {
    // ignore
  }
}
