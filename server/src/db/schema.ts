import pg from "pg";
import fs from "node:fs";
import { config } from "../config.js";

const { Pool } = pg;
const connectionString = process.env.SUPABASE_DATABASE_URL;
if (config.nodeEnv === "production" && !connectionString) {
  throw new Error("FATAL: SUPABASE_DATABASE_URL must be set in production");
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString
    ? { ca: fs.readFileSync(config.supabaseCaCertPath, "utf8"), rejectUnauthorized: true }
    : undefined,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

function postgresSql(sql: string) {
  let value = sql
    .replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, "INSERT INTO")
    .replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, "INSERT INTO")
    .replace(/"local"/g, "'local'")
    .replace(/datetime\('now','\+15 minutes'\)/gi, "(NOW() + INTERVAL '15 minutes')")
    .replace(/datetime\('now','-7 days'\)/gi, "(NOW() - INTERVAL '7 days')");

  value = value.replace(/\?/g, () => `$${++postgresSql.parameterIndex}`);
  return value;
}
postgresSql.parameterIndex = 0;

function prepareSql(sql: string, args: unknown[]) {
  postgresSql.parameterIndex = 0;
  let value = postgresSql(sql);
  const insert = /^\s*INSERT\s+INTO\s+(\w+)/i.exec(value);
  if (!insert) return { sql: value, args };
  const table = insert[1].toLowerCase();
  const idTables = new Set([
    "logs", "reminders", "meals", "chat", "records", "contacts", "sos",
    "devices", "notifications", "password_reset_tokens", "refresh_tokens", "email_login_otps",
  ]);
  if (/INSERT\s+OR\s+IGNORE/i.test(sql)) value += " ON CONFLICT DO NOTHING";
  if (/INSERT\s+OR\s+REPLACE/i.test(sql)) {
    const conflict = table === "guidelines" ? "condition" : table === "config" || table === "cache" ? "key" : null;
    if (conflict) {
      const columns = table === "guidelines" ? ["data"] : table === "config" ? ["value"] : ["value", "expires_at"];
      value += ` ON CONFLICT (${conflict}) DO UPDATE SET ${columns.map(c => `${c}=EXCLUDED.${c}`).join(", ")}`;
    }
  }
  if (idTables.has(table) && !/\bRETURNING\b/i.test(value)) value += " RETURNING id";
  return { sql: value, args };
}

export const db = {
  prepare(sql: string) {
    return {
      async all(...args: unknown[]) {
        const q = prepareSql(sql, args);
        return (await pool.query(q.sql, q.args)).rows;
      },
      async get(...args: unknown[]) {
        const q = prepareSql(sql, args);
        return (await pool.query(q.sql, q.args)).rows[0];
      },
      async run(...args: unknown[]) {
        const q = prepareSql(sql, args);
        const result = await pool.query(q.sql, q.args);
        return { changes: result.rowCount || 0, lastInsertRowid: result.rows[0]?.id };
      },
    };
  },
  async exec(sql: string) {
    await pool.query(sql);
  },
};

const schema = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, age INTEGER, conditions TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1, settings TEXT NOT NULL DEFAULT '{}', google_id TEXT DEFAULT NULL, auth_provider TEXT NOT NULL DEFAULT 'local', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS logs (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), date TEXT NOT NULL, adherence DOUBLE PRECISION, weight DOUBLE PRECISION, water INTEGER, calories INTEGER, systolic INTEGER, diastolic INTEGER, glucose DOUBLE PRECISION, meals INTEGER, symptoms TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS reminders (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), label TEXT NOT NULL, kind TEXT NOT NULL, time TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, snoozed_until TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS meals (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), day INTEGER NOT NULL, slot TEXT NOT NULL, food_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'VERIFIED', doctor TEXT);
CREATE TABLE IF NOT EXISTS chat (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), question TEXT NOT NULL, answer TEXT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), doctor_note TEXT);
CREATE TABLE IF NOT EXISTS records (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, category TEXT NOT NULL, file_path TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS contacts (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, phone TEXT NOT NULL, relationship TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sos (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS devices (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, paired INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS guidelines (condition TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), message TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS foods (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, "servingSize" TEXT NOT NULL, calories DOUBLE PRECISION NOT NULL, "proteinG" DOUBLE PRECISION NOT NULL, "carbsG" DOUBLE PRECISION NOT NULL, "fatG" DOUBLE PRECISION NOT NULL, "fiberG" DOUBLE PRECISION NOT NULL, "sodiumMg" DOUBLE PRECISION NOT NULL, "sugarG" DOUBLE PRECISION NOT NULL DEFAULT 0, "potassiumMg" DOUBLE PRECISION, "phosphorusMg" DOUBLE PRECISION, "glycemicIndex" TEXT, "safeForConditions" TEXT, source TEXT NOT NULL, "isEstimated" INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS medicines (id TEXT PRIMARY KEY, "genericName" TEXT NOT NULL, "brandNames" TEXT NOT NULL DEFAULT '[]', "drugClass" TEXT, "timingInstruction" TEXT, "foodInteractionNote" TEXT, "warningSigns" TEXT, indications TEXT, warnings TEXT, "boxedWarning" TEXT, "rxNormId" TEXT, source TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS password_reset_tokens (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, used INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS email_login_otps (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, code_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, used INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS refresh_tokens (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, revoked INTEGER NOT NULL DEFAULT 0, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, active);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_reminders_user_time ON reminders(user_id, time);
CREATE INDEX IF NOT EXISTS idx_meals_user_day_slot ON meals(user_id, day, slot);
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat(user_id, id);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id, id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_user_created ON sos(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, id);
CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_login_otps_user ON email_login_otps(user_id, created_at DESC) WHERE used=0;
CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens(token_hash);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_login_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
`;

export async function initializeDatabase() {
  await pool.query(schema);
}
