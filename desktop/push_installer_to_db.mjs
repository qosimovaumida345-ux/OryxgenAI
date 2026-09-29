import fs from "fs";
import path from "path";
let pg = null;
try {
  pg = (await import("pg")).default;
} catch {
  try {
    pg = (await import("../backend/node_modules/pg/lib/index.js")).default;
  } catch {}
}

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB chunks
const INSTALLER_PATH = path.resolve("desktop", "OryxgenSetup.exe");
const SERVER_URL = process.env.SERVER_URL || "https://oryxgen-api.onrender.com";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "oryxgen-ultra-secret-key-2026";

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

  const fileBuffer = fs.readFileSync(INSTALLER_PATH);
  const totalSize = fileBuffer.length;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const filename = "OryxgenSetup.exe";

  console.log(`📦 File: ${filename} (${(totalSize / 1024 / 1024).toFixed(2)} MB) in ${totalChunks} chunks`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkData = fileBuffer.subarray(start, end);
    const chunkId = `${filename}_chunk_${i}`;

    await client.query(
      `INSERT INTO app_installers (id, filename, chunk_index, total_chunks, data, size)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, size = EXCLUDED.size, created_at = NOW()`,
      [chunkId, filename, i, totalChunks, chunkData, chunkData.length]
    );

    const percent = (((i + 1) / totalChunks) * 100).toFixed(1);
    console.log(`  -> Chunk [${i + 1}/${totalChunks}] uploaded (${chunkData.length} bytes) - ${percent}%`);
  }

  client.release();
  await pool.end();
  console.log("\n🎉 OryxgenSetup.exe successfully pushed to PostgreSQL database!");
}

async function pushViaServerApi() {
  console.log(`🌐 Pushing installer to server database via API: ${SERVER_URL}/api/installer/upload-chunk`);
  const fileBuffer = fs.readFileSync(INSTALLER_PATH);
  const totalSize = fileBuffer.length;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const filename = "OryxgenSetup.exe";

  console.log(`📦 File: ${filename} (${(totalSize / 1024 / 1024).toFixed(2)} MB) in ${totalChunks} chunks`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkData = fileBuffer.subarray(start, end);

    const url = `${SERVER_URL}/api/installer/upload-chunk?filename=${encodeURIComponent(filename)}&chunk_index=${i}&total_chunks=${totalChunks}`;
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
    // If no direct DB url, attempt API upload
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
