import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
export const db = new DatabaseSync(config.databasePath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  age INTEGER,
  conditions TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  settings TEXT NOT NULL DEFAULT '{}',
  google_id TEXT DEFAULT NULL,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, date TEXT NOT NULL, adherence REAL, weight REAL, water INTEGER, calories INTEGER, systolic INTEGER, diastolic INTEGER, glucose REAL, meals INTEGER, symptoms TEXT DEFAULT '', FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, label TEXT NOT NULL, kind TEXT NOT NULL, time TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, snoozed_until TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS meals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, day INTEGER NOT NULL, slot TEXT NOT NULL, food_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'VERIFIED', doctor TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, doctor_note TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, file_path TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS contacts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, relationship TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS sos (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS devices (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, name TEXT NOT NULL, paired INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS guidelines (condition TEXT PRIMARY KEY, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, message TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS foods (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, servingSize TEXT NOT NULL, calories REAL NOT NULL, proteinG REAL NOT NULL, carbsG REAL NOT NULL, fatG REAL NOT NULL, fiberG REAL NOT NULL, sodiumMg REAL NOT NULL, sugarG REAL NOT NULL DEFAULT 0, potassiumMg REAL DEFAULT NULL, phosphorusMg REAL DEFAULT NULL, glycemicIndex TEXT DEFAULT NULL, safeForConditions TEXT DEFAULT NULL, source TEXT NOT NULL, isEstimated INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS medicines (id TEXT PRIMARY KEY, genericName TEXT NOT NULL, brandNames TEXT NOT NULL DEFAULT '[]', drugClass TEXT DEFAULT NULL, timingInstruction TEXT DEFAULT NULL, foodInteractionNote TEXT DEFAULT NULL, warningSigns TEXT DEFAULT NULL, indications TEXT DEFAULT NULL, warnings TEXT DEFAULT NULL, boxedWarning TEXT DEFAULT NULL, rxNormId TEXT DEFAULT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  revoked_at TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

// Safe migrations for existing tables
const userCols = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map(c => c.name);
if (!userCols.includes("google_id")) {
  db.exec("ALTER TABLE users ADD COLUMN google_id TEXT DEFAULT NULL;");
}
if (!userCols.includes("auth_provider")) {
  db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local';");
}

const refreshCols = (db.prepare("PRAGMA table_info(refresh_tokens)").all() as { name: string }[]).map(c => c.name);
if (!refreshCols.includes("revoked_at")) {
  db.exec("ALTER TABLE refresh_tokens ADD COLUMN revoked_at TEXT DEFAULT NULL;");
}

db.exec(`
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, active);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_logs_date ON logs(date);
CREATE INDEX IF NOT EXISTS idx_reminders_user_time ON reminders(user_id, time);
CREATE INDEX IF NOT EXISTS idx_meals_user_day_slot ON meals(user_id, day, slot);
CREATE INDEX IF NOT EXISTS idx_chat_user_id ON chat(user_id, id);
CREATE INDEX IF NOT EXISTS idx_chat_status ON chat(status);
CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id, id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_user_created ON sos(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sos_created_at ON sos(created_at);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, id);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category);
CREATE INDEX IF NOT EXISTS idx_medicines_generic_name ON medicines(genericName);
CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_reset_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_user_id ON refresh_tokens(user_id);
`);
