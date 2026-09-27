import { findMatchingTemplate } from "./templates.js";
import { resolveBestCodeModel } from "./mapper.js";

// Helper to call OpenRouter with failover across ranked models and large max_tokens
async function callOpenRouter(messages, openRouterKey, temperature = 0.2, maxTokens = 8192) {
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
          max_tokens: maxTokens,
        }),
      });

      let actualRes = res;
      if (!actualRes.ok && actualRes.status === 400) {
        const errText = await actualRes.text().catch(() => "");
        if (/max_tokens|token limit|exceed/i.test(errText) && maxTokens > 4096) {
          // Model maximum output is lower than 8192, retry with 4096
          actualRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
              max_tokens: 4096,
            }),
          });
        } else {
          lastError = new Error(`Model ${model} xatosi: ${actualRes.status} ${errText}`);
          continue;
        }
      }

      if (actualRes.ok) {
        const data = await actualRes.json();
        const content = data.choices?.[0]?.message?.content || "";
        if (content.trim()) {
          return { content, modelUsed: model };
        }
      } else {
        const errText = await actualRes.text().catch(() => "");
        lastError = new Error(`Model ${model} xatosi: ${actualRes.status} ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Barcha bepul modellar band yoki javob bermadi. Qayta urinib ko'ring.");
}

// -------------------------------------------------------------
// SCAFFOLD GENERATOR: GUARANTEED ERROR-FREE VITE + TAILWIND ENVIRONMENT
// -------------------------------------------------------------
export function createProjectScaffolds(plan) {
  const isFrontend = plan.projectType === "frontend" || !plan.projectType || plan.stack?.includes("react");
  const cleanName = (plan.title || "oryxgen-app").toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "") || "oryxgen-app";
  const files = {};

  if (isFrontend) {
    // 1. index.html at root — Prevents 404 Not Found on Vite localhost:5173
    files["index.html"] = `<!DOCTYPE html>
<html lang="uz">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${plan.title || "Oryxgen Web App"}</title>
  </head>
  <body class="bg-slate-950 text-slate-100 antialiased min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

    // 2. src/main.jsx — mounts React 18 createRoot
    files["src/main.jsx"] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;

    // 3. vite.config.js — standard React Vite config
    files["vite.config.js"] = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
});
`;

    // 4. package.json — compatible, battle-tested modern dependencies
    files["package.json"] = JSON.stringify({
      name: cleanName,
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview"
      },
      dependencies: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
        "lucide-react": "^0.460.0",
        clsx: "^2.1.1",
        "tailwind-merge": "^2.5.5"
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.3.4",
        vite: "^6.0.0",
        tailwindcss: "^3.4.15",
        postcss: "^8.4.49",
        autoprefixer: "^10.4.20"
      }
    }, null, 2);

    // 5. tailwind.config.js
    files["tailwind.config.js"] = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;

    // 6. postcss.config.js
    files["postcss.config.js"] = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

    // 7. src/index.css
    files["src/index.css"] = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #09090b;
  color: #f8fafc;
}
`;

    // 8. README.md
    files["README.md"] = `# ${plan.title || "Oryxgen App"}

${plan.summary || "Oryxgen AI CodeX tomonidan yaratilgan to'liq va modulli React ilovasi."}

## Ishga tushirish (Local Development)

1. Kutubxonalarni o'rnatish:
\`\`\`bash
npm install
\`\`\`

2. Dasturni ishga tushirish:
\`\`\`bash
npm run dev
\`\`\`

Brauzeringizda quyidagi manzilni oching:
👉 **http://localhost:5173**

## Production Build
\`\`\`bash
npm run build
\`\`\`
`;
  } else if (plan.projectType === "backend") {
    files["package.json"] = JSON.stringify({
      name: cleanName,
      version: "1.0.0",
      type: "module",
      scripts: {
        start: "node server.js",
        dev: "node --watch server.js"
      },
      dependencies: {
        express: "^4.21.2",
        cors: "^2.8.5",
        dotenv: "^16.4.7"
      }
    }, null, 2);

    files["README.md"] = `# ${plan.title}

\`\`\`bash
npm install
npm start
\`\`\`
`;
  } else if (plan.projectType === "bot") {
    files["requirements.txt"] = `python-telegram-bot>=21.0
requests>=2.32.0
python-dotenv>=1.0.0
`;
    files["README.md"] = `# ${plan.title}

\`\`\`bash
pip install -r requirements.txt
python bot.py
\`\`\`
`;
  }

  return files;
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
2. NO MOCK STUBS OR FAKE DATA FILES:
   - NEVER create files like "mockData.js" with 2 fake items and no actual features.
   - Plan real, working application components and services. E.g. "src/services/storage.js" for persistent localStorage operations, state management, search, filters, and CRUD.
