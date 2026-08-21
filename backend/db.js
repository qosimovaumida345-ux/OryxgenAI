import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export const pool = connectionString
  ? new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  })
  : null;

// In-memory fallback if no PostgreSQL DB is connected yet
const inMemory = {
  users: [],
  otps: new Map(),
  chats: [],
  messages: [],
};

export async function initDb() {
  if (!pool) {
    console.log("ℹ️  Running in-memory database (set DATABASE_URL on Render to enable PostgreSQL)");
    return;
  }

  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL database!");

    // Create tables if not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        avatar VARCHAR(500),
        auth_provider VARCHAR(50) DEFAULT 'email',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        target VARCHAR(255) NOT NULL,
        code VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS chats (
        id VARCHAR(100) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        model VARCHAR(100) NOT NULL,
        mode VARCHAR(50) DEFAULT 'chat',
        system_prompt TEXT,
        skill_id VARCHAR(100) DEFAULT 'default',
        project_files JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Try adding new columns if they don't exist (for existing DBs)
      BEGIN
        ALTER TABLE chats ADD COLUMN mode VARCHAR(50) DEFAULT 'chat';
        ALTER TABLE chats ADD COLUMN system_prompt TEXT;
        ALTER TABLE chats ADD COLUMN skill_id VARCHAR(100) DEFAULT 'default';
        ALTER TABLE chats ADD COLUMN project_files JSONB DEFAULT '{}'::jsonb;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END;

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id VARCHAR(100) REFERENCES chats(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        thinking TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    client.release();
    console.log("PostgreSQL schema tables verified successfully");
  } catch (err) {
    console.warn("⚠️ PostgreSQL connection failed, continuing with in-memory storage:", err.message);
  }
}

export async function saveOtp(target, code) {
  const cleanTarget = String(target || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes window
  if (pool) {
    try {
      await pool.query("DELETE FROM otps WHERE LOWER(TRIM(target)) = $1", [cleanTarget]);
      await pool.query(
        "INSERT INTO otps (target, code, expires_at) VALUES ($1, $2, $3)",
        [cleanTarget, cleanCode, expiresAt]
      );
    } catch (err) {
      console.warn("DB OTP save error:", err.message);
    }
  }
  inMemory.otps.set(cleanTarget, { code: cleanCode, expiresAt });
}

export async function verifyOtp(target, code) {
  const cleanTarget = String(target || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();

  if (pool) {
    try {
      const res = await pool.query(
        "SELECT * FROM otps WHERE LOWER(TRIM(target)) = $1 AND TRIM(code) = $2 ORDER BY id DESC LIMIT 1",
        [cleanTarget, cleanCode]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        const expiryTime = new Date(row.expires_at).getTime();
        // Allow valid or small clock drift buffer
        if (isNaN(expiryTime) || expiryTime > Date.now() - 120000) {
          await pool.query("DELETE FROM otps WHERE LOWER(TRIM(target)) = $1", [cleanTarget]);
          inMemory.otps.delete(cleanTarget);
          return true;
        }
      }
    } catch (err) {
      console.warn("DB OTP verify query error:", err.message);
    }
  }

  const found = inMemory.otps.get(cleanTarget);
  if (found && String(found.code).trim() === cleanCode) {
    const expiryTime = new Date(found.expiresAt).getTime();
    if (isNaN(expiryTime) || expiryTime > Date.now() - 120000) {
      inMemory.otps.delete(cleanTarget);
      return true;
    }
  }
  return false;
}

export async function findOrCreateUser({ email, phone, name, avatar, authProvider }) {
  if (pool) {
    try {
      const field = email ? "email" : "phone";
      const val = email || phone;
      const res = await pool.query(`SELECT * FROM users WHERE ${field} = $1`, [val]);
      if (res.rows.length > 0) {
        return res.rows[0];
      }

      const insert = await pool.query(
        "INSERT INTO users (email, phone, name, avatar, auth_provider) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [email || null, phone || null, name || (email ? email.split("@")[0] : phone), avatar || "", authProvider || "email"]
      );
      return insert.rows[0];
    } catch (err) {
      console.warn("DB user find/create error, using in-memory:", err.message);
    }
  }

  let user = inMemory.users.find((u) => (email && u.email === email) || (phone && u.phone === phone));
  if (!user) {
    user = {
      id: inMemory.users.length + 1,
      email: email || null,
      phone: phone || null,
      name: name || (email ? email.split("@")[0] : phone),
      avatar: avatar || "",
      auth_provider: authProvider || "email",
      created_at: new Date(),
    };
    inMemory.users.push(user);
  }
  return user;
}

export async function findUserById(id) {
  if (pool) {
    try {
      const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (err) {
      console.warn("DB user lookup error, checking in-memory:", err.message);
    }
  }
  return inMemory.users.find((u) => u.id === id) || null;
}

export async function getUserChats(userId) {
  if (pool && userId) {
    try {
      const res = await pool.query(
        "SELECT id, user_id, title, model, mode, system_prompt, skill_id, project_files, updated_at FROM chats WHERE user_id = $1 ORDER BY updated_at DESC",
        [userId]
      );
      const chats = res.rows;
      for (const c of chats) {
        const msgRes = await pool.query(
          "SELECT id, role, content, thinking, created_at FROM messages WHERE chat_id = $1 ORDER BY id ASC",
          [c.id]
        );
        c.messages = msgRes.rows || [];
      }
      return chats;
    } catch {
      // fallback
    }
  }
  return inMemory.chats.filter((c) => c.user_id === userId);
}

export async function saveUserChat(chat) {
  if (pool && chat.user_id) {
    try {
      await pool.query(
        `INSERT INTO chats (id, user_id, title, model, mode, system_prompt, skill_id, project_files, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
         ON CONFLICT (id) DO UPDATE SET 
           title = EXCLUDED.title, 
           model = EXCLUDED.model, 
           mode = EXCLUDED.mode,
           system_prompt = EXCLUDED.system_prompt,
           skill_id = EXCLUDED.skill_id,
           project_files = EXCLUDED.project_files,
           updated_at = NOW()`,
        [
          chat.id,
          chat.user_id,
          chat.title,
          chat.model,
          chat.mode || "chat",
          chat.system_prompt || null,
          chat.skill_id || "default",
          chat.project_files ? JSON.stringify(chat.project_files) : "{}"
        ]
      );
      if (Array.isArray(chat.messages) && chat.messages.length > 0) {
        await pool.query("DELETE FROM messages WHERE chat_id = $1", [chat.id]);
        for (const msg of chat.messages) {
          await pool.query(
            "INSERT INTO messages (chat_id, role, content, thinking) VALUES ($1, $2, $3, $4)",
            [chat.id, msg.role, msg.content, msg.thinking || null]
          );
        }
      }
      return;
    } catch (err) {
      console.warn("DB save chat error:", err.message);
    }
  }
  const idx = inMemory.chats.findIndex((c) => c.id === chat.id);
  if (idx >= 0) {
    inMemory.chats[idx] = { ...inMemory.chats[idx], ...chat, updated_at: new Date() };
  } else {
    inMemory.chats.push({ ...chat, created_at: new Date(), updated_at: new Date() });
  }
}

export async function deleteUserChat(chatId, userId) {
  if (pool && userId) {
    try {
      await pool.query("DELETE FROM chats WHERE id = $1 AND user_id = $2", [chatId, userId]);
      return;
    } catch (err) {
      console.warn("DB delete chat error:", err.message);
    }
  }
  const idx = inMemory.chats.findIndex((c) => c.id === chatId && (!userId || c.user_id === userId));
  if (idx >= 0) inMemory.chats.splice(idx, 1);
}