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
// PHASE A: PLAN GENERATOR
// -------------------------------------------------------------
export async function generateProjectPlan(userPrompt, openRouterKey) {
  const matchedTemplate = findMatchingTemplate(userPrompt);

  const plannerSystemPrompt = `You are the CodeX Project Architect.
Analyze the user's software request and return ONLY a strict JSON object defining the complete project structure.
Do NOT output any markdown, text or explanation outside the JSON object.

Template Reference:
Stack: ${matchedTemplate.stack}
Summary: ${matchedTemplate.summary}
Example files: ${JSON.stringify(matchedTemplate.recommendedFiles)}
Example dependencies: ${JSON.stringify(matchedTemplate.dependencies)}

JSON Schema Requirements:
{
  "projectType": "frontend" | "fullstack" | "backend" | "bot" | "script",
  "stack": "react-vite-tailwind" | "node-express" | "python-flask" | "python-telegram-bot" | "vanilla-html-css-js",
  "title": "Short descriptive title (in Uzbek)",
  "summary": "1-2 sentence summary of what is built (in Uzbek)",
  "dependencies": ["dependency1", "dependency2"],
  "runCommand": "npm run dev" | "python bot.py" | "node server.js",
  "files": [
    { "path": "src/App.jsx", "purpose": "Main React shell" },
    { "path": "src/components/TaskList.jsx", "purpose": "Component purpose" }
  ]
}

Keep file count between 2 and 6 files for optimal completeness and zero truncation.
Every local import between files must be planned and consistent.`;

  const messages = [
    { role: "system", content: plannerSystemPrompt },
    { role: "user", content: `User Prompt: ${userPrompt}\nCreate the project plan JSON:` },
  ];

  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { content } = await callOpenRouter(messages, openRouterKey, 0.1);
      
      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const plan = JSON.parse(jsonStr);
      if (!plan.files || !Array.isArray(plan.files) || plan.files.length === 0) {
        throw new Error("Files list is empty");
      }
      return plan;
    } catch (err) {
      lastErr = err;
      // continue to retry
    }
  }

  // Fallback structured plan based on matched template if all attempts fail
  return {
    isFallbackTemplate: true,
    projectType: matchedTemplate.projectType,
    stack: matchedTemplate.stack,
    title: userPrompt.slice(0, 30) + "...",
    summary: `${matchedTemplate.summary} loyihasi tayyorlanmoqda (Avtomatik qolip orqali).`,
    dependencies: matchedTemplate.dependencies,
    runCommand: matchedTemplate.projectType === "frontend" ? "npm run dev" : matchedTemplate.projectType === "bot" ? "python bot.py" : "npm start",
    files: matchedTemplate.recommendedFiles,
  };
}

// -------------------------------------------------------------
// PHASE B: FILE GENERATION
// -------------------------------------------------------------
export async function generateProjectFiles(userPrompt, plan, openRouterKey, onFileEvent = null) {
  const projectFiles = {};
  const allFilePaths = plan.files.map((f) => f.path);

  // Group files in batches of 2-3 to avoid token limit and maintain cross-file context
  const batches = [];
  for (let i = 0; i < plan.files.length; i += 2) {
    batches.push(plan.files.slice(i, i + 2));
  }

  for (const batch of batches) {
    const batchTargetFiles = batch.map((f) => f.path).join(", ");
    
    if (onFileEvent) {
      batch.forEach((f) => onFileEvent({ type: "file_start", path: f.path, purpose: f.purpose }));
    }

    const generatorSystemPrompt = `You are CodeX, a Principal Software Engineer.
Project Stack: ${plan.stack} (${plan.projectType})
Project Title: ${plan.title}
Planned Files in this Project: ${JSON.stringify(allFilePaths)}
Target Files to write NOW: ${JSON.stringify(batch)}

CRITICAL PROTOCOL:
Output the full, production-ready, clean code for each target file wrapped strictly in:
<file path="exact/file/path.ext">
// complete code here
</file>

Rules:
1. Write 100% complete, working code. Never use placeholders like "// implement here" or "// TODO".
2. If React: write modern React components with Tailwind CSS classes, inline SVG icons or Lucide icons, full state handling.
3. If Python/Telegram: write complete bot handlers, config reading, and error catching.
4. For cross-file imports: ensure import paths match planned files exactly (e.g. import Header from './components/Header';).
5. Output ONLY <file> tags. No conversational markdown outside the tags.`;

    const messages = [
      { role: "system", content: generatorSystemPrompt },
      { role: "user", content: `User Prompt: ${userPrompt}\nGenerate files: ${batchTargetFiles}` },
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
export async function executeCodexPipeline(userPrompt, openRouterKey, onEvent = () => {}) {
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
