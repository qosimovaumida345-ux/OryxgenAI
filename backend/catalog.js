const row = (id, company, displayName, description, logoKey, capability = "chat", isPremium = false, tags = []) => ({
  id,
  company,
  displayName,
  description,
  logoKey,
  capability, // "chat" | "reason" | "code" | "vision" | "image"
  isPremium,
  tags: tags.length ? tags : [capability],
});

export const CATALOG = [
  // ═══════════════════════════════════════════════════════════════
  // ANTHROPIC CLAUDE — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("claude-sonnet-5.5", "Anthropic", "Claude Sonnet 5.5", "Best balance of speed and intelligence. Released September 28, 2026.", "anthropic", "code", true, ["claude", "code", "flagship"]),
  row("claude-opus-5.5", "Anthropic", "Claude Opus 5.5", "High-end agentic coding & knowledge work. Released September 22, 2026.", "anthropic", "reason", true, ["claude", "reason", "flagship", "thinking"]),
  row("claude-fable-5.1", "Anthropic", "Claude Fable 5.1", "Most capable model for demanding reasoning & long-horizon agentic work. 1M context.", "anthropic", "reason", true, ["claude", "reason", "thinking", "flagship"]),
  row("claude-haiku-4.5", "Anthropic", "Claude Haiku 4.5", "Fastest, low-cost Claude for quick tasks. 200K context.", "anthropic", "chat", true, ["claude", "fast"]),
  row("claude-3.7-sonnet", "Anthropic", "Claude 3.7 Sonnet", "Hybrid reasoning model switching between fast and deep thinking.", "anthropic", "reason", true, ["claude", "hybrid", "thinking"]),
  row("claude-3.5-sonnet", "Anthropic", "Claude 3.5 Sonnet", "Industry benchmark for software engineering & reasoning.", "anthropic", "code", true, ["claude", "code"]),
  row("claude-3.5-haiku", "Anthropic", "Claude 3.5 Haiku", "High-velocity Haiku matching earlier flagship performance.", "anthropic", "chat", true, ["claude", "fast"]),
  row("claude-3-opus", "Anthropic", "Claude 3 Opus", "Top-tier complex reasoning and deep synthesis.", "anthropic", "reason", true, ["claude", "reason"]),
  row("claude-3-sonnet", "Anthropic", "Claude 3 Sonnet", "Ideal balance of intelligence and speed.", "anthropic", "chat", true, ["claude"]),
  row("claude-3-haiku", "Anthropic", "Claude 3 Haiku", "Instant response speed with near-instant reasoning.", "anthropic", "chat", true, ["claude", "fast"]),

  // ═══════════════════════════════════════════════════════════════
  // OPENAI — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("gpt-6-astra", "OpenAI", "GPT-6 Astra", "Most capable flagship. Complex reasoning, coding & agentic workflows. Released Sept 3, 2026.", "openai", "reason", false, ["flagship", "thinking"]),
  row("gpt-6-sol", "OpenAI", "GPT-6 Sol", "Balanced intelligence & cost for complex coding and agentic tasks. Released Sept 22, 2026.", "openai", "code", false, ["code", "flagship"]),
  row("gpt-6-luna", "OpenAI", "GPT-6 Luna", "Most efficient GPT-6 for high-volume, cost-sensitive workloads.", "openai", "chat"),
  row("gpt-live-1", "OpenAI", "GPT-Live-1", "Natural full-duplex voice conversations in the API. Released September 2026.", "openai", "chat", false, ["voice"]),
  row("gpt-5.5", "OpenAI", "GPT-5.5", "Previous frontier model, retiring October 14, 2026.", "openai", "reason"),
  row("gpt-5.4", "OpenAI", "GPT-5.4", "Unified deliberate reasoning and fast execution engine.", "openai", "reason"),
  row("gpt-5", "OpenAI", "GPT-5", "Foundation model with universal adaptability. Released August 2025.", "openai", "reason"),
  row("gpt-4o", "OpenAI", "GPT-4o", "Omni multi-modal model for text, vision, and audio.", "openai", "vision"),
  row("gpt-4o-mini", "OpenAI", "GPT-4o mini", "Affordable, lightning-fast omni reasoning model.", "openai", "chat"),
  row("gpt-4-turbo", "OpenAI", "GPT-4 Turbo", "128k context with updated knowledge base.", "openai", "chat"),
  row("gpt-4", "OpenAI", "GPT-4", "Original breakthrough reasoning and instruction model.", "openai", "reason"),
  row("gpt-3.5-turbo", "OpenAI", "GPT-3.5 Turbo", "Fast, dependable general conversation model.", "openai", "chat"),
  row("gpt-oss-120b", "OpenAI", "GPT-OSS 120B", "Flagship open-weights 120B model with 128K context, deep reasoning and tool calling running on Groq LPU.", "openai", "reason", false, ["flagship", "thinking", "tools", "groq"]),
  row("openai/gpt-oss-120b", "OpenAI", "GPT-OSS 120B", "Flagship open-weights 120B model with 128K context, deep reasoning and tool calling running on Groq LPU.", "openai", "reason", false, ["flagship", "thinking", "tools", "groq"]),
  row("gpt-oss-20b", "OpenAI", "GPT-OSS 20B", "Ultra-fast 20B model with 128K context running on Groq LPU.", "openai", "chat", false, ["fast", "groq"]),
  row("openai/gpt-oss-20b", "OpenAI", "GPT-OSS 20B", "Ultra-fast 20B model with 128K context running on Groq LPU.", "openai", "chat", false, ["fast", "groq"]),
  row("qwen3.8-27b", "Alibaba", "Qwen 3.8 27B", "Multimodal Vision (Text + Image) model with 128K context running on Groq LPU.", "alibaba", "vision", false, ["vision", "multimodal", "tools", "groq"]),
  row("qwen/qwen3.8-27b", "Alibaba", "Qwen 3.8 27B", "Multimodal Vision (Text + Image) model with 128K context running on Groq LPU.", "alibaba", "vision", false, ["vision", "multimodal", "tools", "groq"]),
  row("o4-mini", "OpenAI", "o4-mini", "Sub-second thinking model for live programming assistance.", "openai", "reason", false, ["thinking"]),
  row("o3", "OpenAI", "o3", "Frontier reasoning model with automated verification.", "openai", "reason", false, ["thinking", "frontier"]),
  row("o3-mini", "OpenAI", "o3-mini", "Speed-optimized reasoning with selectable effort.", "openai", "reason", false, ["thinking"]),
  row("o3-pro", "OpenAI", "o3-pro", "Maximum reasoning tier for complex scientific pipelines.", "openai", "reason", false, ["thinking"]),
  row("o1", "OpenAI", "o1", "Advanced chain-of-thought for STEM & mathematics.", "openai", "reason", false, ["thinking", "stem"]),
  row("o1-mini", "OpenAI", "o1-mini", "Fast, cost-efficient reasoning for code and science.", "openai", "reason", false, ["thinking", "code"]),
  row("o1-pro", "OpenAI", "o1-pro", "Extended compute budget for deepest problem-solving.", "openai", "reason", false, ["thinking"]),

  // ═══════════════════════════════════════════════════════════════
  // GOOGLE GEMINI & GEMMA — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("gemini-3.8-flash", "Google", "Gemini 3.8 Flash", "Latest workhorse with selectable thinking levels & computer use. September 2026.", "google", "chat", false, ["fast", "thinking"]),
  row("gemini-3.7-flash", "Google", "Gemini 3.7 Flash", "High-performance fast model. August 2026.", "google", "chat", false, ["thinking"]),
  row("gemini-3.6-flash", "Google", "Gemini 3.6 Flash", "Reliable Flash generation from July 2026.", "google", "chat"),
  row("gemini-3.5-flash", "Google", "Gemini 3.5 Flash", "Fast, long-horizon agentic tasks. May 2026.", "google", "chat"),
  row("gemini-3.1-pro", "Google", "Gemini 3.1 Pro", "Flagship Pro model for high-capability reasoning tasks.", "google", "reason", false, ["flagship", "thinking"]),
  row("gemini-2.5-pro", "Google", "Gemini 2.5 Pro", "Production reasoning model with deep analysis.", "google", "reason"),
  row("gemini-2.5-flash", "Google", "Gemini 2.5 Flash", "Cost-efficient production Flash model.", "google", "chat"),
  row("gemini-2.5-flash-lite", "Google", "Gemini 2.5 Flash-Lite", "Budget-friendly lightweight Gemini.", "google", "chat", false, ["fast"]),
  row("gemini-2.0-flash", "Google", "Gemini 2.0 Flash", "Real-time multimodal agent with native tool execution.", "google", "chat"),
  row("gemini-1.5-pro", "Google", "Gemini 1.5 Pro", "2M token context window for massive analysis.", "google", "reason", false, ["long-context"]),
  row("gemini-1.5-flash", "Google", "Gemini 1.5 Flash", "1M token context with high speed.", "google", "chat", false, ["long-context"]),
  row("gemma-4-31b", "Google", "Gemma 4 31B", "Near-frontier open model from Google DeepMind.", "google", "reason"),
  row("gemma-3-12b", "Google", "Gemma 3 12B", "Third-gen Gemma with native vision and coding.", "google", "chat"),
  row("gemma-2-27b", "Google", "Gemma 2 27B", "High-performance open weights model.", "google", "chat"),
  row("gemma-2-9b", "Google", "Gemma 2 9B", "Lightweight open model.", "google", "chat"),

  // ═══════════════════════════════════════════════════════════════
  // DEEPSEEK — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("deepseek-v4.1-flash", "DeepSeek", "DeepSeek V4.1 Flash", "Current flagship. 552B MoE with native multimodal vision. 1M context. September 2026.", "deepseek", "reason", false, ["flagship"]),
  row("deepseek-v4-pro", "DeepSeek", "DeepSeek V4 Pro", "Previous flagship, phasing out. High-capability reasoning.", "deepseek", "reason"),
  row("deepseek-v3", "DeepSeek", "DeepSeek V3", "671B MoE frontier model with 37B active parameters.", "deepseek", "chat"),
  row("deepseek-r1", "DeepSeek", "DeepSeek R1", "Full open reasoning model rivaling OpenAI o1.", "deepseek", "reason", false, ["thinking", "open-source"]),
  row("deepseek-r1-0528", "DeepSeek", "DeepSeek R1-0528", "Updated R1 checkpoint with reduced overthinking.", "deepseek", "reason", false, ["thinking"]),
  row("deepseek-coder-v2", "DeepSeek", "DeepSeek Coder V2", "338+ programming languages with 128k context.", "deepseek", "code"),
  row("deepseek-vl2", "DeepSeek", "DeepSeek VL2", "Vision MoE with document OCR capability.", "deepseek", "vision"),

  // ═══════════════════════════════════════════════════════════════
  // xAI GROK — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("grok-4.7", "xAI", "Grok 4.7", "Latest flagship. Coding, agentic tasks, 500K context. Released Sept 21, 2026.", "xai", "reason", false, ["flagship", "thinking"]),
  row("grok-4.6", "xAI", "Grok 4.6", "Widely used frontier model. August 2026.", "xai", "reason"),
  row("grok-4.20", "xAI", "Grok 4.20", "Long-running multi-agent agentic tasks.", "xai", "reason", false, ["agent"]),
  row("grok-4.1-fast", "xAI", "Grok 4.1 Fast", "Budget high-volume model with fast response.", "xai", "chat", false, ["fast"]),

  // ═══════════════════════════════════════════════════════════════
  // META LLAMA & MUSE — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("muse-spark-1.3", "Meta", "Muse Spark 1.3", "Current frontier. Agentic workflows and complex reasoning. September 2026.", "meta", "reason", false, ["flagship"]),
  row("muse-glimmer", "Meta", "Muse Glimmer", "30B dense multimodal model. Apache 2.0. August 2026.", "meta", "chat", false, ["open-source"]),
  row("llama-4-maverick", "Meta", "Llama 4 Maverick", "17B (128 experts) MoE. High performance reasoning. 1M context.", "meta", "reason"),
  row("llama-4-scout", "Meta", "Llama 4 Scout", "17B (16 experts) MoE. 10M context window. High efficiency.", "meta", "chat"),
  row("llama-3.3-70b", "Meta", "Llama 3.3 70B", "Matching 405B performance at 70B scale.", "meta", "chat"),
  row("llama-3.2-90b-vision", "Meta", "Llama 3.2 90B Vision", "Flagship open vision model with rich visual reasoning.", "meta", "vision"),
  row("llama-3.2-11b-vision", "Meta", "Llama 3.2 11B Vision", "Multimodal model for chart & image analysis.", "meta", "vision"),
  row("llama-3.1-405b", "Meta", "Llama 3.1 405B", "World's largest open weights frontier model.", "meta", "reason"),
  row("llama-3.1-70b", "Meta", "Llama 3.1 70B", "Production standard for open-source enterprise AI.", "meta", "chat"),
  row("llama-3.1-8b", "Meta", "Llama 3.1 8B", "128k context open model with tool calling support.", "meta", "chat"),

  // ═══════════════════════════════════════════════════════════════
  // ALIBABA QWEN — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("qwen-3.8-max", "Alibaba", "Qwen 3.8 Max", "Current flagship. 2.4T MoE. August 2026.", "qwen", "reason", false, ["flagship"]),
  row("qwen-3.8-omni-flash", "Alibaba", "Qwen 3.8 Omni Flash", "Native omnimodal model with agentic capabilities. September 2026.", "qwen", "vision"),
  row("qwen-3.5-72b", "Alibaba", "Qwen 3.5 72B", "Strong coding, math, and instruction-following.", "qwen", "reason"),
  row("qwen-3-235b", "Alibaba", "Qwen3 235B", "Massive MoE model for universal task execution.", "qwen", "reason"),
  row("qwen-3-32b", "Alibaba", "Qwen3 32B", "Comprehensive reasoning and enterprise synthesis.", "qwen", "chat"),
  row("qwen-3-8b", "Alibaba", "Qwen3 8B", "Foundation model with native agent actions.", "qwen", "chat"),
  row("qwen-2.5-coder", "Alibaba", "Qwen2.5 Coder", "Specialized coding champion across 92 languages.", "qwen", "code"),
  row("qwen-2.5-72b", "Alibaba", "Qwen2.5 72B", "Global open benchmark leader.", "qwen", "reason"),
  row("qwq-32b", "Alibaba", "QwQ 32B", "Specialized reasoning model with thinking steps.", "qwen", "reason", false, ["thinking"]),

  // ═══════════════════════════════════════════════════════════════
  // MISTRAL AI — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("mistral-medium-3.5", "Mistral", "Mistral Medium 3.5", "Frontier multimodal model for agentic & coding workloads.", "mistral", "reason", false, ["flagship"]),
  row("mistral-small-4", "Mistral", "Mistral Small 4", "Hybrid instruct, reasoning & coding in efficient package.", "mistral", "chat"),
  row("mistral-large-3", "Mistral", "Mistral Large 3", "Flagship open-weight reasoning model.", "mistral", "reason"),
  row("devstral-2", "Mistral", "Devstral 2", "Open-weights model for autonomous software engineering.", "mistral", "code"),
  row("codestral", "Mistral", "Codestral", "Code completion and fill-in-the-middle specialist.", "mistral", "code"),
  row("pixtral-large", "Mistral", "Pixtral Large", "Flagship multimodal vision model with 128k context.", "mistral", "vision"),
  row("magistral-medium", "Mistral", "Magistral Medium", "Deep deliberation reasoning engine.", "mistral", "reason", false, ["thinking"]),
  row("magistral-small", "Mistral", "Magistral Small", "Reasoning model for autonomous pipelines.", "mistral", "reason", false, ["thinking"]),
  row("mistral-nemo", "Mistral", "Mistral Nemo", "12B model co-developed with NVIDIA. 128k context.", "mistral", "chat"),

  // ═══════════════════════════════════════════════════════════════
  // NVIDIA NEMOTRON — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("nemotron-3-ultra", "NVIDIA", "Nemotron 3 Ultra", "550B MoE. Hybrid Mamba-Transformer. 1M context. Extreme reasoning depth.", "nvidia", "reason"),
  row("nemotron-3-super", "NVIDIA", "Nemotron 3 Super", "120B optimized for collaborative agent tasks.", "nvidia", "reason"),
  row("nemotron-3.5-lightning", "NVIDIA", "Nemotron 3.5 Lightning", "30B fast MoE. Sub-50ms latency. August 2026.", "nvidia", "chat", false, ["fast"]),
  row("nemotron-3-nano", "NVIDIA", "Nemotron 3 Nano", "Compact agent model for embedded orchestration.", "nvidia", "chat"),
  row("nemotron-nano-omni", "NVIDIA", "Nemotron Nano Omni", "Multimodal omni model with real-time reasoning.", "nvidia", "vision"),

  // ═══════════════════════════════════════════════════════════════
  // COHERE — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("command-a-plus", "Cohere", "Command A+", "Flagship MoE model. Vision, agentic reasoning & translation. May 2026.", "cohere", "reason", false, ["flagship"]),
  row("command-r-plus", "Cohere", "Command R+", "Flagship RAG model with verified citations & tool use.", "cohere", "reason"),
  row("command-r", "Cohere", "Command R", "Optimized for enterprise RAG and tool integration.", "cohere", "chat"),
  row("north-mini-code", "Cohere", "North Mini Code", "30B MoE agentic coding model. 256k context. Apache 2.0.", "cohere", "code"),
  row("north-small-translate", "Cohere", "North Small Translate", "MoE model for 50+ language translation. September 2026.", "cohere", "chat"),

  // ═══════════════════════════════════════════════════════════════
  // MICROSOFT PHI — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("phi-4-reasoning", "Microsoft", "Phi-4 Reasoning", "Small thinking model with step-by-step logic.", "microsoft", "reason", false, ["thinking"]),
  row("phi-4", "Microsoft", "Phi-4", "14B model with state-of-the-art mathematical reasoning.", "microsoft", "reason"),
  row("phi-4-mini", "Microsoft", "Phi-4 mini", "Compact reasoning for agentic edge workloads.", "microsoft", "chat"),
  row("phi-3.5-mini", "Microsoft", "Phi-3.5 Mini", "128k context small language model.", "microsoft", "chat"),

  // ═══════════════════════════════════════════════════════════════
  // PERPLEXITY SONAR — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("sonar-reasoning-pro", "Perplexity", "Sonar Reasoning Pro", "Flagship online research and verified synthesis.", "perplexity", "reason", false, ["thinking", "search"]),
  row("sonar-pro", "Perplexity", "Sonar Pro", "Advanced multi-query research with deep web synthesis.", "perplexity", "reason", false, ["search"]),
  row("sonar", "Perplexity", "Sonar", "Live search-grounded model with real-time web knowledge.", "perplexity", "chat", false, ["search"]),

  // ═══════════════════════════════════════════════════════════════
  // MOONSHOT KIMI — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("kimi-k2", "Moonshot", "Kimi K2", "Agentic task execution with massive workspace memory.", "kimi", "chat"),
  row("kimi-k1.5", "Moonshot", "Kimi k1.5", "Multimodal thinking model with deliberate reasoning.", "kimi", "reason", false, ["thinking"]),

  // ═══════════════════════════════════════════════════════════════
  // AMAZON NOVA — Verified September 29, 2026
  // ═══════════════════════════════════════════════════════════════
  row("nova-premier", "Amazon", "Amazon Nova Premier", "Most capable Nova for deep multi-step analysis.", "amazon", "reason"),
  row("nova-pro", "Amazon", "Amazon Nova Pro", "Highly capable multimodal reasoning model.", "amazon", "reason"),
  row("nova-lite", "Amazon", "Amazon Nova Lite", "Fast multimodal model for images, video, text.", "amazon", "vision"),
  row("nova-micro", "Amazon", "Amazon Nova Micro", "Lowest latency, highest throughput text model.", "amazon", "chat", false, ["fast"]),
];

