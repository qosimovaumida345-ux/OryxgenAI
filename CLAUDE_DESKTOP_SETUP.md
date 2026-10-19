# 🤖 Claude Desktop & Claude Account Integration Guide

Ushbu qo'llanma orqali ustozingiz Oryxgen AI platformasidagi barcha modellarni va kompyuter vositalarini o'zlarining **Claude Desktop** yoki **Claude.ai** akkauntlariga ulashlari mumkin.

---

## 1. Claude Desktop (Kompyuterdagi ilova) ga ulash

1. Kompyuteringizda Claude Desktop sozlamalar faylini oching:
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
     (Yo'l: `C:\Users\<username>\AppData\Roaming\Claude\claude_desktop_config.json`)
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

2. Ushbu fayl ichiga quyidagi konfiguratsiyani nusxalab qo'ying:

```json
{
  "mcpServers": {
    "oryxgen-ai": {
      "command": "node",
      "args": [
        "C:\\Users\\user\\Desktop\\OrygenAI\\cli\\bin\\oryxgen.js",
        "--mcp"
      ],
      "env": {
        "ORYXGEN_BASE_URL": "https://oryxgen-api.onrender.com/v1",
        "ORYXGEN_API_KEY": "oryx_live_demo_free_access"
      }
    }
  }
}
```

3. Claude Desktop ilovasini qaytadan ishga tushiring (Restart).
4. Endi Claude o'ng pastki qismida bolg'a (Hammer 🔨) belgisi paydo bo'ladi va quyidagi vositalar mavjud bo'ladi:
   - `oryxgen_chat`: Barcha 80+ modellarga so'rov yuborish
   - `oryxgen_run_command`: Kompyuterda PowerShell/CMD buyruqlarini bajarish
   - `oryxgen_read_file`: Kompyuterdagi fayllarni o'qish
   - `oryxgen_write_file`: Yangi fayllarni yaratish va yozish
   - `oryxgen_list_directory`: Papkalarni ko'rish

---

## 2. Claude.ai (Veb-sayt) dagi Custom MCP Connector orqali ulash

1. [Claude.ai](https://claude.ai) ga kiring va **Settings -> Integrations** bo'limiga o'ting.
2. **"Add custom connector"** tugmasini bosing.
3. Connector URL manziliga quyidagini kiriting:
   ```
   https://oryxgen-api.onrender.com/api/mcp
   ```
4. **Connect** tugmasini bosing. Oryxgen AI OAuth tizimi orqali avtomatik ulanadi!

---

## 3. Claude Code CLI orqali to'g'ridan-to'g'ri ulash

Claude Code terminalida Oryxgen AI modellarini ishlatish uchun:
```bash
# Terminalda:
export ANTHROPIC_BASE_URL="https://oryxgen-api.onrender.com"
export ANTHROPIC_API_KEY="oryx_live_demo_free_access"

# Windows PowerShell:
$env:ANTHROPIC_BASE_URL = "https://oryxgen-api.onrender.com"
$env:ANTHROPIC_API_KEY = "oryx_live_demo_free_access"
```
Endi har qanday Claude so'rovi to'g'ridan-to'g'ri Oryxgen AI orqali ishlaydi!
