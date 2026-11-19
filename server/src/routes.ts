// TODO(email): integrate transactional email provider
// TODO(sms): integrate Twilio / native SMS gateway
import type { Express } from "express";
import { db } from "./db/schema.js";
import { auth, roles } from "./middleware/auth.js";

const all = (sql: string, ...args: any[]) => db.prepare(sql).all(...args);
const get = (sql: string, ...args: any[]) => db.prepare(sql).get(...args) as Promise<any>;
const change = (sql: string, ...args: any[]) => db.prepare(sql).run(...args);

export function attachRoutes(app: Express) {
  app.use("/api/doctor", auth, roles("DOCTOR"));
  app.get("/api/doctor/dashboard", async (_req, res) => {
    const users = await all("SELECT id,name,age,conditions FROM users WHERE role='PATIENT' AND active=1") as any[];
    const patients = await Promise.all(users.map(async (p: any) => ({
      ...p,
      conditions: JSON.parse(p.conditions),
      adherence: (await get("SELECT adherence FROM logs WHERE user_id=? ORDER BY date DESC LIMIT 1", p.id))?.adherence || 0,
      lastActive: (await get("SELECT MAX(date) d FROM logs WHERE user_id=?", p.id))?.d,
      sos: !!(await get("SELECT id FROM sos WHERE user_id=? AND created_at>=datetime('now','-7 days')", p.id)),
    })));
    res.json({ patients, queue: (await get("SELECT COUNT(*) n FROM chat WHERE status='PENDING'"))?.n || 0 });
  });

  app.get("/api/doctor/patients/:id", async (req, res) => {
    const patient = await get("SELECT id,name,email,age,conditions FROM users WHERE id=? AND role='PATIENT'", req.params.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    patient.conditions = JSON.parse(patient.conditions);
    const [logs, meals, records, sos] = await Promise.all([
      all("SELECT * FROM logs WHERE user_id=? ORDER BY date", patient.id),
      all("SELECT * FROM meals WHERE user_id=? ORDER BY day", patient.id),
      all("SELECT id,name,category,created_at FROM records WHERE user_id=?", patient.id),
      all("SELECT * FROM sos WHERE user_id=? ORDER BY id DESC LIMIT 10", patient.id),
    ]);
    res.json({ patient, logs, meals, records, sos });
  });

  app.get("/api/doctor/verification-queue", async (_req, res) =>
    res.json({ items: await all("SELECT c.*,u.name patient_name FROM chat c JOIN users u ON u.id=c.user_id WHERE c.status='PENDING' ORDER BY c.id DESC") }),
  );
  app.patch("/api/doctor/verification-queue/:id", async (req, res) => {
    const status = req.body.status;
    if (!["VERIFIED", "REJECTED"].includes(status)) return res.status(400).json({ error: "Invalid review decision" });
    await change("UPDATE chat SET status=?,answer=COALESCE(?,answer),doctor_note=? WHERE id=?", status, req.body.answer || null, req.body.doctorNote || "", Number(req.params.id));
    res.json({ ok: true });
  });
  app.get("/api/doctor/guidelines", async (_req, res) =>
    res.json({ guidelines: (await all("SELECT * FROM guidelines") as any[]).map((g: any) => JSON.parse(g.data)) }),
  );
  app.put("/api/doctor/guidelines/:condition", async (req, res) => {
    const condition = String(req.params.condition).toUpperCase();
    const data = { condition, ...req.body };
    await change("INSERT OR REPLACE INTO guidelines(condition,data) VALUES(?,?)", condition, JSON.stringify(data));
    res.json({ ok: true, guideline: data });
  });

  app.use("/api/admin", auth, roles("ADMIN"));
  app.get("/api/admin/stats", async (_req, res) => {
    const [activePatients, activeDoctors, sosThisWeek, verified, total, logs] = await Promise.all([
      get("SELECT COUNT(*) n FROM users WHERE role='PATIENT' AND active=1"),
      get("SELECT COUNT(*) n FROM users WHERE role='DOCTOR' AND active=1"),
      get("SELECT COUNT(*) n FROM sos WHERE created_at>=datetime('now','-7 days')"),
      get("SELECT COUNT(*) n FROM chat WHERE status='VERIFIED'"),
      get("SELECT COUNT(*) n FROM chat"),
      all("SELECT date,AVG(adherence) adherence FROM logs GROUP BY date ORDER BY date DESC LIMIT 14"),
    ]);
    res.json({ activePatients: activePatients.n, activeDoctors: activeDoctors.n, sosThisWeek: sosThisWeek.n,
      verificationRate: Math.round((verified.n / Math.max(1, total.n)) * 100), logs });
  });
  app.get("/api/admin/users", async (req, res) => {
    const search = String(req.query.search || "").toLowerCase(), role = String(req.query.role || "ALL");
    const users = await all("SELECT id,email,name,role,age,active FROM users ORDER BY role,name") as any[];
    res.json({ users: users.filter((u: any) => (role === "ALL" || u.role === role) && (!search || `${u.name} ${u.email}`.toLowerCase().includes(search))) });
  });
  app.patch("/api/admin/users/:id", async (req, res) => {
    await change("UPDATE users SET active=? WHERE id=?", req.body.active ? 1 : 0, req.params.id);
    res.json({ ok: true });
  });
  app.get("/api/admin/config", async (_req, res) => {
    const [config, verified, pending, rejected] = await Promise.all([
      all("SELECT key,value FROM config"),
      get("SELECT COUNT(*) n FROM chat WHERE status='VERIFIED'"),
      get("SELECT COUNT(*) n FROM chat WHERE status='PENDING'"),
      get("SELECT COUNT(*) n FROM chat WHERE status='REJECTED'"),
    ]);
    res.json({ config: Object.fromEntries((config as any[]).map((r: any) => [r.key, r.value])), verified: verified.n, pending: pending.n, rejected: rejected.n });
  });
  app.put("/api/admin/config", async (req, res) => {
    for (const [key, value] of Object.entries(req.body)) await change("INSERT OR REPLACE INTO config(key,value) VALUES(?,?)", key, String(value));
    res.json({ ok: true });
  });
}
