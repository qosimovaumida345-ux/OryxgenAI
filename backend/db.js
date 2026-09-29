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
  apiKeys: [],
  usageLogs: [],
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
        default_system_prompt TEXT,
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

      -- Safely add new columns if they don't exist (for existing DBs)
      ALTER TABLE users ADD COLUMN IF NOT EXISTS default_system_prompt TEXT;
      ALTER TABLE chats ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'chat';
      ALTER TABLE chats ADD COLUMN IF NOT EXISTS system_prompt TEXT;
      ALTER TABLE chats ADD COLUMN IF NOT EXISTS skill_id VARCHAR(100) DEFAULT 'default';
      ALTER TABLE chats ADD COLUMN IF NOT EXISTS project_files JSONB DEFAULT '{}'::jsonb;

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id VARCHAR(100) REFERENCES chats(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        thinking TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR(255) NOT NULL UNIQUE,
        key_prefix VARCHAR(32) NOT NULL,
        name VARCHAR(100) DEFAULT 'Default API Key',
        input_tokens BIGINT DEFAULT 0,
        output_tokens BIGINT DEFAULT 0,
        requests_count BIGINT DEFAULT 0,
        last_used_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_usage_logs (
        id SERIAL PRIMARY KEY,
        key_prefix VARCHAR(32) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        model VARCHAR(100) NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        duration_ms INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_installers (
        id VARCHAR(100) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        chunk_index INTEGER NOT NULL,
        total_chunks INTEGER NOT NULL,
        data BYTEA NOT NULL,
        size BIGINT NOT NULL,
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
        // Allow a large buffer (2 hours) to account for DB vs Node timezone differences
        if (isNaN(expiryTime) || expiryTime > Date.now() - 2 * 60 * 60 * 1000) {
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
    if (isNaN(expiryTime) || expiryTime > Date.now() - 2 * 60 * 60 * 1000) {
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
      default_system_prompt: null,
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

export async function updateUserSystemPrompt(id, prompt) {
  if (pool) {
    try {
      await pool.query("UPDATE users SET default_system_prompt = $1 WHERE id = $2", [prompt || null, id]);
      return;
    } catch (err) {
      console.warn("DB user update error, checking in-memory:", err.message);
    }
  }
  const idx = inMemory.users.findIndex((u) => u.id === id);
  if (idx >= 0) {
    inMemory.users[idx].default_system_prompt = prompt || null;
  }
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

// ── API Key Management & Token Usage Analytics ──

export async function saveApiKey({ userId, keyHash, keyPrefix, name = "Default API Key" }) {
  const rowData = {
    user_id: userId,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name,
    input_tokens: 0,
    output_tokens: 0,
    requests_count: 0,
    status: "active",
    created_at: new Date(),
  };

  if (pool) {
    try {
      const res = await pool.query(
        `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, key_prefix, name, input_tokens, output_tokens, requests_count, status, created_at`,
        [userId, keyHash, keyPrefix, name]
      );
      if (res.rows.length) return res.rows[0];
    } catch (err) {
      console.warn("DB saveApiKey error:", err.message);
    }
  }

  const inMemItem = { id: inMemory.apiKeys.length + 1, ...rowData };
  inMemory.apiKeys.push(inMemItem);
  return inMemItem;
}

export async function getUserApiKeys(userId) {
  if (pool && userId) {
    try {
      const res = await pool.query(
        `SELECT id, key_prefix, name, input_tokens, output_tokens, requests_count, last_used_at, status, created_at
         FROM api_keys
         WHERE user_id = $1 AND status != 'revoked'
         ORDER BY id DESC`,
        [userId]
      );
      return res.rows;
    } catch (err) {
      console.warn("DB getUserApiKeys error:", err.message);
    }
  }
  return inMemory.apiKeys.filter((k) => (!userId || k.user_id === userId) && k.status !== "revoked");
}

export async function deleteApiKey(keyId, userId) {
  if (pool && userId) {
    try {
      await pool.query("UPDATE api_keys SET status = 'revoked' WHERE id = $1 AND user_id = $2", [keyId, userId]);
      return true;
    } catch (err) {
      console.warn("DB deleteApiKey error:", err.message);
    }
  }
  const item = inMemory.apiKeys.find((k) => k.id === Number(keyId) && (!userId || k.user_id === userId));
  if (item) item.status = "revoked";
  return true;
}

export async function findApiKeyByHash(keyHash) {
  if (pool) {
    try {
      const res = await pool.query(
        `SELECT k.*, u.email as user_email, u.name as user_name
         FROM api_keys k
         LEFT JOIN users u ON u.id = k.user_id
         WHERE k.key_hash = $1 AND k.status = 'active'`,
        [keyHash]
      );
      if (res.rows.length) return res.rows[0];
    } catch (err) {
      console.warn("DB findApiKeyByHash error:", err.message);
    }
  }
  return inMemory.apiKeys.find((k) => k.key_hash === keyHash && k.status === "active") || null;
}

export async function logApiUsage({ keyPrefix, userId = null, model, inputTokens = 0, outputTokens = 0, durationMs = 0 }) {
  const now = new Date();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO api_usage_logs (key_prefix, user_id, model, input_tokens, output_tokens, duration_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [keyPrefix, userId, model, inputTokens, outputTokens, durationMs, now]
      );
      await pool.query(
        `UPDATE api_keys
         SET input_tokens = input_tokens + $1,
             output_tokens = output_tokens + $2,
             requests_count = requests_count + 1,
             last_used_at = $3
         WHERE key_prefix = $4`,
        [inputTokens, outputTokens, now, keyPrefix]
      );
    } catch (err) {
      console.warn("DB logApiUsage error:", err.message);
    }
  }

  inMemory.usageLogs.push({
    keyPrefix,
    userId,
    model,
    inputTokens,
    outputTokens,
    durationMs,
    created_at: now,
  });

  const k = inMemory.apiKeys.find((item) => item.key_prefix === keyPrefix);
  if (k) {
    k.input_tokens = (k.input_tokens || 0) + inputTokens;
    k.output_tokens = (k.output_tokens || 0) + outputTokens;
    k.requests_count = (k.requests_count || 0) + 1;
    k.last_used_at = now;
  }
}

export async function getApiUsageAnalytics(userId) {
  let logs = [];
  let keys = [];

  if (pool && userId) {
    try {
      const keysRes = await pool.query(
        "SELECT id, key_prefix, name, input_tokens, output_tokens, requests_count, last_used_at, created_at FROM api_keys WHERE user_id = $1 AND status != 'revoked'",
        [userId]
      );
      keys = keysRes.rows;

      const logsRes = await pool.query(
        `SELECT model, input_tokens, output_tokens, duration_ms, created_at
         FROM api_usage_logs
         WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '24 HOURS'
         ORDER BY created_at DESC`,
        [userId]
      );
      logs = logsRes.rows;
    } catch (err) {
      console.warn("DB getApiUsageAnalytics error:", err.message);
    }
  } else {
    keys = inMemory.apiKeys.filter((k) => (!userId || k.user_id === userId) && k.status !== "revoked");
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    logs = inMemory.usageLogs.filter(
      (l) => (!userId || l.userId === userId) && new Date(l.created_at).getTime() >= dayAgo
    );
  }

  const totalInputTokens = keys.reduce((sum, k) => sum + Number(k.input_tokens || 0), 0);
  const totalOutputTokens = keys.reduce((sum, k) => sum + Number(k.output_tokens || 0), 0);
  const totalRequests = keys.reduce((sum, k) => sum + Number(k.requests_count || 0), 0);

  // Compute TPM (Tokens Per Minute in the last 15 minutes)
  const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
  const recentLogs = logs.filter((l) => new Date(l.created_at).getTime() >= fifteenMinAgo);
  const recentTokens = recentLogs.reduce((sum, l) => sum + Number(l.input_tokens || 0) + Number(l.output_tokens || 0), 0);
  const currentTpm = Math.round(recentTokens / 15);

  // Generate 12 time-slice buckets for the 3D animated chart
  const buckets = [];
  const now = Date.now();
  for (let i = 11; i >= 0; i--) {
    const bucketStart = now - (i + 1) * 5 * 60 * 1000;
    const bucketEnd = now - i * 5 * 60 * 1000;
    const bucketLogs = logs.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= bucketStart && t < bucketEnd;
    });

    const inTok = bucketLogs.reduce((acc, l) => acc + Number(l.input_tokens || 0), 0);
    const outTok = bucketLogs.reduce((acc, l) => acc + Number(l.output_tokens || 0), 0);
    const reqs = bucketLogs.length;

    const dateObj = new Date(bucketEnd);
    const timeLabel = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;

    buckets.push({
      time: timeLabel,
      inputTokens: inTok,
      outputTokens: outTok,
      requests: reqs,
      totalTokens: inTok + outTok,
    });
  }

  // Model breakdown
  const modelStats = {};
  logs.forEach((l) => {
    const m = l.model || "other";
    modelStats[m] = (modelStats[m] || 0) + 1;
  });

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalRequests,
    currentTpm,
    activeKeysCount: keys.length,
    buckets,
    modelStats,
  };
}

// 📦 Database App Installers Binary Management
export async function saveInstallerChunk(filename, chunkIndex, totalChunks, dataBuffer, chunkSize) {
  const chunkId = `${filename}_chunk_${chunkIndex}`;
  if (!pool) {
    if (!inMemory.installerChunks) inMemory.installerChunks = new Map();
    inMemory.installerChunks.set(chunkId, {
      id: chunkId,
      filename,
      chunk_index: chunkIndex,
      total_chunks: totalChunks,
      data: dataBuffer,
      size: chunkSize,
    });
    return { ok: true, chunkId };
  }

  await pool.query(
    `INSERT INTO app_installers (id, filename, chunk_index, total_chunks, data, size)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, size = EXCLUDED.size, created_at = NOW()`,
    [chunkId, filename, chunkIndex, totalChunks, dataBuffer, chunkSize]
  );
  return { ok: true, chunkId };
}

export async function getInstallerChunks(filename) {
  if (!pool) {
    if (!inMemory.installerChunks) return [];
    return Array.from(inMemory.installerChunks.values())
      .filter((c) => c.filename === filename)
      .sort((a, b) => a.chunk_index - b.chunk_index);
  }

  const res = await pool.query(
    `SELECT id, chunk_index, total_chunks, data, size FROM app_installers
     WHERE filename = $1 ORDER BY chunk_index ASC`,
    [filename]
  );
  return res.rows;
}

export async function getInstallerTotalSize(filename) {
  if (!pool) {
    const chunks = await getInstallerChunks(filename);
    const total = chunks.reduce((acc, c) => acc + Number(c.size), 0);
    return { total_size: total, chunks_count: chunks.length };
  }
  const res = await pool.query(
    `SELECT COALESCE(SUM(size), 0) as total_size, COALESCE(MAX(total_chunks), 0) as total_chunks, COUNT(*) as chunks_count
     FROM app_installers WHERE filename = $1`,
    [filename]
  );
  return res.rows[0];
}