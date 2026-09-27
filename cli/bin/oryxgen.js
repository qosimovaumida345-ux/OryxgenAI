#!/usr/bin/env node

/**
 * ORYXGEN AI CLI - Official Command-Line Interface
 * 200+ Frontier Models, 250+ Autonomous Agents & Autonomous CodeX Engine
 */

import fs from "fs";
import path from "path";
import os from "os";
import readline from "readline";

// ── Configuration & Local Storage ──
const CONFIG_DIR = path.join(os.homedir(), ".oryxgen");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const DEFAULT_BASE_URL = "https://avg-ai-creator.site/v1";

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
    }
  } catch {}
  return {
    apiKey: process.env.ORYXGEN_API_KEY || "",
    baseUrl: process.env.ORYXGEN_BASE_URL || DEFAULT_BASE_URL,
    defaultModel: "gpt-6-astra",
  };
}

function saveConfig(cfg) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.error("Config faylini saqlashda xatolik:", err.message);
  }
}

// ── Terminal Styling & ANSI 24-bit TrueColor ──
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  cyan: "\x1b[38;2;56;189;248m",
  emerald: "\x1b[38;2;16;185;129m",
  purple: "\x1b[38;2;168;85;247m",
  amber: "\x1b[38;2;245;158;11m",
  rose: "\x1b[38;2;244;63;94m",
  blue: "\x1b[38;2;59;130;246m",
  gray: "\x1b[38;2;148;163;184m",
  white: "\x1b[38;2;248;250;252m",
  bgDark: "\x1b[48;2;15;23;42m",
};

// ── 3D Isometric ASCII Logo ──
function printLogo() {
  const logo = `
${C.cyan}  ██████╗ ██████╗ ██╗   ██╗██╗  ██╗ ██████╗ ███████╗███╗   ██╗     █████╗ ██╗
${C.cyan}  ██╔═══██╗██╔══██╗╚██╗ ██╔╝╚██╗██╔╝██╔════╝ ██╔════╝████╗  ██║    ██╔══██╗██║
${C.blue}  ██║   ██║██████╔╝ ╚████╔╝  ╚███╔╝ ██║  ███╗█████╗  ██╔██╗ ██║    ███████║██║
${C.purple}  ██║   ██║██╔══██╗  ╚██╔╝   ██╔██╗ ██║   ██║██╔══╝  ██║╚██╗██║    ██╔══██║██║
${C.rose}  ╚██████╔╝██║  ██║   ██║   ██╔╝ ██╗╚██████╔╝███████╗██║ ╚████║    ██║  ██║██║
${C.rose}   ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝${C.reset}
${C.gray}  [ Neural Architecture Platform · 200+ Models · 250+ Autonomous Agents · CodeX Engine ]${C.reset}
`;
  console.log(logo);
}