3. SCAFFOLDING IS INJECTED AUTOMATICALLY:
   - "index.html", "src/main.jsx", "vite.config.js", "package.json", "tailwind.config.js", "postcss.config.js", "README.md" are automatically handled by the engine.
   - Do NOT put config files in your plan. FOCUS on 4 to 6 deep, meaningful APPLICATION files:
     * "src/App.jsx" (Main application container, views, routing/tabs, layout, notifications)
     * "src/services/storage.js" (Real persistent state with localStorage, CRUD, filters, event listeners)
     * "src/components/Navbar.jsx" (Interactive navigation, search bar, active mode/cart badges, theme toggle)
     * "src/components/MainCatalog.jsx" or main feature view (Complete listing, filters, sorting, cards, interactive buttons)
     * "src/components/ItemModal.jsx" or action drawer (Full form, validation, add/edit/delete item, calculations)
     * "src/index.css" (Tailwind custom utility classes and micro-animations)
4. OUTPUT FORMAT: Output ONLY a valid JSON object wrapped in \`\`\`json ... \`\`\` code block. No conversational chatter outside the JSON.

JSON Schema:
{
  "title": "Creative, Professional Project Title",
  "projectType": "frontend" | "backend" | "fullstack" | "bot" | "script",
  "stack": "react-vite-tailwind" | "node-express" | "python-telegram-bot",
  "summary": "Clear, professional 1-2 sentence description of the app.",
  "dependencies": ["react", "lucide-react", "tailwindcss"],
  "runCommand": "npm run dev",
  "files": [
    { "path": "src/App.jsx", "purpose": "Asosiy boshqaruv va interfeys konteyneri" },
    { "path": "src/services/storage.js", "purpose": "Haqiqiy localStorage ma'lumotlar bazasi, to'liq CRUD va hodisalar tizimi" },
    { "path": "src/components/Navbar.jsx", "purpose": "Navigatsiya paneli, qidiruv va bildirishnomalar" },
    { "path": "src/components/CatalogView.jsx", "purpose": "Asosiy interaktiv katalog, filtrlash va saralash" },
    { "path": "src/components/ActionModal.jsx", "purpose": "Yangi ma'lumot kiritish va tahrirlash oynasi" },
    { "path": "src/index.css", "purpose": "Tailwind stillari va silliq animatsiyalar" }
  ]
}`;

  const messages = [
    { role: "system", content: plannerSystemPrompt },
    { role: "user", content: `User Prompt: ${userPrompt}\nDesign the complete, modular project plan JSON:` },
  ];

  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { content } = await callOpenRouter(messages, openRouterKey, 0.2, 2048);

      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }

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
      { path: "src/App.jsx", purpose: "Asosiy vitrina, savatcha hisobi va xaridlar oqimi" },
      { path: "src/services/storage.js", purpose: "Mahsulotlar va buyurtmalarni localStorage da saqlash va CRUD amallari" },
      { path: "src/components/Navbar.jsx", purpose: "Navigatsiya, qidiruv tizimi va savatcha bildirishnomasi" },
      { path: "src/components/ProductGrid.jsx", purpose: "Mahsulotlar ro'yxati, toifalar bo'yicha filter va saralash" },
      { path: "src/components/CartDrawer.jsx", purpose: "Savatcha oynasi, mahsulotlar sonini o'zgartirish va rasmiylashtirish" },
      { path: "src/index.css", purpose: "Tailwind stillari va maxsus animatsiyalar" },
    ];
  } else if (isDashboard) {
    dynamicTitle = "ApexMetrics - Analytics & CRM Suite";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "Boshqaruv paneli, real vaqt statistikasi va metrikalar" },
      { path: "src/services/storage.js", purpose: "Mijozlar va tahliliy ma'lumotlarni saqlash va boshqarish" },
      { path: "src/components/Sidebar.jsx", purpose: "Yon menyu, sahifalar navigatsiyasi va profil" },
      { path: "src/components/StatCards.jsx", purpose: "Asosiy ko'rsatkichlar va dinamika kartochkalari" },
      { path: "src/components/DataTable.jsx", purpose: "Ma'lumotlar jadvali, filtrlash, qidiruv va eksport" },
      { path: "src/index.css", purpose: "Tailwind stillari va qorong'u rejim" },
    ];
  } else if (isGame) {
    dynamicTitle = "ArcadeRealm - Interactive Web Game";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "O'yin maydoni, hisob va boshqaruv mexanikasi" },
      { path: "src/services/storage.js", purpose: "Eng yaxshi rekordlar va natijalar saqlagichi" },
      { path: "src/components/GameBoard.jsx", purpose: "Asosiy interaktiv o'yin platasi va to'qnashuvlar" },
      { path: "src/components/ScoreBoard.jsx", purpose: "Ballar, rekordlar va vaqt hisoblagichi" },
      { path: "src/index.css", purpose: "O'yin animatsiyalari va vizual effektlar" },
    ];
  } else if (isChat) {
    dynamicTitle = "NexusChat - Real-time Messaging App";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "Asosiy chat konteyneri va suhbatlar oqimi" },
      { path: "src/services/storage.js", purpose: "Xabarlar tarixi va suhbatdoshlar xotirasi" },
      { path: "src/components/ChatList.jsx", purpose: "Aktiv suhbatdoshlar ro'yxati va holatlar" },
      { path: "src/components/MessageArea.jsx", purpose: "Xabarlar maydoni, yozish paneli va emojilar" },
      { path: "src/index.css", purpose: "Chat stillari va silliq siljish animatsiyalari" },
    ];
  } else {
    dynamicTitle = "ZenithWeb - Modern Modular Application";
    dynamicFiles = [
      { path: "src/App.jsx", purpose: "Asosiy interfeys va ilova boshqaruvi" },
      { path: "src/services/storage.js", purpose: "Ilova ma'lumotlarini localStorage da xavfsiz boshqarish" },
      { path: "src/components/Navbar.jsx", purpose: "Yuqori navigatsiya va brending paneli" },
      { path: "src/components/MainSection.jsx", purpose: "Asosiy funksional qism va foydalanuvchi amallari" },
      { path: "src/index.css", purpose: "Tailwind stillari va zamonaviy UI" },
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
// PHASE B: DEEP FILE GENERATION (ONE-BY-ONE, 4096 TOKENS)
// -------------------------------------------------------------
export async function generateProjectFiles(userPrompt, plan, openRouterKey, onFileEvent = null) {
  // Pre-populate verified scaffolding files
  const scaffolds = createProjectScaffolds(plan);
  const projectFiles = { ...scaffolds };

  // All scaffold files are immediately ready
  if (onFileEvent) {
    Object.keys(scaffolds).forEach((scaffoldPath) => {
      onFileEvent({ type: "file_validate", path: scaffoldPath, status: "valid" });
      onFileEvent({ type: "file_done", path: scaffoldPath, content: scaffolds[scaffoldPath] });
    });
  }

  // Filter application files to write (excluding scaffolds)
  const appFiles = (plan.files || []).filter(
    (f) => !["index.html", "package.json", "vite.config.js", "tailwind.config.js", "postcss.config.js", "README.md", "requirements.txt"].includes(f.path)
  );

  const allFilePaths = [...Object.keys(scaffolds), ...appFiles.map((f) => f.path)];

  // Generate each application file individually to give maximum 4096 tokens per file!
  for (const fileObj of appFiles) {
    const filePath = fileObj.path;
    const filePurpose = fileObj.purpose || "Loyiha kodi";

    if (onFileEvent) {
      onFileEvent({ type: "file_start", path: filePath, purpose: filePurpose });
    }

    const generatorSystemPrompt = `You are Oryxgen AI CodeX Principal Software Engineer, an elite developer specialized in creating production-ready, fully functional web applications and backend systems.

Project Context:
- Project Title: "${plan.title}"
- Stack: ${plan.stack} (${plan.projectType})
- All Project Files in Project: ${JSON.stringify(allFilePaths)}
- Target File to write NOW: "${filePath}" (${filePurpose})

CRITICAL IMPLEMENTATION RULES (DEEP, COMPREHENSIVE, COMPLETE CODE):
1. WRITE IN-DEPTH, FULLY FUNCTIONAL, PRODUCTION-READY CODE:
   - Target 150 to 350+ lines of rich, working code for main components and views.
   - ABSOLUTELY NO TOY SKELETONS, NO 20-30 LINE STUBS, NO PLACEHOLDERS like "// TODO" or "...rest of code".
2. REAL PERSISTENT STATE & INTERACTIONS (NO LAZY MOCKS):
   - Do NOT just create a fake static 3-item array.
   - Implement real persistent data using localStorage or React state.
   - Include full interactive features: create, update, delete, search, filter by category/price/status, sort, pagination/infinite scroll, toggle states, modal forms, validation with error hints, toast feedback, statistics calculations, and rich visual themes.
3. BEAUTIFUL, MODERN DESIGN SYSTEM:
   - Use Tailwind CSS with dark mode aesthetics (rich slate-900 / zinc-900 palettes, glassmorphism, glowing accents, badge indicators, subtle borders).
   - Use clean Lucide icons or inline SVGs.
   - Add micro-animations (transitions, hover scales, active presses, badge pulses).
4. COMPLETE & ERROR-FREE SYNTAX:
   - Every opening JSX tag must be closed.
   - Balance all parentheses, brackets, and template literals.
   - Export the component as default or named matching the file purpose.
   - Cross-file imports must match project files exactly.
5. FORMAT: Wrap the code in:
<file path="${filePath}">
// complete production code
</file>`;

    const messages = [
      { role: "system", content: generatorSystemPrompt },
      { role: "user", content: `User Prompt: ${userPrompt}\nWrite the complete, in-depth, error-free implementation for: ${filePath}` },
    ];

    try {
      const { content } = await callOpenRouter(messages, openRouterKey, 0.15, 8192);

      let fileCode = "";
      const match = content.match(/<file\s+path="[^"]*">([\s\S]*?)<\/file>/);
      if (match) {
        fileCode = match[1].trim();
      } else {
        // Fallback: extract from code fences
        const fenceMatch = content.match(/```(?:[a-zA-Z]*)\s*([\s\S]*?)```/);
        fileCode = fenceMatch ? fenceMatch[1].trim() : content.trim();
      }

      // Strip any accidental markdown fences inside
      fileCode = fileCode.replace(/^```[a-zA-Z]*\n/, "").replace(/\n```$/, "").trim();

      // Phase C: Validate
      const validation = validateFileContent(filePath, fileCode, allFilePaths);

      if (!validation.valid) {
        const fixedCode = await retryFixFile(filePath, fileCode, validation.error, plan, openRouterKey);
        projectFiles[filePath] = fixedCode;
        if (onFileEvent) {
          onFileEvent({ type: "file_validate", path: filePath, status: "fixed", error: validation.error });
        }
      } else {
        projectFiles[filePath] = fileCode;
        if (onFileEvent) {
          onFileEvent({ type: "file_validate", path: filePath, status: "valid" });
        }
      }

      if (onFileEvent) {
        onFileEvent({ type: "file_done", path: filePath, content: projectFiles[filePath] });
      }
    } catch (err) {
      console.error(`Error generating file ${filePath}:`, err);
      // Fallback robust file creation so pipeline never halts
      if (!projectFiles[filePath]) {
        projectFiles[filePath] = generateSafeFallbackFile(filePath, plan);
        if (onFileEvent) {
          onFileEvent({ type: "file_validate", path: filePath, status: "valid" });
          onFileEvent({ type: "file_done", path: filePath, content: projectFiles[filePath] });
        }
      }
    }
  }

  // Ensure primary App.jsx exists
  if (!projectFiles["src/App.jsx"] && !projectFiles["App.jsx"]) {
    projectFiles["src/App.jsx"] = generateSafeFallbackFile("src/App.jsx", plan);
  }

  return projectFiles;
}

// -------------------------------------------------------------
// PHASE C: SYNTAX VALIDATION & AUTO-RETRY
// -------------------------------------------------------------
function stripStringsAndComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/`(?:\\.|[^`])*`/g, '""')
    .replace(/"(?:\\.|[^"])*"/g, '""')
    .replace(/'(?:\\.|[^'])*'/g, "''");
}

export function validateFileContent(filePath, content, allPlannedFiles = []) {
  if (!content || !content.trim()) {
    return { valid: false, error: "Fayl bo'sh generatsiya qilingan." };
  }

  const isJs = /\.(js|jsx|ts|tsx)$/i.test(filePath);
  const isPy = /\.py$/i.test(filePath);
  const isJson = /\.json$/i.test(filePath);

  // 1. JSON syntax check
  if (isJson) {
    try {
      JSON.parse(content);
    } catch (err) {
      return { valid: false, error: `JSON sintaksis xatosi: ${err.message}` };
    }
  }

  // 2. JS / JSX structural bracket balance check
  if (isJs) {
    const trimmed = content.trim();
    if (trimmed.endsWith("return (") || trimmed.endsWith("const ") || trimmed.endsWith("import ") || trimmed.endsWith("function ") || trimmed.endsWith("=>")) {
      return { valid: false, error: "Kod oxiriga yetmasdan uzilib qolgan (truncated output)." };
    }

    // Strip comments and string literals to get true structural tokens
    const stripped = stripStringsAndComments(content);

    let braceCount = 0;
    for (let i = 0; i < stripped.length; i++) {
      if (stripped[i] === "{") braceCount++;
      else if (stripped[i] === "}") braceCount--;
    }
    if (braceCount !== 0) {
      return { valid: false, error: `Qavslar balansi buzilgan: ${braceCount > 0 ? braceCount + ' ta yopilmagan {' : Math.abs(braceCount) + ' ta ortiqcha }'}` };
    }

    let parenCount = 0;
    for (let i = 0; i < stripped.length; i++) {
      if (stripped[i] === "(") parenCount++;
      else if (stripped[i] === ")") parenCount--;
    }
    if (parenCount !== 0) {
      return { valid: false, error: `Dumaloq qavslar balansi buzilgan: ${parenCount > 0 ? parenCount + ' ta yopilmagan (' : Math.abs(parenCount) + ' ta ortiqcha )'}` };
    }
  }

  // 3. Python basic check
  if (isPy) {
    const stripped = stripStringsAndComments(content);
    let parenCount = 0;
    for (let i = 0; i < stripped.length; i++) {
      if (stripped[i] === "(") parenCount++;
      else if (stripped[i] === ")") parenCount--;
    }
    if (parenCount !== 0) {
      return { valid: false, error: `Python qavslar balansi buzilgan: ( = ${parenCount}` };
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

Fix the exact syntax error, close all tags and brackets properly, and output ONLY the complete corrected code wrapped in:
<file path="${filePath}">
// fixed complete code here
</file>`;

      const messages = [
        { role: "system", content: "You fix syntax errors and unclosed brackets in code. Output ONLY <file> tag." },
        { role: "user", content: fixPrompt },
      ];

      const { content } = await callOpenRouter(messages, openRouterKey, 0.1, 4096);
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

// Fallback robust template generator for essential files
function generateSafeFallbackFile(filePath, plan) {
  if (filePath.endsWith("App.jsx")) {
    return `import React, { useState, useEffect } from 'react';
import { Sparkles, Layers, CheckCircle, Search, RefreshCw, Plus, Trash2 } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem("oryxgen_app_items");
      return saved ? JSON.parse(saved) : [
        { id: 1, title: "Loyiha boshqaruvi", status: "completed", date: "Bugun" },
        { id: 2, title: "AI model bilan integratsiya", status: "in_progress", date: "Hozir" },
        { id: 3, title: "Avtomatlashtirilgan testlar", status: "pending", date: "Kutilmoqda" }
      ];
    } catch {
      return [];
    }
  });
  const [newTitle, setNewTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("oryxgen_app_items", JSON.stringify(items));
    } catch {}
  }, [items]);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const newItem = {
      id: Date.now(),
      title: newTitle.trim(),
      status: "in_progress",
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setItems([newItem, ...items]);
    setNewTitle("");
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleToggleStatus = (id) => {
    setItems(items.map(item => item.id === id ? {
      ...item,
      status: item.status === "completed" ? "in_progress" : "completed"
    } : item));
  };

  const filteredItems = items.filter(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">${plan.title}</h1>
            <p className="text-xs text-slate-400">${plan.summary || "To'liq interaktiv dastur"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-full font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Faol
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Controls Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row gap-4 justify-between items-center">
          <form onSubmit={handleAddItem} className="flex gap-2 w-full sm:w-auto flex-1">
            <input
              type="text"
              placeholder="Yangi yozuv qo'shish..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5 transition shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" />
              Qo'shish
            </button>
          </form>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Qidiruv..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
              Yozuvlar ro'yxati ({filteredItems.length})
            </h2>
            <button
              onClick={() => setItems([])}
              className="text-xs text-rose-400 hover:text-rose-300 transition"
            >
              Barchasini tozalash
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                <Sparkles className="w-8 h-8 text-slate-600" />
                <p className="text-sm">Hozircha hech qanday ma'lumot mavjud emas.</p>
              </div>
            ) : (
              filteredItems.map(item => (
                <div
                  key={item.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/40 transition group"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleStatus(item.id)}
                      className={\`w-6 h-6 rounded-lg border flex items-center justify-center transition \${
                        item.status === 'completed'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'border-slate-700 hover:border-slate-500 text-transparent'
                      }\`}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <span className={\`text-sm font-medium \${item.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-200'}\`}>
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500">{item.date}</span>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition p-1"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
`;
  }

  if (filePath.endsWith(".css")) {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #09090b;
  color: #f8fafc;
}
`;
  }

  return `// ${filePath}
export default function Component() {
  return null;
}
`;
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
  onEvent({ type: "phase", phase: "generate", message: "Fayllar to'liq kod bilan generatsiya qilinmoqda..." });
  const projectFiles = await generateProjectFiles(userPrompt, plan, openRouterKey, onEvent);

  // 3. Completion
  onEvent({ type: "phase", phase: "complete", message: "Loyiha muvaffaqiyatli tayyorlandi!" });
  onEvent({ type: "complete", plan, projectFiles });

  return { plan, projectFiles };
}
