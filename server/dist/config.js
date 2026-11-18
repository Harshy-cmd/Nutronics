import dotenv from "dotenv";
import path from "node:path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
export const config = {
    port: Number(process.env.PORT || 4000),
    jwtSecret: process.env.JWT_SECRET || "local-development-secret-change-me",
    databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH || "data/nutronics.sqlite"),
    uploadsPath: path.resolve(process.cwd(), "uploads"),
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};
