import { Link } from "react-router-dom";
import "./Legal.css";

export default function Privacy() {
  return (
    <div className="legal-page-container">
      <div className="legal-header-nav">
        <Link to="/" className="legal-brand-badge">
          <img src="./Logo.png" alt="Oryxgen AI Logo" />
          <span>Oryxgen AI</span>
        </Link>
        <Link to="/" className="legal-back-btn">
          ← Bosh sahifaga qaytish
        </Link>
      </div>

      <div className="legal-card">
        <div className="legal-title-section">
          <span className="legal-badge">Rasmiy Hujjat</span>
          <h1>Maxfiylik Siyosati (Privacy Policy)</h1>
          <div className="legal-date">So'nggi yangilanish: 2026-yil 26-avgust</div>
        </div>

        <div className="legal-content">
          <p>
            <strong>Oryxgen AI</strong> (veb-sayt: <strong>https://avg-ai-creator.site</strong>) foydalanuvchilarining maxfiyligini qadrlaydi va himoya qiladi. Ushbu Maxfiylik siyosati biz qanday ma'lumotlarni to'plashimiz, ulardan qanday foydalanishimiz va sizning huquqlaringizni tushuntiradi.
          </p>

          <h2>1. To'planadigan Ma'lumotlar</h2>
          <p>Biz xizmatlarimizni taqdim etish va takomillashtirish maqsadida quyidagi ma'lumotlarni to'plashimiz mumkin:</p>
          <ul>
            <li>
              <strong>Google Hisobi orqali kirish (Google OAuth):</strong> Google orqali tizimga kirganingizda, Google profilingizdagi asosiy ma'lumotlar — ismingiz, elektron pochta manzilingiz (email) va profil rasmingiz (avatar URL). Biz sizning parolingizni yoki boshqa shaxsiy ma'lumotlaringizni olmaymiz.
            </li>
            <li>
              <strong>Elektron Pochta (Email OTP):</strong> Email orqali ro'yxatdan o'tganingizda faqat tasdiqlash kodi yuborish uchun emailingiz to'planadi.
            </li>
            <li>
              <strong>Foydalanish Ma'lumotlari:</strong> Siz yaratgan chatlar, tanlangan AI modellari va tizim sozlamalari (masalan, shaxsiy tizim ko'rsatmalari / System Prompts).
            </li>
          </ul>

          <h2>2. Ma'lumotlardan Foydalanish Maqsadlari</h2>
          <p>To'plangan ma'lumotlar faqat quyidagi maqsadlarda ishlatiladi:</p>
          <ul>
            <li>Foydalanuvchi hisobini yaratish, autentifikatsiya qilish va xavfsizligini ta'minlash;</li>
            <li>Tanlangan 200+ AI modellari (Claude, GPT, DeepSeek, Gemini va h.k.) bilan chat va CodeX ilovalarini yaratish;</li>
            <li>Model Context Protocol (MCP) server orqali xavfsiz ulanishni ta'minlash;</li>
            <li>Foydalanuvchi tajribasini yaxshilash va texnik nosozliklarni bartaraf etish.</li>
          </ul>

          <h2>3. Ma'lumotlarni Uchinchi Tomonlarga Berish</h2>
          <p>
            Biz sizning shaxsiy ma'lumotlaringizni (ism, email, profil rasmi) hech qachon uchinchi shaxslarga sotmaymiz yoki reklama maqsadlarida bermaymiz.
          </p>
          <p>
            AI modellariga yuborilgan so'rovlar (prompts) faqat foydalanuvchiga javob qaytarish uchun tegishli xavfsiz API shlyuzlari (masalan, OpenRouter, rasmiy provayderlar) orqali qayta ishlanadi.
          </p>

          <h2>4. Google Foydalanuvchi Ma'lumotlari Siyosati (Google API Disclosure)</h2>
          <p>
            Oryxgen AI Google API orqali olingan ma'lumotlardan foydalanishda 
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#818cf8", marginLeft: "4px" }}>
              Google API Xizmatlari Foydalanuvchi Ma'lumotlari Siyosatiga (Google API Services User Data Policy)
            </a>, jumladan Cheklangan Foydalanish (Limited Use) talablariga to'liq amal qiladi.
          </p>

          <h2>5. Ma'lumotlar Xavfsizligi va Saqlanishi</h2>
          <p>
            Sizning ma'lumotlaringiz sanoat standartidagi shifrlash (HTTPS/TLS, JWT xavfsiz tokenlari) orqali himoyalanadi. Shaxsiy seanslar xavfsiz tarzda saqlanadi.
          </p>

          <h2>6. Foydalanuvchining Huquqlari</h2>
          <p>Siz istalgan vaqtda:</p>
          <ul>
            <li>Hisobingiz ma'lumotlarini ko'rish yoki yangilash;</li>
            <li>Chatlaringiz tarixini tozalash yoki o'chirish;</li>
            <li>Hisobingizni butunlay o'chirishni talab qilish huquqiga egasiz.</li>
          </ul>

          <h2>7. Bog'lanish</h2>
          <p>
            Maxfiylik siyosati bo'yicha har qanday savollar yoki hisobingizni o'chirish bo'yicha murojaatlar uchun biz bilan bog'lanishingiz mumkin:
          </p>
          <p>
            <strong>Veb-sayt:</strong> https://avg-ai-creator.site<br />
            <strong>Platforma:</strong> Oryxgen AI Support
          </p>
        </div>

        <div className="legal-footer-links">
          <span>© 2026 Oryxgen AI. Barcha huquqlar himoyalangan.</span>
          <div>
            <Link to="/privacy">Maxfiylik siyosati</Link>
            <Link to="/terms">Foydalanish shartlari</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