// --- IMAGE GENERATION MODELS (POLLINATIONS AI POWERED) ---
export const IMAGE_CATALOG = [
  row("flux", "Black Forest", "Flux (Standard)", "State-of-the-art prompt following and photorealism.", "flux", "image", false, ["photoreal"]),
  row("flux-schnell", "Black Forest", "Flux Schnell", "Lightning-fast high-quality generation in 4 steps.", "flux", "image", false, ["fast"]),
  row("flux-dev", "Black Forest", "Flux Dev", "Detailed artistic composition and anatomical precision.", "flux", "image", false, ["art"]),
  row("flux-realism", "Black Forest", "Flux Realism", "Ultra-photorealistic textures, skin tones, and lighting.", "flux", "image", false, ["photoreal"]),
  row("flux-anime", "Black Forest", "Flux Anime", "Vibrant modern Japanese animation & illustration style.", "flux", "image", false, ["anime"]),
  row("flux-3d", "Black Forest", "Flux 3D", "Octane render, Pixar, and Cinema4D stylistic rendering.", "flux", "image", false, ["3d"]),
  row("dalle-3", "OpenAI", "DALL·E 3", "Exceptional semantic prompt accuracy and creative flair.", "openai", "image", false, ["creative"]),
  row("gpt-image", "OpenAI", "GPT Image Engine", "Native multi-modal visual generator.", "openai", "image", false, ["multimodal"]),
  row("midjourney-v6.1", "Midjourney", "Midjourney v6.1", "Enhanced coherence, text rendering, and detail.", "midjourney", "image", false, ["cinematic"]),
  row("sd3", "Stability", "Stable Diffusion 3", "Diffusion transformer with supreme typographic accuracy.", "stability", "image", false, ["typography"]),
  row("sdxl", "Stability", "Stable Diffusion XL", "High-contrast artistic and cinematic generations.", "stability", "image", false, ["art"]),
  row("ideogram", "Ideogram", "Ideogram v2", "World-leading typography and graphic design generator.", "ideogram", "image", false, ["typography"]),
  row("imagen-3", "Google", "Google Imagen 3", "DeepMind's photorealistic image generation model.", "google", "image", false, ["photoreal"]),
];

