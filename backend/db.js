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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO otps (target, code, expires_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [target, code, expiresAt]
      );
      return;
    } catch {
      // fallback to in-memory
    }
  }
  inMemory.otps.set(target, { code, expiresAt });
}

export async function verifyOtp(target, code) {
  if (pool) {
    try {
      const res = await pool.query(
        "SELECT * FROM otps WHERE target = $1 AND code = $2 AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
        [target, code]
      );
      if (res.rows.length > 0) {
        await pool.query("DELETE FROM otps WHERE target = $1", [target]);
        return true;
      }
      return false;
    } catch {
      // fallback
    }
  }

  const found = inMemory.otps.get(target);
  if (found && found.code === code && found.expiresAt > new Date()) {
    inMemory.otps.delete(target);
    return true;
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

export async function getUserChats(userId) {
  if (pool && userId) {
    try {
      const res = await pool.query(
        "SELECT * FROM chats WHERE user_id = $1 ORDER BY updated_at DESC",
        [userId]
      );
      return res.rows;
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
        `INSERT INTO chats (id, user_id, title, model, updated_at) 
         VALUES ($1, $2, $3, $4, NOW()) 
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, model = EXCLUDED.model, updated_at = NOW()`,
        [chat.id, chat.user_id, chat.title, chat.model]
      );
      return;
    } catch {
      // fallback
    }
  }
  const idx = inMemory.chats.findIndex((c) => c.id === chat.id);
  if (idx >= 0) {
    inMemory.chats[idx] = { ...inMemory.chats[idx], ...chat, updated_at: new Date() };
  } else {
    inMemory.chats.push({ ...chat, created_at: new Date(), updated_at: new Date() });
  }
}
