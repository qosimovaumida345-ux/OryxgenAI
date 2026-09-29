import { Link } from "react-router-dom";
import "./Legal.css";

export default function Terms() {
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
          <span className="legal-badge">Rasmiy Qoidalar</span>
          <h1>Foydalanish Shartlari (Terms of Service)</h1>
          <div className="legal-date">So'nggi yangilanish: 2026-yil 26-avgust</div>
        </div>

        <div className="legal-content">
          <p>
            <strong>Oryxgen AI</strong> (<strong>https://avg-ai-creator.site</strong>) platformasidan foydalanish orqali siz quyidagi Foydalanish shartlariga to'liq rozilik bildirasiz. Agar siz ushbu shartlarga rozi bo'lmasangiz, platformadan foydalanmaslikni so'raymiz.
          </p>

          <h2>1. Xizmat Tavsifi</h2>
          <p>
            Oryxgen AI — bu 200+ ilg'or sun'iy intellekt (AI) modellariga kirish, chat muloqoti, CodeX avtonom ilovalar yaratish, tasvir generatsiyasi va Model Context Protocol (MCP) server integratsiyasini taqdim etuvchi ko'p tarmoqli AI platformasidir.
          </p>

          <h2>2. Foydalanuvchi Hisobi va Xavfsizlik</h2>
          <ul>
            <li>Tizimdan foydalanish uchun Google OAuth yoki Email OTP orqali hisob yaratilishi mumkin;</li>
            <li>Foydalanuvchi o'z hisobining xavfsizligi va undan amalga oshirilgan barcha harakatlar uchun shaxsan javobgardir;</li>
            <li>MCP server ulanish kalitlari va tokenlarini uchinchi shaxslarga bermaslik tavsiya etiladi.</li>
          </ul>

          <h2>3. Qabul Qilinishi Mumkin Bo'lmagan Harakatlar</h2>
          <p>Foydalanuvchilarga quyidagi harakatlar qat'iyan taqiqlanadi:</p>
          <ul>
            <li>Platformaning xavfsizlik tizimlarini buzish, ruxsatsiz kirishga urinish yoki infratuzilmaga zarar yetkazish;</li>
            <li>Noqonuniy, zararli, pornografik, zo'ravonlikni targ'ib qiluvchi yoki uchinchi shaxslarning huquqlarini buzuvchi kontent yaratish;</li>
            <li>Tizim API shlyuzlarini avtomatlashtirilgan zararli botlar orqali ortiqcha yuklash (DDoS).</li>
          </ul>

          <h2>4. AI Generatsiyasi va Javobgarlik</h2>
          <p>
            Platformadagi AI modellarining javoblari sun'iy intellekt algoritmlari asosida shakllanadi. Oryxgen AI ishlab chiquvchilari modellar tomonidan berilgan ma'lumotlarning 100% to'g'riligi, to'liqligi yoki ulardan kelib chiqadigan oqibatlar uchun javobgar emas. Dasturlash va boshqa jiddiy qarorlarda natijalarni mustaqil tekshirib ko'rish tavsiya etiladi.
          </p>

          <h2>5. Intellektual Mulk Huquqlari</h2>
          <p>
            Siz Oryxgen AI yordamida yaratgan kodlar, matnlar va tasvirlarga to'liq egalik qilasiz. Platforma brendi, logotipi va dasturiy ta'minoti Oryxgen AI mulki hisoblanadi.
          </p>

          <h2>6. Shartlarga O'zgartirish Kiritish</h2>
          <p>
            Biz ushbu shartlarni vaqti-vaqti bilan yangilab turish huquqini saqlab qolamiz. O'zgarishlar ushbu sahifada e'lon qilingan paytdan boshlab kuchga kiradi.
          </p>

          <h2>7. Murojaat</h2>
          <p>
            Foydalanish shartlari bo'yicha savollaringiz bo'lsa, rasmiy saytimiz orqali murojaat qilishingiz mumkin:
          </p>
          <p>
            <strong>Veb-sayt:</strong> https://avg-ai-creator.site
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