// ── 250+ Categorized Autonomous Agents & Skills Directory ──
const AGENT_CATEGORIES = [
  {
    name: "System Architecture & Scalability",
    count: 32,
    icon: "🏗",
    color: C.cyan,
    agents: [
      { id: "arch-monorepo", name: "Turborepo & Nx Monorepo Architect", desc: "Designs scalable multi-package monorepos with shared packages, pnpm workspaces, and remote caching." },
      { id: "arch-microservices", name: "Event-Driven Microservices Specialist", desc: "Designs decoupled microservices architectures with Kafka, RabbitMQ, and gRPC contracts." },
      { id: "arch-hexagonal", name: "Domain-Driven Design (DDD) Architect", desc: "Designs enterprise hexagonal architecture with domain entities, ports, and adapters." },
      { id: "arch-serverless", name: "Edge & Serverless Cloud Architect", desc: "Optimizes cloud native edge deployment, Cloudflare Workers, and AWS Lambda." },
    ],
  },
  {
    name: "Database, Prisma & Data Engineering",
    count: 35,
    icon: "🗄",
    color: C.emerald,
    agents: [
      { id: "db-prisma", name: "Prisma & PostgreSQL Modeling Expert", desc: "Generates optimal relation schemas, indexes, migrations, and zero-downtime seeds." },
      { id: "db-redis", name: "Redis Caching & BullMQ Queue Specialist", desc: "Implements high-performance Redis cache layers, rate-limiters, and job queues." },
      { id: "db-sharding", name: "Database Sharding & Replication Master", desc: "Designs horizontal sharding, read-replicas, and connection pool topologies." },
      { id: "db-vector", name: "Vector Database & RAG Architect", desc: "Configures pgvector, Pinecone, and Qdrant for semantic search embeddings." },
    ],
  },
  {
    name: "Security, Audit & Penetration Testing",
    count: 38,
    icon: "🛡",
    color: C.rose,
    agents: [
      { id: "sec-owasp", name: "OWASP Top 10 Auditor", desc: "Scans codebase for SQL injection, SSRF, XSS, CSRF, and broken access controls." },
      { id: "sec-auth", name: "JWT & OAuth2 Zero-Trust Architect", desc: "Designs hardened token refresh rotations, PKCE grants, and session revocation." },
      { id: "sec-sanitize", name: "Input Sanitization & Zod Contract Auditor", desc: "Enforces strict payload boundaries, type coercion defense, and safe deserialization." },
      { id: "sec-crypto", name: "Cryptographic Vault & Secrets Manager", desc: "Implements Argon2id password hashing, AES-256-GCM data encryption at rest." },
    ],
  },
  {
    name: "3D Design, WebGL & Creative Visuals",
    count: 30,
    icon: "🎨",
    color: C.purple,
    agents: [
      { id: "3d-threejs", name: "Three.js & React Three Fiber (R3F) Engineer", desc: "Builds interactive 3D WebGL scenes, camera controllers, GLTF loaders, and lighting." },
      { id: "3d-shaders", name: "GLSL Shader & Post-Processing Artist", desc: "Codes custom vertex & fragment shaders, bloom, chromatic aberration, and particle physics." },
      { id: "3d-ui", name: "Futuristic Glassmorphic UI/UX Designer", desc: "Synthesizes ultra-modern cybernetic dark interfaces with micro-animations." },
    ],
  },
  {
    name: "Autonomous CodeX Engine & Full-Stack Scaffolder",
    count: 45,
    icon: "⚡",
    color: C.amber,
    agents: [
      { id: "codex-fullstack", name: "Full-Stack SaaS Starter Generator", desc: "Autonomously writes complete Next.js 15, NestJS, and Prisma applications with zero mocks." },
      { id: "codex-api", name: "REST & GraphQL API Engine", desc: "Generates Swagger OpenAPI specs, DTOs, validation pipes, and route handlers." },
      { id: "codex-fixer", name: "Self-Healing Syntax Debugger", desc: "Auto-detects unclosed tags, syntax anomalies, and self-repairs code files." },
      { id: "codex-bot", name: "Telegram & Discord Bot Builder", desc: "Constructs production bots in Node.js Telegraf or Python aiogram." },
    ],
  },
  {
    name: "DevOps, Docker & CI/CD Pipelines",
    count: 35,
    icon: "🐳",
    color: C.blue,
    agents: [
      { id: "devops-docker", name: "Multi-Stage Docker & Compose Master", desc: "Crafts hardened, lightweight multi-stage Dockerfiles with non-root security." },
      { id: "devops-github", name: "GitHub Actions CI/CD Pipeline Architect", desc: "Constructs automated testing, linting, build verification, and deployment pipelines." },
      { id: "devops-k8s", name: "Kubernetes & Helm Chart Specialist", desc: "Authors deployment manifests, ingress controllers, HPA, and ConfigMaps." },
    ],
  },
  {
    name: "Deep Research & Scientific Synthesis",
    count: 35,
    icon: "🔬",
    color: C.white,
    agents: [
      { id: "res-deep", name: "Deep Literature & Whitepaper Synthesizer", desc: "Conducts multi-source technical analysis, trade-off comparisons, and system reviews." },
      { id: "res-benchmark", name: "Algorithm Benchmark & Complexity Analyzer", desc: "Evaluates Big-O time/space trade-offs and runtime memory profiling." },
    ],
  },
];

// Helper to prompt user in terminal
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

// ── Command Handlers ──

