// Fallback curated list of high-reliability free endpoints on OpenRouter
const FALLBACK_FREE_MODELS = [
  "poolside/laguna-s-2.1:free",
  "thinkingmachines/inkling:free",
  "qwen/qwen3.8-27b:free",
  "cohere/north-mini-code:free",
  "poolside/laguna-xs-2.1:free",
  "thinkingmachines/inkling-small:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "openrouter/free",
];

const BY_CAPABILITY = {
  reason: [
    "thinkingmachines/inkling:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "qwen/qwen3.8-27b:free",
    "openrouter/free",
  ],
  code: [
    "poolside/laguna-s-2.1:free",
    "thinkingmachines/inkling:free",
    "qwen/qwen3.8-27b:free",
    "cohere/north-mini-code:free",
    "poolside/laguna-xs-2.1:free",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "openrouter/free",
  ],
  vision: [
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "google/gemma-4-26b-a4b-it:free",
    "openrouter/free",
  ],
  chat: [
    "qwen/qwen3.8-27b:free",
    "thinkingmachines/inkling:free",
    "nvidia/nemotron-3.5-lightning:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "openrouter/free",
  ],
};

let cachedFree = { at: 0, ids: [...FALLBACK_FREE_MODELS] };

export async function refreshFreeModels() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) return cachedFree.ids;
    const data = await res.json();
    const liveFreeIds = (data.data || [])
      .filter((m) => {
        const id = m.id || "";
        const p = m.pricing || {};
        const isFreePrice = String(p.prompt) === "0" && String(p.completion) === "0";
        return isFreePrice || id.endsWith(":free") || id === "openrouter/free";
      })
      .map((m) => m.id);

    if (liveFreeIds.length) {
      cachedFree = {
        at: Date.now(),
        ids: [...new Set([...liveFreeIds, ...FALLBACK_FREE_MODELS])],
      };
      console.log(`[OpenRouter] Discovered ${liveFreeIds.length} live free models.`);
    }
  } catch (err) {
    console.warn("[OpenRouter] Live model fetch failed, utilizing cached pool:", err.message);
  }
  return cachedFree.ids;
}

export async function getFreePool() {
  if (Date.now() - cachedFree.at > 30 * 60 * 1000) {
    await refreshFreeModels();
  }
  return cachedFree.ids;
}

export async function resolveUpstream(capability = "chat", requestedModelId = "") {
  const pool = new Set(await getFreePool());
  
  // Check if requested model itself is directly in the free pool
  if (pool.has(requestedModelId) || pool.has(`${requestedModelId}:free`)) {
    const directId = pool.has(requestedModelId) ? requestedModelId : `${requestedModelId}:free`;
    return [directId, "openrouter/free"];
  }

  const preferred = BY_CAPABILITY[capability] || BY_CAPABILITY.chat;
  const picked = preferred.filter((id) => pool.has(id) || id === "openrouter/free");
  const extras = FALLBACK_FREE_MODELS.filter((id) => pool.has(id) || id.endsWith(":free") || id === "openrouter/free");

  const chain = [...new Set([...picked, ...extras, "openrouter/free"])];
  return chain;
}

// Config-driven ranking of best free models for code generation and multi-file project synthesis
export const CODEX_RANKED_MODELS = [
  "poolside/laguna-s-2.1:free",
  "thinkingmachines/inkling:free",
  "qwen/qwen3.8-27b:free",
  "cohere/north-mini-code:free",
  "poolside/laguna-xs-2.1:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "openrouter/free",
];

export async function resolveBestCodeModel() {
  const pool = new Set(await getFreePool());
  const viable = CODEX_RANKED_MODELS.filter((id) => pool.has(id) || id === "openrouter/free");
  return [...new Set([...viable, ...CODEX_RANKED_MODELS, "openrouter/free"])];
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
