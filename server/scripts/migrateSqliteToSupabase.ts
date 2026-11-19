import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "../src/config.js";
import { initializeDatabase, pool } from "../src/db/schema.js";
import { ensureRecordBucket, uploadRecordObject } from "../src/services/recordStorageService.js";

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("Set SUPABASE_DATABASE_URL before migrating local SQLite data.");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_URL) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before migrating uploaded record files.");
}

const source = new DatabaseSync(config.databasePath, { readOnly: true });
const tables = [
  "users", "logs", "reminders", "meals", "chat", "records", "contacts", "sos",
  "devices", "guidelines", "notifications", "config", "cache", "foods", "medicines",
  "password_reset_tokens", "refresh_tokens",
];
const serialTables = ["logs", "reminders", "meals", "chat", "records", "contacts", "sos", "devices", "notifications", "password_reset_tokens", "refresh_tokens"];
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

try {
  await ensureRecordBucket();
  await initializeDatabase();
  const client = await pool.connect();
  try {
    for (const table of tables) {
      const rows = source.prepare(`SELECT * FROM ${quote(table)}`).all() as Record<string, unknown>[];
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      const columnsSql = columns.map(quote).join(", ");
      const blockSize = 200;
      for (let start = 0; start < rows.length; start += blockSize) {
        const batch = rows.slice(start, start + blockSize);
        const params: unknown[] = [];
        const values = batch.map((row) => `(${columns.map((column) => {
          params.push(row[column]);
          return `$${params.length}`;
        }).join(",")})`).join(",");
        await client.query(
          `INSERT INTO ${quote(table)} (${columnsSql}) VALUES ${values} ON CONFLICT DO NOTHING`,
          params,
        );
      }
      if (serialTables.includes(table)) {
        await client.query(
          `SELECT setval(pg_get_serial_sequence($1, 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM ${quote(table)}), 1), 1), EXISTS(SELECT 1 FROM ${quote(table)}))`,
          [`public.${table}`],
        );
      }
      console.log(`Migrated ${rows.length} rows from ${table}`);
    }

    const records = source.prepare("SELECT id,user_id,file_path FROM records ORDER BY id").all() as { id: number; user_id: string; file_path: string }[];
    const uploadRoot = path.resolve(config.uploadsPath);
    const contentTypes: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", txt: "text/plain" };
    for (const record of records) {
      const sourcePath = path.resolve(uploadRoot, path.basename(record.file_path));
      if (!sourcePath.startsWith(`${uploadRoot}${path.sep}`) || !fs.existsSync(sourcePath)) {
        throw new Error(`Local file missing for records row ${record.id}; file migration stopped.`);
      }
      const extension = path.extname(sourcePath).slice(1).toLowerCase();
      const contentType = contentTypes[extension];
      if (!contentType) throw new Error(`Unsupported file type for records row ${record.id}.`);
      const objectKey = `${record.user_id}/${record.id}/${path.basename(sourcePath).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await uploadRecordObject(objectKey, fs.readFileSync(sourcePath), contentType);
      await client.query("UPDATE records SET file_path=$1 WHERE id=$2", [objectKey, record.id]);
      console.log(`Migrated file for records row ${record.id}`);
    }
  } finally {
    client.release();
  }
} finally {
  source.close();
  await pool.end();
}

console.log("SQLite to Supabase migration finished. Existing destination rows were left intact.");
