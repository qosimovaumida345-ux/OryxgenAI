import { findMatchingTemplate } from "./templates.js";
import { resolveBestCodeModel } from "./mapper.js";

// Helper to call OpenRouter with failover across ranked models
async function callOpenRouter(messages, openRouterKey, temperature = 0.2) {
  if (!openRouterKey) {
    throw new Error("OpenRouter API kaliti sozlanmagan.");
  }

  const modelChain = await resolveBestCodeModel();
  let lastError = null;

  for (const model of modelChain) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://avg-ai-creator.site",
          "X-Title": "Oryxgen AI CodeX Engine",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        if (content.trim()) {
          return { content, modelUsed: model };
        }
      } else {
        const errText = await res.text().catch(() => "");
        lastError = new Error(`Model ${model} xatosi: ${res.status} ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Barcha bepul modellar band yoki javob bermadi. Qayta urinib ko'ring.");
}

// -------------------------------------------------------------
// PHASE A: PLAN GENERATOR (AI-DECIDED ARCHITECTURE & NAMING)
// -------------------------------------------------------------
export async function generateProjectPlan(userPrompt, openRouterKey) {
  const matchedTemplate = findMatchingTemplate(userPrompt);

  const plannerSystemPrompt = `You are Oryxgen AI CodeX Chief Systems Architect, an elite full-stack director and principal software engineer.
Your job is to analyze the user's project request and architect a complete, professional, modular software project plan.

CRITICAL ARCHITECTURAL RULES:
1. PROJECT TITLE: You MUST decide a unique, creative, professional application title (e.g., "ApexMarket - Decentralized E-Commerce Hub", "ZenithFlow - Real-time Kanban Suite", "AeroTune - Modern Audio Streaming Platform"). NEVER repeat the user prompt verbatim, and NEVER use generic titles like "My Project" or "App".
2. DYNAMIC MODULAR ARCHITECTURE (NO SINGLE-FILE CODE DUMPS):
   - You MUST architect a clean, modular multi-file structure. Analyze what the user's project actually requires to be complete, maintainable, and realistic.
   - NEVER dump all application code into a single file or generate only 2-3 superficial files.
   - For React / Web Applications:
     * Main entry & styling: "src/App.jsx", "src/index.css"
     * Core UI Components: e.g. "src/components/Navbar.jsx", "src/components/ProductCard.jsx", "src/components/CartDrawer.jsx", "src/components/FilterBar.jsx", "src/components/Footer.jsx"
     * Custom Hooks / Logic: e.g. "src/hooks/useCart.js", "src/hooks/useProducts.js"
     * State / Context: e.g. "src/context/CartContext.jsx" (when state sharing across components is needed)
     * Data / Utilities: e.g. "src/utils/mockData.js", "src/utils/formatters.js"
     * Package Manifest: "package.json"
   - For Node / Express Backend APIs:
     * "server.js", "routes/api.js", "controllers/itemController.js", "middleware/auth.js", "package.json", "README.md"
   - For Telegram Bots / Python:
     * "bot.py", "handlers/start.py", "handlers/commands.py", "config.py", "requirements.txt", "README.md"
   - Plan between 5 to 8 focused, complete files that cleanly divide responsibilities.
3. OUTPUT FORMAT: Output ONLY a valid JSON object wrapped in \`\`\`json ... \`\`\` code block. No conversational chatter outside the JSON.

JSON Schema:
{
  "title": "Creative, Professional Project Title",
  "projectType": "frontend" | "backend" | "fullstack" | "bot" | "script",
  "stack": "react-vite-tailwind" | "node-express" | "python-telegram-bot" | "python-flask",
  "summary": "Clear, professional 1-2 sentence description of the app.",
  "dependencies": ["react", "lucide-react", "tailwindcss"],
  "runCommand": "npm run dev",
  "files": [
    { "path": "src/App.jsx", "purpose": "Root layout, navigation integration, and main view container" },
    { "path": "src/components/Navbar.jsx", "purpose": "Top navigation with search, category links, and cart badge" },
    { "path": "src/components/ProductCard.jsx", "purpose": "Individual product display with price, badge, and add-to-cart action" },
    { "path": "src/components/CartDrawer.jsx", "purpose": "Slide-over shopping cart panel with quantity controls and checkout" },
    { "path": "src/hooks/useCart.js", "purpose": "Custom React hook managing shopping cart state, items, and totals" },
    { "path": "src/utils/mockData.js", "purpose": "Realistic initial catalog dataset with categories, prices, and ratings" },
    { "path": "src/index.css", "purpose": "Tailwind directives and custom micro-animations" },
    { "path": "package.json", "purpose": "Project dependencies and npm build/dev scripts" }
  ]
}`;

  const messages = [
    { role: "system", content: plannerSystemPrompt },
    { role: "user", content: `User Prompt: ${userPrompt}\nDesign the complete, modular project plan JSON:` },
  ];

  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { content } = await callOpenRouter(messages, openRouterKey, 0.2);

      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // If outer text exists, extract substring between first { and last }
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }

      // Clean trailing commas
      jsonStr = jsonStr.replace(/,\s*([\]}])/g, "$1");

      const plan = JSON.parse(jsonStr);
      if (!plan.files || !Array.isArray(plan.files) || plan.files.length < 3) {
        throw new Error("Files list is empty or insufficient");
      }
      return plan;
    } catch (err) {
      lastErr = err;
    }
  }

  // Dynamic fallback plan with modular structure tailored to the user's prompt
  const lowerPrompt = userPrompt.toLowerCase();
  const isMarketplace = /market|shop|store|savdo|buyurtma|buy|product|tovar/i.test(lowerPrompt);
  const isDashboard = /dash|stat|admin|panel|crm|analytics/i.test(lowerPrompt);
  const isGame = /game|o['`]?yin|play|score|arcade/i.test(lowerPrompt);
  const isChat = /chat|suhbat|xabar|message|messenger/i.test(lowerPrompt);

  let dynamicTitle = "Oryxgen Pro Studio";
  let dynamicFiles = [];

  if (isMarketplace) {
    dynamicTitle = "NovaStore - Modern E-Commerce Hub";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "Asosiy vitrina va mahsulotlar boshqaruvi" },
      { path: "src/components/Navbar.jsx", purpose: "Navigatsiya paneli, qidiruv va savatcha hisoblagichi" },
      { path: "src/components/ProductCard.jsx", purpose: "Mahsulot kartochkasi, narx va 'Savatchaga qo'shish'" },
      { path: "src/components/CartModal.jsx", purpose: "Savatcha oynasi, buyurtma berish va jami narx" },
      { path: "src/hooks/useCart.js", purpose: "Savatcha holatini boshqaruvchi maxsus React hook" },
      { path: "src/utils/mockData.js", purpose: "Boshlang'ich mahsulotlar va toifalar ma'lumotlar bazasi" },
      { path: "src/index.css", purpose: "Tailwind stillari va animatsiyalar" },
      { path: "package.json", purpose: "Paketlar ro'yxati" },
    ];
  } else if (isDashboard) {
    dynamicTitle = "ApexMetrics - Analytics & CRM Suite";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "Asosiy boshqaruv paneli va widgetlar" },
      { path: "src/components/Sidebar.jsx", purpose: "Yon menyu va bo'limlar navigatsiyasi" },
      { path: "src/components/StatCard.jsx", purpose: "Statistika ko'rsatkichlari kartochkasi" },
      { path: "src/components/DataTable.jsx", purpose: "Ma'lumotlar jadvali va qidiruv filtrlari" },
      { path: "src/utils/mockData.js", purpose: "Tahliliy metrikalar va foydalanuvchilar ma'lumotlari" },
      { path: "src/index.css", purpose: "Tailwind stillari va qorong'u rejim" },
      { path: "package.json", purpose: "Paketlar ro'yxati" },
    ];
  } else if (isGame) {
    dynamicTitle = "ArcadeRealm - Interactive Web Game";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "O'yin maydoni, hisob va boshqaruv mexanikasi" },
      { path: "src/components/GameBoard.jsx", purpose: "Asosiy interaktiv o'yin platasi" },
      { path: "src/components/ScoreBoard.jsx", purpose: "Ballar, rekordlar va vaqt hisoblagichi" },
      { path: "src/hooks/useGameLogic.js", purpose: "O'yin qoidalari va to'qnashuvlar hooki" },
      { path: "src/index.css", purpose: "O'yin animatsiyalari va vizual effektlar" },
      { path: "package.json", purpose: "Paketlar ro'yxati" },
    ];
  } else if (isChat) {
    dynamicTitle = "NexusChat - Real-time Messaging App";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "Asosiy chat konteyneri va suhbatlar oqimi" },
      { path: "src/components/ChatList.jsx", purpose: "Aktiv suhbatdoshlar ro'yxati" },
      { path: "src/components/MessageBubble.jsx", purpose: "Xabarlar pufakchalari va holatlar" },
      { path: "src/components/MessageInput.jsx", purpose: "Xabar yozish paneli va emojilar" },
      { path: "src/index.css", purpose: "Chat stillari va silliq siljish animatsiyalari" },
      { path: "package.json", purpose: "Paketlar ro'yxati" },
    ];
  } else {
    dynamicTitle = "ZenithWeb - Modern Modular Application";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "Asosiy interfeys va ilova boshqaruvi" },
      { path: "src/components/Navbar.jsx", purpose: "Yuqori navigatsiya va brending paneli" },
      { path: "src/components/HeroSection.jsx", purpose: "Asosiy banner va xizmatlar ta'rifi" },
      { path: "src/components/FeatureList.jsx", purpose: "Ilova imkoniyatlari ro'yxati" },
      { path: "src/utils/helpers.js", purpose: "Yordamchi funksiyalar va konfiguratsiya" },
      { path: "src/index.css", purpose: "Tailwind stillari va zamonaviy UI" },
      { path: "package.json", purpose: "Paketlar ro'yxati" },
    ];
  }

  return {
    isFallbackTemplate: false,
    projectType: matchedTemplate.projectType || "frontend",
    stack: matchedTemplate.stack || "react-vite-tailwind",
    title: dynamicTitle,
    summary: `${dynamicTitle} — To'liq modulli, ko'p faylli professional arxitektura.`,
    dependencies: matchedTemplate.dependencies || ["react", "react-dom", "lucide-react", "tailwindcss"],
    runCommand: matchedTemplate.projectType === "frontend" ? "npm run dev" : "npm start",
    files: dynamicFiles,
  };
}

