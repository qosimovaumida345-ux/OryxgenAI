// Restricted models that require private harnesses or frequently return 403 / 429
const RESTRICTED_MODELS = new Set([
  "thinkingmachines/inkling:free",
  "thinkingmachines/inkling-small:free",
  "poolside/laguna-s-2.1:free",
  "poolside/laguna-xs-2.1:free",
]);

// Fallback curated list of high-speed, reliable free endpoints on OpenRouter
const FALLBACK_FREE_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3.8-27b:free",
  "google/gemma-4-31b-it:free",
  "cohere/north-mini-code:free",
  "openrouter/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
];

const BY_CAPABILITY = {
  reason: [
    "nvidia/nemotron-3.5-lightning:free",
    "google/gemma-4-26b-a4b-it:free",
    "qwen/qwen3.8-27b:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
  ],
  code: [
    "nvidia/nemotron-3.5-lightning:free",
    "cohere/north-mini-code:free",
    "qwen/qwen3.8-27b:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free",
    "nvidia/nemotron-3-super-120b-a12b:free",
  ],
  vision: [
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "openrouter/free",
  ],
  chat: [
    "nvidia/nemotron-3.5-lightning:free",
    "google/gemma-4-26b-a4b-it:free",
    "qwen/qwen3.8-27b:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free",
    "nvidia/nemotron-3-super-120b-a12b:free",
  ],
};

let cachedFree = { at: 0, ids: [...FALLBACK_FREE_MODELS] };
let cachedMaxTokens = {};

export async function refreshFreeModels() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) return cachedFree.ids;
    const data = await res.json();
    const liveFreeIds = [];
    (data.data || []).forEach((m) => {
      const id = m.id || "";
      const p = m.pricing || {};
      const isFreePrice = String(p.prompt) === "0" && String(p.completion) === "0";
      if ((isFreePrice || id.endsWith(":free") || id === "openrouter/free") && !RESTRICTED_MODELS.has(id)) {
        liveFreeIds.push(id);
        const maxOut = m.top_provider?.max_completion_tokens || m.per_request_limits?.max_completion_tokens;
        if (maxOut && typeof maxOut === "number") {
          cachedMaxTokens[id] = maxOut;
        }
      }
    });

    if (liveFreeIds.length) {
      cachedFree = {
        at: Date.now(),
        ids: [...new Set([...liveFreeIds, ...FALLBACK_FREE_MODELS])].filter((id) => !RESTRICTED_MODELS.has(id)),
      };
      console.log(`[OpenRouter] Discovered ${liveFreeIds.length} live free models.`);
    }
  } catch (err) {
    console.warn("[OpenRouter] Live model fetch failed, utilizing cached pool:", err.message);
  }
  return cachedFree.ids;
}

export function getModelMaxTokens(modelId = "") {
  if (cachedMaxTokens[modelId]) {
    return cachedMaxTokens[modelId];
  }
  const lower = modelId.toLowerCase();
  if (lower.includes("qwen")) return 131072;
  if (lower.includes("nemotron")) return 65536;
  if (lower.includes("cohere") || lower.includes("north")) return 64000;
  if (lower.includes("gemma")) return 32768;
  if (lower.includes("liquid") || lower.includes("lfm")) return 8192;
  return 32768;
}

export async function getFreePool() {
  if (Date.now() - cachedFree.at > 30 * 60 * 1000) {
    await refreshFreeModels();
  }
  return cachedFree.ids;
}

export async function resolveUpstream(capability = "chat", requestedModelId = "") {
  const pool = new Set(await getFreePool());
  
  // Check if requested model itself is directly in the free pool and unrestricted
  if ((pool.has(requestedModelId) || pool.has(`${requestedModelId}:free`)) && !RESTRICTED_MODELS.has(requestedModelId)) {
    const directId = pool.has(requestedModelId) ? requestedModelId : `${requestedModelId}:free`;
    return [directId, "nvidia/nemotron-3.5-lightning:free", "google/gemma-4-26b-a4b-it:free", "openrouter/free"];
  }

  const preferred = BY_CAPABILITY[capability] || BY_CAPABILITY.chat;
  const picked = preferred.filter((id) => (pool.has(id) || id === "openrouter/free") && !RESTRICTED_MODELS.has(id));
  const extras = FALLBACK_FREE_MODELS.filter((id) => (pool.has(id) || id.endsWith(":free") || id === "openrouter/free") && !RESTRICTED_MODELS.has(id));

  const chain = [...new Set([...picked, ...extras, "openrouter/free"])].filter((id) => !RESTRICTED_MODELS.has(id));
  return chain;
}

// Config-driven ranking of best free models for code generation and multi-file project synthesis
export const CODEX_RANKED_MODELS = [
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3.8-27b:free",
  "cohere/north-mini-code:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
];

export async function resolveBestCodeModel() {
  const pool = new Set(await getFreePool());
  const viable = CODEX_RANKED_MODELS.filter((id) => (pool.has(id) || id === "openrouter/free") && !RESTRICTED_MODELS.has(id));
  return [...new Set([...viable, ...CODEX_RANKED_MODELS, "openrouter/free"])].filter((id) => !RESTRICTED_MODELS.has(id));
}

export function pollinationsModel(displayId = "") {
  const lower = displayId.toLowerCase();
  if (lower.includes("schnell") || lower.includes("dalle-2") || lower.includes("turbo")) {
    return "turbo";
  }
  if (lower.includes("anime")) {
    return "flux-anime";
  }
  if (lower.includes("3d")) {
    return "flux-3d";
  }
  if (lower.includes("realism")) {
    return "flux-realism";
  }
  return "flux";
}

