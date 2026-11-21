import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Resolve .env path relative to this file's directory instead of process.cwd()
const rootEnvPath = path.resolve(import.meta.dirname, "../../.env");
const serverEnvPath = path.resolve(import.meta.dirname, "../.env");
const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : serverEnvPath;

dotenv.config({ path: envPath });

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET || "local-development-secret-change-me";

if (
  nodeEnv === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === "local-development-secret-change-me")
) {
  throw new Error("FATAL: JWT_SECRET must be set to a secure, non-default value in production");
}

const trustProxyEnv = process.env.TRUST_PROXY;
const trustProxy: number | boolean =
  trustProxyEnv === "true" || trustProxyEnv === "1"
    ? 1
    : trustProxyEnv && !isNaN(Number(trustProxyEnv))
      ? Number(trustProxyEnv)
      : false;

const serverDir = path.resolve(import.meta.dirname, "..");

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret,
  databasePath: path.resolve(
    serverDir,
    process.env.DATABASE_PATH || "data/nutronics.sqlite",
  ),
  supabaseCaCertPath: path.resolve(
    serverDir,
    process.env.SUPABASE_CA_CERT_PATH || "certs/supabase-prod-ca-2021.crt",
  ),
  uploadsPath: path.resolve(
    serverDir,
    process.env.UPLOADS_PATH || "uploads",
  ),
  dataPath: path.resolve(serverDir, "data"),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "Nutronics <noreply@nutronics.org>",
  nodeEnv,
  trustProxy,
};
