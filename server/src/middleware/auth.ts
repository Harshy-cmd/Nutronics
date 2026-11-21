import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { db } from "../db/schema.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; name: string };
    }
  }
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Sign in required" });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: "Sign in required" });
    }

    let payload: { id: string; v?: number };
    try {
      payload = jwt.verify(token, config.jwtSecret) as { id: string; v?: number };
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Session expired. Please sign in again." });
      }
      return res.status(401).json({ error: "Invalid authentication token" });
    }

    // Reject tokens issued before this auth change (e.g. old 7-day tokens without version claim v: 2)
    if (!payload.v || payload.v < 2) {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }

    const user = await db
      .prepare("SELECT id, role, name, active FROM users WHERE id=?")
      .get(payload.id) as any;

    if (!user || !user.active) {
      return res.status(401).json({ error: "Account unavailable or deactivated" });
    }

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: e instanceof Error ? e.message : "Unauthorized" });
  }
}

export const roles =
  (...allowed: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied" });
    }
    next();
  };
