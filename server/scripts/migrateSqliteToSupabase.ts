import { DatabaseSync } from "node:sqlite";
import { config } from "../src/config.js";
import { initializeDatabase, pool } from "../src/db/schema.js";

const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) throw new Error("Set SUPABASE_DATABASE_URL before migrating local SQLite data.");

const source = new DatabaseSync(config.databasePath, { readOnly: true });
const tables = [
  "users", "logs", "reminders", "meals", "chat", "records", "contacts", "sos",
  "devices", "guidelines", "notifications", "config", "cache", "foods", "medicines",
  "password_reset_tokens", "refresh_tokens",
];
const serialTables = ["logs", "reminders", "meals", "chat", "records", "contacts", "sos", "devices", "notifications", "password_reset_tokens", "refresh_tokens"];
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

try {
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
  } finally {
    client.release();
  }
} finally {
  source.close();
  await pool.end();
}

console.log("SQLite to Supabase migration finished. Existing destination rows were left intact.");
