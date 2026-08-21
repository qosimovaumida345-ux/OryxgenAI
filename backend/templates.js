// Starter template reference library for CodeX Phase-A Planner
// Provides architectural context, dependencies, and file layout guidelines for common project types

export const STARTER_TEMPLATES = [
  {
    id: "telegram-bot-python",
    keywords: ["telegram", "bot", "aiogram", "python-telegram-bot", "tg", "telebot"],
    projectType: "bot",
    stack: "python-telegram-bot",
    summary: "Telegram Bot (Python)",
    recommendedFiles: [
      { path: "bot.py", purpose: "Asosiy bot logikasi, komandalar va handlerlar" },
      { path: "config.py", purpose: "Konfiguratsiya va environment o'zgaruvchilari" },
      { path: "requirements.txt", purpose: "Kerakli Python kutubxonalari" },
      { path: "README.md", purpose: "Botni ishga tushirish va BOT_TOKEN sozlash qo'llanmasi" },
    ],
    dependencies: ["python-telegram-bot>=20.0", "python-dotenv", "requests"],
    starterSnippet: `
# bot.py
import logging, os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes

logging.basicConfig(level=logging.INFO)
BOT_TOKEN = os.getenv("BOT_TOKEN", "YOUR_BOT_TOKEN_HERE")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [[InlineKeyboardButton("Yordam", callback_data="help")]]
    await update.message.reply_text("Salom! Bot muvaffaqiyatli ishga tushdi.", reply_markup=InlineKeyboardMarkup(keyboard))

if __name__ == '__main__':
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.run_polling()
`
  },
  {
    id: "express-rest-api",
    keywords: ["api", "backend", "express", "node", "rest", "crud", "server"],
    projectType: "backend",
    stack: "node-express",
    summary: "REST API Server (Node.js & Express)",
    recommendedFiles: [
      { path: "server.js", purpose: "Express server va middleware sozlamalari" },
      { path: "routes/api.js", purpose: "Asosiy CRUD endpointlar" },
      { path: "package.json", purpose: "Node.js dependencies va npm start script" },
      { path: "README.md", purpose: "API hujjatlari va ishga tushirish qo'llanmasi" },
    ],
    dependencies: ["express", "cors", "dotenv"],
    starterSnippet: `
// server.js
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true, timestamp: new Date() }));
app.listen(3000, () => console.log("Server running on port 3000"));
`
  },
  {
    id: "react-tailwind-app",
    keywords: ["react", "frontend", "web", "tailwind", "ui", "dastur", "sayt", "app", "kalkulyator", "dashboard", "oyin", "game"],
    projectType: "frontend",
    stack: "react-vite-tailwind",
    summary: "Modern Web App (React + Tailwind CSS)",
    recommendedFiles: [
      { path: "src/App.jsx", purpose: "Asosiy React interfeysi va boshqaruv logikasi" },
      { path: "src/index.css", purpose: "Tailwind va maxsus animatsiyalar stillari" },
      { path: "src/components/Header.jsx", purpose: "Yuqori navigatsiya paneli" },
      { path: "package.json", purpose: "React va Tailwind bog'liqliklari" },
    ],
    dependencies: ["react", "react-dom", "lucide-react", "tailwindcss"],
    starterSnippet: `
// src/App.jsx
import React, { useState } from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
        Oryxgen CodeX App
      </h1>
    </div>
  );
}
`
  },
  {
    id: "python-flask-app",
    keywords: ["flask", "fastapi", "python web", "python backend"],
    projectType: "backend",
    stack: "python-flask",
    summary: "Python Web / API Service (Flask)",
    recommendedFiles: [
      { path: "app.py", purpose: "Asosiy Flask ilovasi va marshrutlar" },
      { path: "requirements.txt", purpose: "Flask va kerakli kutubxonalar" },
      { path: "README.md", purpose: "Ishga tushirish qo'llanmasi" },
    ],
    dependencies: ["flask", "flask-cors", "python-dotenv"],
    starterSnippet: `
# app.py
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/api/status')
def status():
    return jsonify({"status": "active", "service": "Flask API"})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
`
  },
  {
    id: "nextjs-tailwind-app",
    keywords: ["nextjs", "next", "ssr", "seo", "react server"],
    projectType: "fullstack",
    stack: "nextjs-react-tailwind",
    summary: "Fullstack App (Next.js App Router)",
    recommendedFiles: [
      { path: "app/page.tsx", purpose: "Asosiy bosh sahifa" },
      { path: "app/layout.tsx", purpose: "Global layout va HTML qobig'i" },
      { path: "app/globals.css", purpose: "Global Tailwind stillari" },
      { path: "package.json", purpose: "Next.js va Tailwind bog'liqliklari" },
    ],
    dependencies: ["next", "react", "react-dom", "tailwindcss"],
    starterSnippet: ""
  },
  {
    id: "vue-tailwind-app",
    keywords: ["vue", "vuejs", "vue3", "vite vue"],
    projectType: "frontend",
    stack: "vue3-vite-tailwind",
    summary: "Frontend App (Vue 3 + Vite)",
    recommendedFiles: [
      { path: "src/App.vue", purpose: "Asosiy Vue komponenti" },
      { path: "src/main.js", purpose: "Vue app initsializatsiyasi" },
      { path: "src/style.css", purpose: "Tailwind css" },
      { path: "index.html", purpose: "Vite HTML entry" },
    ],
    dependencies: ["vue", "tailwindcss"],
    starterSnippet: ""
  },
  {
    id: "svelte-app",
    keywords: ["svelte", "sveltekit"],
    projectType: "frontend",
    stack: "svelte-vite",
    summary: "Frontend App (Svelte)",
    recommendedFiles: [
      { path: "src/App.svelte", purpose: "Asosiy Svelte komponenti" },
      { path: "src/main.js", purpose: "Svelte initsializatsiyasi" },
      { path: "index.html", purpose: "Vite HTML entry" },
    ],
    dependencies: ["svelte"],
    starterSnippet: ""
  },
  {
    id: "python-data-script",
    keywords: ["script", "data", "pandas", "numpy", "scraper", "automation"],
    projectType: "script",
    stack: "python-script",
    summary: "Python Automation/Data Script",
    recommendedFiles: [
      { path: "main.py", purpose: "Asosiy skript mantiqi" },
      { path: "requirements.txt", purpose: "Kutubxonalar ro'yxati" },
    ],
    dependencies: ["requests", "pandas"],
    starterSnippet: ""
  }
];

export function findMatchingTemplate(prompt = "") {
  const clean = prompt.toLowerCase();
  for (const tpl of STARTER_TEMPLATES) {
    if (tpl.keywords.some((k) => clean.includes(k))) {
      return tpl;
    }
  }
  return STARTER_TEMPLATES.find((t) => t.id === "react-tailwind-app");
}