// 1. Auth / Login
async function handleAuth(args) {
  printLogo();
  const cfg = loadConfig();
  let key = args[0];

  if (!key) {
    console.log(`${C.bold}ORYXGEN AI Autentifikatsiyasi:${C.reset}`);
    console.log(`${C.gray}API kalitingizni https://avg-ai-creator.site saytida API bo'limidan oling.${C.reset}\n`);
    key = await askQuestion(`${C.cyan}API Kalitni kiriting (oryx_live_...): ${C.reset}`);
  }

  if (!key || !key.startsWith("oryx_live_")) {
    console.log(`${C.rose}❌ Xatolik: API kalit 'oryx_live_' bilan boshlanishi kerak.${C.reset}`);
    return;
  }

  cfg.apiKey = key;
  saveConfig(cfg);

  console.log(`\n${C.emerald}✓ API kalit muvaffaqiyatli saqlandi! (${CONFIG_FILE})${C.reset}`);
  console.log(`${C.gray}Endi 'oryxgen chat' yoki 'oryxgen code' buyruqlaridan erkin foydalanishingiz mumkin.${C.reset}\n`);
}

// 2. Status & Quota check
async function handleStatus() {
  printLogo();
  const cfg = loadConfig();
  if (!cfg.apiKey) {
    console.log(`${C.amber}⚠️ API kalit sozlanmagan. 'oryxgen auth <key>' buyrug'ini bajaring.${C.reset}`);
    return;
  }

  console.log(`${C.bold}Server bilan aloqa tekshirilmoqda...${C.reset}`);
  try {
    const res = await fetch(`${cfg.baseUrl}/analytics/usage`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log(`${C.rose}❌ Server xatosi (${res.status}): ${err.error?.message || "Kalit topilmadi"}${C.reset}`);
      return;
    }

    const { stats } = await res.json();
    console.log(`\n${C.emerald}✓ Oryxgen AI platformasiga ulandi!${C.reset}`);
    console.log(`${C.cyan}• Server Base URL:${C.reset}  ${cfg.baseUrl}`);
    console.log(`${C.cyan}• Faol API kalit:${C.reset}   ${cfg.apiKey.slice(0, 16)}...`);
    console.log(`${C.cyan}• Umumiy so'rovlar:${C.reset} ${stats?.totalRequests || 0} ta`);
    console.log(`${C.cyan}• Jami tokenlar:${C.reset}    ${(stats?.totalTokens || 0).toLocaleString()} tokens`);
    console.log(`${C.cyan}• Hozirgi TPM:${C.reset}      ${stats?.currentTpm || 0} tokens/min`);
    console.log(`${C.cyan}• Bepul tarmoq holati:${C.reset} ${C.emerald}Operational (100% Free Pool)${C.reset}\n`);
  } catch (err) {
    console.log(`${C.rose}❌ Serverga ulanishda xatolik: ${err.message}${C.reset}`);
  }
}

