# ⚡ ORYXGEN AI CLI

> **Official Command-Line Interface for Oryxgen AI**
> 200+ Frontier Models · 250+ Autonomous Agents & Skills · Neural CodeX Engine

```
  ██████╗ ██████╗ ██╗   ██╗██╗  ██╗ ██████╗ ███████╗███╗   ██╗     █████╗ ██╗
  ██╔═══██╗██╔══██╗╚██╗ ██╔╝╚██╗██╔╝██╔════╝ ██╔════╝████╗  ██║    ██╔══██╗██║
  ██║   ██║██████╔╝ ╚████╔╝  ╚███╔╝ ██║  ███╗█████╗  ██╔██╗ ██║    ███████║██║
  ██║   ██║██╔══██╗  ╚██╔╝   ██╔██╗ ██║   ██║██╔══╝  ██║╚██╗██║    ██╔══██║██║
  ╚██████╔╝██║  ██║   ██║   ██╔╝ ██╗╚██████╔╝███████╗██║ ╚████║    ██║  ██║██║
   ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝
```

---

## 🚀 O'rnatish (Installation)

### 1. Global O'rnatish (Tavsiya etiladi):
```bash
npm install -g oryxgen-cli
```

### 2. O'rnatmasdan to'g'ridan-to'g'ri ishlatish (NPX):
```bash
npx oryxgen-cli
```

---

## 🔑 Autentifikatsiya (Authentication)

1. [https://avg-ai-creator.site](https://avg-ai-creator.site) saytiga kiring.
2. Yuqori paneldagi **`API Platformasi`** bo'limini oching.
3. Yangi API kalit (`oryx_live_...`) yarating va nusxalang.
4. Terminalda quyidagi buyruqni bajaring:

```bash
oryxgen auth oryx_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Ulanish holatini tekshirish:
```bash
oryxgen status
```

---

## ⚡ Asosiy Buyruqlar (Commands)

### 1. Jonli AI Chat (Streaming Terminal Chat)
```bash
# Standart model (GPT-6 Astra) bilan suhbat:
oryxgen chat

# Istalgan modelni tanlab suhbat:
oryxgen chat --model claude-4.6-opus
oryxgen chat --model deepseek-r2-turbo
```

### 2. CodeX Engine — Avtonom Loyiha Generatsiyasi
Loyihani rejalashtirish, to'liq fayllarni yaratish va joriy papkaga saqlash:
```bash
oryxgen code "Next.js 15, Prisma va Tailwind bilan to'liq E-Commerce platformasi yarat"
```

### 3. 200+ Modellarni Ko'rish va Qidirish
```bash
# Barcha modellarni ko'rish:
oryxgen models

# Qidiruv orqali filtr:
oryxgen models claude
oryxgen models reasoning
```

### 4. 250+ Avtonom Agentlar va Ko'nikmalar
```bash
# Barcha agentlar katalogini ko'rish:
oryxgen agents
```

---

## ⚠️ Muhim Eslatma / Warning

> **Eslatma:** Agar modellar kod yozishda xatolik qilsa yoki rasmiy modeldagidek javob bermasa, bu proxy providerlarining kesh va xotira yuklanishi bilan bog'liq bo'lishi mumkin. Oryxgen AI adaptiv failover tizimi orqali eng barqaror marshrutni tanlaydi.