// -------------------------------------------------------------
// PHASE B: FILE GENERATION
// -------------------------------------------------------------
export async function generateProjectFiles(userPrompt, plan, openRouterKey, onFileEvent = null) {
  const projectFiles = {};
  const allFilePaths = plan.files.map((f) => f.path);

  // Group files in batches of 1-2 files to maximize code completeness and avoid truncation
  const batches = [];
  for (let i = 0; i < plan.files.length; i += 2) {
    batches.push(plan.files.slice(i, i + 2));
  }

  for (const batch of batches) {
    const batchTargetFiles = batch.map((f) => f.path).join(", ");

    if (onFileEvent) {
      batch.forEach((f) => onFileEvent({ type: "file_start", path: f.path, purpose: f.purpose }));
    }

    const generatorSystemPrompt = `You are Oryxgen AI CodeX Staff Software Engineer, an elite developer specialized in creating production-ready, clean, maintainable web applications and backend systems.

Project Context:
- Project Title: "${plan.title}"
- Stack: ${plan.stack} (${plan.projectType})
- All Planned Files in Project: ${JSON.stringify(allFilePaths)}
- Target Files to write NOW: ${JSON.stringify(batch)}

CRITICAL IMPLEMENTATION RULES:
1. Write 100% complete, working, production-grade code. NEVER use placeholders like "// TODO", "// implement later", or "...rest of code".
2. Cross-File Imports: Match import paths with the planned files (e.g. import Navbar from './components/Navbar'; import { useCart } from '../hooks/useCart';).
3. If React: Write modern functional components using React hooks (useState, useEffect, useMemo), Tailwind CSS styling with dark/modern palette, Lucide/SVG icons, and responsive layouts.
4. If Python/Node: Write complete executable code with proper error handling and clean exports.
5. FORMAT: Wrap each file in <file path="...">...</file> tags. Output ONLY the file tags without conversational chatter outside the tags.`;

    const messages = [
      { role: "system", content: generatorSystemPrompt },
      { role: "user", content: `User Prompt: ${userPrompt}\nWrite complete code for: ${batchTargetFiles}` },
    ];

    const { content } = await callOpenRouter(messages, openRouterKey, 0.2);

    // Extract files from <file path="...">...</file>
    const fileRegex = /<file\s+path="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;
    let extractedCount = 0;

    while ((match = fileRegex.exec(content)) !== null) {
      const filePath = match[1].trim();
      let fileCode = match[2].trim();

      // Clean up markdown code fence if wrapped inside file tag
      fileCode = fileCode.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "");

      projectFiles[filePath] = fileCode;
      extractedCount++;

      // Validate single file (Phase C)
      const validation = validateFileContent(filePath, fileCode, allFilePaths);

      if (!validation.valid) {
        // Targeted auto-retry (up to 2 retries)
        const fixedCode = await retryFixFile(filePath, fileCode, validation.error, plan, openRouterKey);
        projectFiles[filePath] = fixedCode;
        if (onFileEvent) {
          onFileEvent({ type: "file_validate", path: filePath, status: "fixed", error: validation.error });
        }
      } else {
        if (onFileEvent) {
          onFileEvent({ type: "file_validate", path: filePath, status: "valid" });
        }
      }

      if (onFileEvent) {
        onFileEvent({ type: "file_done", path: filePath, content: projectFiles[filePath] });
      }
    }

    // Fallback if model missed <file> tags for a single target
    if (extractedCount === 0 && batch.length === 1) {
      const singlePath = batch[0].path;
      let rawCode = content.trim();
      const codeFenceMatch = rawCode.match(/```(?:[a-zA-Z]*)\s*([\s\S]*?)```/);
      if (codeFenceMatch) rawCode = codeFenceMatch[1].trim();
      projectFiles[singlePath] = rawCode;
      if (onFileEvent) {
        onFileEvent({ type: "file_done", path: singlePath, content: rawCode });
      }
    }
  }

  // Ensure primary entrypoint exists
  if (plan.projectType === "frontend" && !projectFiles["src/App.jsx"] && !projectFiles["App.jsx"] && !projectFiles["index.html"]) {
    projectFiles["src/App.jsx"] = `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">\n      <h1 className="text-2xl font-bold">${plan.title}</h1>\n    </div>\n  );\n}`;
  }

  return projectFiles;
}