// 3. Models List
async function handleModels(args) {
  printLogo();
  const cfg = loadConfig();
  const searchFilter = (args[0] || "").toLowerCase();

  console.log(`${C.bold}Oryxgen AI katalogidagi modellar yuklanmoqda...${C.reset}\n`);

  try {
    const res = await fetch(`${cfg.baseUrl}/models`);
    const data = await res.json();
    const models = data.data || [];

    const filtered = searchFilter
      ? models.filter((m) => m.id.toLowerCase().includes(searchFilter) || m.display_name.toLowerCase().includes(searchFilter))
      : models;

    console.log(`${C.cyan}Mavjud modellar soni: ${filtered.length} ta${searchFilter ? ` ('${searchFilter}' bo'yicha filter)` : ""}:${C.reset}\n`);

    filtered.slice(0, 30).forEach((m, idx) => {
      const pad = String(idx + 1).padStart(2, " ");
      console.log(
        `${C.gray}${pad}.${C.reset} ${C.white}${C.bold}${m.display_name.padEnd(26, " ")}${C.reset} ${C.emerald}[${m.id}]${C.reset} ${C.gray}· ${m.owned_by} (${m.capability})${C.reset}`
      );
    });

    if (filtered.length > 30) {
      console.log(`\n${C.gray}... yana ${filtered.length - 30} ta model mavjud. Qidirish uchun: 'oryxgen models <nomi>'${C.reset}`);
    }
    console.log("");
  } catch (err) {
    console.log(`${C.rose}❌ Modellar ro'yxatini olishda xatolik: ${err.message}${C.reset}`);
  }
}

// 4. Agents & Skills Catalog
async function handleAgents(args) {
  printLogo();
  const subCmd = args[0] || "list";

  console.log(`${C.bold}ORYXGEN AI — 250+ Avtonom Agentlar va Mutaxassis Ko'nikmalari:${C.reset}\n`);

  let totalAgents = 0;
  AGENT_CATEGORIES.forEach((cat) => {
    totalAgents += cat.count;
    console.log(`${cat.color}${cat.icon} ${C.bold}${cat.name}${C.reset} ${C.gray}(${cat.count} ta agent)${C.reset}`);
    cat.agents.forEach((ag) => {
      console.log(`   ${C.white}• ${C.bold}${ag.name}${C.reset} ${C.gray}[ID: ${ag.id}]${C.reset}`);
      console.log(`     ${C.gray}${ag.desc}${C.reset}`);
    });
    console.log("");
  });

  console.log(`${C.emerald}Jami ro'yxatdan o'tgan agentlar: ${totalAgents}+ ta.${C.reset}`);
  console.log(`${C.gray}Agentni ishga tushirish uchun: oryxgen run <agent-id> "<topshiriq>"${C.reset}\n`);
}

// 5. Autonomous CodeX Project Generation
async function handleCode(args) {
  printLogo();
  const cfg = loadConfig();

  if (!cfg.apiKey) {
    console.log(`${C.amber}⚠️ API kalit sozlanmagan. Avval 'oryxgen auth <key>' ni bajaring.${C.reset}`);
    return;
  }

  const prompt = args.join(" ");
  if (!prompt || !prompt.trim()) {
    console.log(`${C.amber}Topshiriq matni kiritilmadi! Misol:${C.reset}`);
    console.log(`${C.white}oryxgen code "Next.js va Prisma bilan to'liq SaaS dashboard yarat"${C.reset}\n`);
    return;
  }

  console.log(`${C.cyan}⚡ CodeX Engine ishga tushirildi...${C.reset}`);
  console.log(`${C.gray}Topshiriq: "${prompt}"${C.reset}\n`);

  try {
    const res = await fetch(`${cfg.baseUrl}/codex/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.log(`${C.rose}❌ Xatolik (${res.status}): ${err.error || "Loyiha generatsiyasida muammo"}${C.reset}`);
      return;
    }

    const data = await res.json();
    console.log(`\n${C.emerald}✓ Loyiha arxitekturasi va kodlar muvaffaqiyatli tuzildi!${C.reset}`);
    console.log(`${C.white}${C.bold}Loyiha:${C.reset} ${data.plan?.title || "Yangi loyiha"}`);
    console.log(`${C.white}${C.bold}Stack:${C.reset}   ${data.plan?.stack || "Modern Web"}`);
    console.log(`${C.white}${C.bold}Xulosa:${C.reset}  ${data.summary || ""}\n`);

    const files = data.files || {};
    const fileKeys = Object.keys(files);

    console.log(`${C.cyan}📁 Generatsiya qilingan fayllar (${fileKeys.length} ta):${C.reset}`);
    fileKeys.forEach((f) => {
      console.log(`   ${C.gray}├──${C.reset} ${C.emerald}${f}${C.reset}`);
    });

    const savePrompt = await askQuestion(`\n${C.amber}Fayllarni joriy papkaga saqlashni xohlaysizmi? (h/yo'q): ${C.reset}`);
    if (savePrompt.toLowerCase().startsWith("h") || savePrompt.toLowerCase().startsWith("y")) {
      fileKeys.forEach((filePath) => {
        const full = path.join(process.cwd(), filePath);
        const dir = path.dirname(full);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(full, files[filePath], "utf-8");
      });
      console.log(`\n${C.emerald}✓ Barcha fayllar '${process.cwd()}' papkasiga muvaffaqiyatli yozildi!${C.reset}\n`);
    }
  } catch (err) {
    console.log(`${C.rose}❌ Tarmoq xatosi: ${err.message}${C.reset}`);
  }
}

// 6. Interactive Terminal Chat
async function handleChat(args) {
  printLogo();
  const cfg = loadConfig();

  if (!cfg.apiKey) {
    console.log(`${C.amber}⚠️ API kalit sozlanmagan. Avval 'oryxgen auth <key>' ni bajaring.${C.reset}`);
    return;
  }

  let currentModel = args[0] || cfg.defaultModel || "gpt-6-astra";

  console.log(`${C.emerald}✓ Oryxgen AI Terminal Chat boshlandi!${C.reset}`);
  console.log(`${C.cyan}• Tanlangan model:${C.reset} ${C.bold}${currentModel}${C.reset}`);
  console.log(`${C.gray}• Chiqish uchun 'exit' yoki 'quit' deb yozing. Modelni o'zgartirish uchun '/model <nom>'${C.reset}\n`);

  const history = [];

  while (true) {
    const input = await askQuestion(`${C.cyan}Siz: ${C.reset}`);
    if (!input || !input.trim()) continue;

    if (input.trim() === "exit" || input.trim() === "quit") {
      console.log(`\n${C.gray}Suhbat yakunlandi. Xayr!${C.reset}\n`);
      break;
    }

    if (input.startsWith("/model ")) {
      currentModel = input.slice(7).trim();
      console.log(`${C.emerald}Model o'zgartirildi: ${currentModel}${C.reset}\n`);
      continue;
    }

    history.push({ role: "user", content: input });
    process.stdout.write(`\n${C.purple}${currentModel}: ${C.reset}`);

    try {
      const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: currentModel,
          messages: history,
          stream: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.log(`\n${C.rose}❌ Xatolik (${res.status}): ${err.error?.message || "Javob olib bo'lmadi"}${C.reset}\n`);
        continue;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.slice(6);
            if (dataStr !== "[DONE]") {
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || "";
                if (delta) {
                  assistantText += delta;
                  process.stdout.write(delta);
                }
              } catch {}
            }
          }
        }
      }

      console.log("\n");
      history.push({ role: "assistant", content: assistantText });
    } catch (err) {
      console.log(`\n${C.rose}❌ Tarmoq xatosi: ${err.message}${C.reset}\n`);
    }
  }
}

