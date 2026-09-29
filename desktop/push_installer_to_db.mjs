import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pg = null;
try {
  pg = (await import("pg")).default;
} catch {
  try {
    pg = (await import("../backend/node_modules/pg/lib/index.js")).default;
  } catch {}
}

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB chunks
const INSTALLER_PATH = path.resolve(__dirname, "OryxgenSetup.exe");
const SERVER_URL = process.env.SERVER_URL || "https://oryxgen-api.onrender.com";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "oryxgen-ultra-secret-key-2026";
const FILENAME = "OryxgenSetup.exe";

async function pushDirectToPostgres(dbUrl) {
  console.log("🔗 Connecting directly to PostgreSQL database...");
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  console.log("✅ Connected to PostgreSQL!");

  await client.query(`
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

  console.log(`🧹 Deleting old chunks for ${FILENAME} from database...`);
  await client.query("DELETE FROM app_installers WHERE filename = $1", [FILENAME]);
  console.log("✅ Old chunks cleared successfully!");

  const fileBuffer = fs.readFileSync(INSTALLER_PATH);
  const totalSize = fileBuffer.length;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  console.log(`📦 Uploading: ${FILENAME} (${(totalSize / 1024 / 1024).toFixed(2)} MB) in ${totalChunks} chunks...`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkData = fileBuffer.subarray(start, end);
    const chunkId = `${FILENAME}_chunk_${i}`;

    await client.query(
      `INSERT INTO app_installers (id, filename, chunk_index, total_chunks, data, size)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [chunkId, FILENAME, i, totalChunks, chunkData, chunkData.length]
    );

    const percent = (((i + 1) / totalChunks) * 100).toFixed(1);
    console.log(`  -> Chunk [${i + 1}/${totalChunks}] uploaded (${chunkData.length} bytes) - ${percent}%`);
  }

  // Verify total uploaded size
  const check = await client.query(
    "SELECT COUNT(*) as cnt, SUM(size) as total FROM app_installers WHERE filename = $1",
    [FILENAME]
  );
  console.log(`\n🔍 Verification: ${check.rows[0].cnt} chunks, ${check.rows[0].total} bytes in DB (Local: ${totalSize} bytes)`);

  client.release();
  await pool.end();
  console.log("\n🎉 OryxgenSetup.exe successfully pushed to PostgreSQL database with 0 errors!");
}

async function pushViaServerApi() {
  console.log(`🌐 Connecting to server API: ${SERVER_URL}`);

  // 1. Clear old installer chunks
  console.log(`🧹 Requesting server to clear old ${FILENAME}...`);
  try {
    const delRes = await fetch(`${SERVER_URL}/api/installer/${encodeURIComponent(FILENAME)}`, {
      method: "DELETE",
      headers: { "x-admin-secret": ADMIN_SECRET },
    });
    if (delRes.ok) {
      console.log("✅ Server cleared old installer chunks!");
    }
  } catch (err) {
    console.warn("⚠️ Clear request warning:", err.message);
  }

  const fileBuffer = fs.readFileSync(INSTALLER_PATH);
  const totalSize = fileBuffer.length;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

  console.log(`📦 Uploading: ${FILENAME} (${(totalSize / 1024 / 1024).toFixed(2)} MB) in ${totalChunks} chunks...`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkData = fileBuffer.subarray(start, end);

    const url = `${SERVER_URL}/api/installer/upload-chunk?filename=${encodeURIComponent(FILENAME)}&chunk_index=${i}&total_chunks=${totalChunks}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-admin-secret": ADMIN_SECRET,
      },
      body: chunkData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Chunk ${i} upload failed (${res.status}): ${errText}`);
    }

    const percent = (((i + 1) / totalChunks) * 100).toFixed(1);
    console.log(`  -> Chunk [${i + 1}/${totalChunks}] sent (${chunkData.length} bytes) - ${percent}%`);
  }

  console.log("\n🎉 OryxgenSetup.exe successfully uploaded to server database!");
}

async function main() {
  if (!fs.existsSync(INSTALLER_PATH)) {
    console.error(`❌ Installer file not found at: ${INSTALLER_PATH}`);
    process.exit(1);
  }

  const customDbUrl = process.argv[2] || process.env.DATABASE_URL;

  if (customDbUrl && customDbUrl.startsWith("postgres")) {
    await pushDirectToPostgres(customDbUrl);
  } else {
    try {
      await pushViaServerApi();
    } catch (err) {
      console.warn("⚠️  Server API upload note:", err.message);
      console.log("\n💡 Agar to'g'ridan-to'g'ri PostgreSQL bazaga yuklamoqchi bo'lsangiz:");
      console.log("   node desktop/push_installer_to_db.mjs \"postgresql://user:pass@host:5432/dbname\"");
    }
  }
}

main().catch((err) => {
  console.error("❌ Xatolik:", err);
  process.exit(1);
});