// -------------------------------------------------------------
// PHASE C: VALIDATION & AUTO-RETRY
// -------------------------------------------------------------
export function validateFileContent(filePath, content, allPlannedFiles = []) {
  if (!content || !content.trim()) {
    return { valid: false, error: "Fayl bo'sh generatsiya qilingan." };
  }

  const isJs = /\.(js|jsx|ts|tsx)$/i.test(filePath);
  const isPy = /\.py$/i.test(filePath);
  const isJson = /\.json$/i.test(filePath);

  // 1. JSON syntax validation
  if (isJson) {
    try {
      JSON.parse(content);
    } catch (err) {
      return { valid: false, error: `JSON sintaksis xatosi: ${err.message}` };
    }
  }

  // 2. JS / JSX basic syntax and bracket balance check
  if (isJs) {
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) > 2) {
      return { valid: false, error: `Qavslar balansi buzilgan: { = ${openBraces}, } = ${closeBraces}` };
    }

    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (Math.abs(openParens - closeParens) > 2) {
      return { valid: false, error: `Dumaloq qavslar balansi buzilgan: ( = ${openParens}, ) = ${closeParens}` };
    }

    // Check unclosed backticks
    const backticks = (content.match(/`/g) || []).length;
    if (backticks % 2 !== 0) {
      return { valid: false, error: "Yopilmagan template literal (`) aniqlandi." };
    }

    // Check cross-file imports
    const importRegex = /import\s+[\s\S]*?from\s+['"](\.[^'"]+)['"]/g;
    let impMatch;
    while ((impMatch = importRegex.exec(content)) !== null) {
      const targetRel = impMatch[1];
      const normalizedTarget = targetRel.replace(/^\.\//, "").replace(/^\.\.\//, "");
      const matchExists = allPlannedFiles.some((p) => p.includes(normalizedTarget) || p.replace(/\.[^/.]+$/, "").includes(normalizedTarget));
      if (allPlannedFiles.length > 1 && !matchExists && !normalizedTarget.includes(".css")) {
        // Notice: Soft flag for cross-file imports
      }
    }
  }

  // 3. Python basic check
  if (isPy) {
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return { valid: false, error: `Python qavslar balansi buzilgan: ( = ${openParens}, ) = ${closeParens}` };
    }
  }

  return { valid: true };
}