// 7. Help & Usage
function handleHelp() {
  printLogo();
  console.log(`${C.bold}ORYXGEN AI CLI — Qo'llanma & Buyruqlar:${C.reset}\n`);
  console.log(`  ${C.cyan}oryxgen auth [kalit]${C.reset}         Oryxgen API kalitini saqlash`);
  console.log(`  ${C.cyan}oryxgen chat [--model <nom>]${C.reset}  Terminalda interaktiv jonli AI chat`);
  console.log(`  ${C.cyan}oryxgen code "<topshiriq>"${C.reset}    CodeX orqali to'liq loyiha va kod generatsiya qilish`);
  console.log(`  ${C.cyan}oryxgen models [qidiruv]${C.reset}     200+ modellarni ko'rish va qidirish`);
  console.log(`  ${C.cyan}oryxgen agents${C.reset}               250+ avtonom mutaxassis agentlar ro'yxati`);
  console.log(`  ${C.cyan}oryxgen status${C.reset}               API kalit, TPM va ulanish holati`);
  console.log(`  ${C.cyan}oryxgen help${C.reset}                 Ushbu qo'llanmani chiqarish\n`);
}

// ── Main Entrypoint ──
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "help";
  const rest = args.slice(1);

  switch (command.toLowerCase()) {
    case "auth":
    case "login":
      await handleAuth(rest);
      break;
    case "chat":
      await handleChat(rest);
      break;
    case "code":
    case "init":
      await handleCode(rest);
      break;
    case "models":
    case "list":
      await handleModels(rest);
      break;
    case "agents":
    case "agent":
    case "skills":
      await handleAgents(rest);
      break;
    case "status":
    case "info":
      await handleStatus();
      break;
    case "help":
    case "--help":
    case "-h":
    default:
      handleHelp();
      break;
  }
}

main().catch((err) => {
  console.error("Kutilmagan xatolik:", err);
  process.exit(1);
});
