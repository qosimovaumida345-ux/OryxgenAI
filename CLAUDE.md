# Oryxgen AI — Assistant & Agent Directives (CLAUDE.md)

Refer to [HANDOFF.md](file:///c:/Users/user/Desktop/OrygenAI/HANDOFF.md) for full architecture details.

## Core Rules for Any Agent Working on this Repo:
1. **Model Engine**:
   - Primary: `moonshotai/kimi-k3` (2.8T MoE) on NVIDIA NIM (`https://integrate.api.nvidia.com/v1/chat/completions`).
   - Fallbacks: Groq LPU -> OpenRouter -> Pollinations.
2. **Kimi-K3 Restrictions**:
   - NEVER pass `top_p` (it is fixed at 0.95 and causes a 400 error if overridden).
   - `max_tokens` must be `16384` (NVIDIA NIM completion ceiling).
   - Context window is 1,000,000 tokens (do not truncate inputs or slice message history below 120 turns).
   - Output must be cleaned with `sanitizeModelOutput()` and monitored with `isDegenerate()`.
3. **SSE Headers**:
   - Always guard headers with `if (!res.headersSent)` to prevent `ERR_HTTP_HEADERS_SENT` crashes.
4. **Brand Identity**:
   - Model MUST always declare itself as the chosen display model (e.g. "Claude Opus 5.5 by Anthropic on Oryxgen AI").
   - NEVER leak backend names (Nemotron, Qwen, Kimi, Gemma, LLaMA, OpenRouter, Pollinations).
5. **UI Standard**:
   - Strictly NO raw Unicode emojis as substitute icons in buttons/tabs. Use Lucide vector icons.
6. **Code Verification**:
   - Always run `node -c <file>` after editing JavaScript.