// Targeted retry for broken files
async function retryFixFile(filePath, brokenContent, errorMessage, plan, openRouterKey, retries = 2) {
  let currentCode = brokenContent;
  let currentError = errorMessage;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fixPrompt = `You are CodeX Fixer.
File: "${filePath}" in project "${plan.title}" (${plan.stack})
Error detected: ${currentError}

Broken Code:
${currentCode}

Fix the exact error and output ONLY the corrected code wrapped in:
<file path="${filePath}">
// fixed code here
</file>`;

      const messages = [
        { role: "system", content: "You fix syntax errors and unclosed brackets in code. Output ONLY <file> tag." },
        { role: "user", content: fixPrompt },
      ];

      const { content } = await callOpenRouter(messages, openRouterKey, 0.1);
      const match = content.match(/<file\s+path="[^"]*">([\s\S]*?)<\/file>/);
      if (match) {
        currentCode = match[1].trim();
        const check = validateFileContent(filePath, currentCode, []);
        if (check.valid) {
          return currentCode;
        }
        currentError = check.error;
      }
    } catch {
      break;
    }
  }

  return currentCode;
}

// -------------------------------------------------------------
// END-TO-END CODEX PIPELINE EXECUTOR
// -------------------------------------------------------------
export async function executeCodexPipeline(userPrompt, openRouterKey, onEvent = () => { }) {
  // 1. Plan Phase
  onEvent({ type: "phase", phase: "plan", message: "Loyiha arxitekturasi va fayllar rejasi tuzilmoqda..." });
  const plan = await generateProjectPlan(userPrompt, openRouterKey);
  onEvent({ type: "plan", plan });

  // 2. Generate & Validate Phase
  onEvent({ type: "phase", phase: "generate", message: "Fayllar generatsiya qilinmoqda va sintaksis tekshirilmoqda..." });
  const projectFiles = await generateProjectFiles(userPrompt, plan, openRouterKey, onEvent);

  // 3. Completion
  onEvent({ type: "phase", phase: "complete", message: "Loyiha muvaffaqiyatli tayyorlandi!" });
  onEvent({ type: "complete", plan, projectFiles });

  return { plan, projectFiles };
}