export const PUBLIC_MODELS = CATALOG;
export const PUBLIC_IMAGE_MODELS = IMAGE_CATALOG;

export function findModel(id) {
  if (!id) return null;
  const cleanId = String(id).toLowerCase().trim();
  const direct = CATALOG.find((m) => m.id.toLowerCase() === cleanId) || IMAGE_CATALOG.find((m) => m.id.toLowerCase() === cleanId);
  if (direct) return direct;

  // Smart aliases for flagship Claude tiers requested by Claude Code / Anthropic SDK
  if (cleanId.includes("opus")) {
    return CATALOG.find((m) => m.id === "claude-opus-5.5") || CATALOG.find((m) => m.id.includes("opus"));
  }
  if (cleanId.includes("haiku")) {
    return CATALOG.find((m) => m.id === "claude-haiku-4.5") || CATALOG.find((m) => m.id.includes("haiku"));
  }
  if (cleanId.includes("sonnet")) {
    return CATALOG.find((m) => m.id === "claude-sonnet-5.5") || CATALOG.find((m) => m.id.includes("sonnet"));
  }
  if (cleanId.includes("fable")) {
    return CATALOG.find((m) => m.id === "claude-fable-5.1");
  }
  // GPT-6 family aliases
  if (cleanId.includes("astra")) {
    return CATALOG.find((m) => m.id === "gpt-6-astra");
  }
  if (cleanId.includes("sol")) {
    return CATALOG.find((m) => m.id === "gpt-6-sol");
  }
  // General fallback
  return CATALOG.find((m) => cleanId.includes(m.id.toLowerCase()));
}
