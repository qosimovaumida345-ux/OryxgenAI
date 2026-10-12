# Oryxgen AI — Workspace System Directives

## 1. Absolute Code Integrity
- Always run `node -c <file>` on JS files before completing tasks.
- Ensure all packages in package.json and imports resolve.

## 2. Model Routing & AI Engine
- All catalog models are powered by `moonshotai/kimi-k3` (2.8T MoE) via NVIDIA NIM (`NVIDIA_API_KEY`).
- Fallbacks in waterfall order: Groq LPU (`GROQ_API_KEY`) -> OpenRouter (`OPENROUTER_API_KEY`) -> Pollinations.

## 3. Strict Kimi-K3 Rules
- NEVER pass `top_p` in NVIDIA NIM requests (Kimi-K3 rejects `top_p` overrides with 400 Bad Request).
- Set `max_tokens` to `16384` (NVIDIA NIM ceiling).
- Full 1M token context support: do not truncate user inputs to 32k chars; keep history at 120+ messages.
- Always sanitize output via `sanitizeModelOutput()` and detect loops with `isDegenerate()`.

## 4. SSE Streaming Safety
- Always guard header initialization with `if (!res.headersSent)`.
- Never call `res.setHeader()` or `res.status()` after streaming starts.

## 5. Brand Identity Protection
- The model must strictly respond as the selected model identity from `backend/catalog.js` on Oryxgen AI.
- Never mention internal infrastructure names (Nemotron, Qwen, Kimi, Gemma, LLaMA, OpenRouter, Pollinations).

## 6. Anti-AI-Slop UI Directives
- Strictly NO Unicode emojis as icons (`🔥`, `🚀`, etc.). Use Lucide vector icons.
- Modern dark canvas (`#090A0F`, `#0E1117`), frosted glassmorphism, tactile button travel on press.
