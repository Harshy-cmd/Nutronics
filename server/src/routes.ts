import type { Express } from "express";
import { db } from "./db/schema.js";
import { auth, roles } from "./middleware/auth.js";
const all = (sql: string, ...args: any[]) => db.prepare(sql).all(...args);
const get = (sql: string, ...args: any[]) =>
  db.prepare(sql).get(...args) as any;
const change = (sql: string, ...args: any[]) => db.prepare(sql).run(...args);
export function attachRoutes(app: Express) {
  app.use("/api/doctor", auth, roles("DOCTOR"));
  app.get("/api/doctor/dashboard", (_req, res) => {
    const patients = all(
      "SELECT id,name,age,conditions FROM users WHERE role='PATIENT' AND active=1",
    ).map((p: any) => ({
      ...p,
      conditions: JSON.parse(p.conditions),
      adherence:
        get(
          "SELECT adherence FROM logs WHERE user_id=? ORDER BY date DESC LIMIT 1",
          p.id,
        )?.adherence || 0,
      lastActive: get("SELECT MAX(date) d FROM logs WHERE user_id=?", p.id)?.d,
      sos: !!get(
        "SELECT id FROM sos WHERE user_id=? AND created_at>=datetime('now','-7 days')",
        p.id,
      ),
    }));
    res.json({
      patients,
      queue: get("SELECT COUNT(*) n FROM chat WHERE status='PENDING'").n,
    });
  });
  app.get("/api/doctor/patients/:id", (req, res) => {
    const patient = get(
      "SELECT id,name,email,age,conditions FROM users WHERE id=? AND role='PATIENT'",
      req.params.id,
    );
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    patient.conditions = JSON.parse(patient.conditions);
    res.json({
      patient,
      logs: all("SELECT * FROM logs WHERE user_id=? ORDER BY date", patient.id),
      meals: all(
        "SELECT * FROM meals WHERE user_id=? ORDER BY day",
        patient.id,
      ),
      records: all(
        "SELECT id,name,category,created_at FROM records WHERE user_id=?",
        patient.id,
      ),
      sos: all(
        "SELECT * FROM sos WHERE user_id=? ORDER BY id DESC LIMIT 10",
        patient.id,
      ),
    });
  });
  app.get("/api/doctor/verification-queue", (_req, res) =>
    res.json({
      items: all(
        "SELECT c.*,u.name patient_name FROM chat c JOIN users u ON u.id=c.user_id WHERE c.status='PENDING' ORDER BY c.id DESC",
      ),
    }),
  );
  app.patch("/api/doctor/verification-queue/:id", (req, res) => {
    const status = req.body.status;
    if (!["VERIFIED", "REJECTED"].includes(status))
      return res.status(400).json({ error: "Invalid review decision" });
    change(
      "UPDATE chat SET status=?,answer=COALESCE(?,answer),doctor_note=? WHERE id=?",
      status,
      req.body.answer || null,
      req.body.doctorNote || "",
      Number(req.params.id),
    );
    res.json({ ok: true });
  });
  app.get("/api/doctor/guidelines", (_req, res) =>
    res.json({
      guidelines: all("SELECT * FROM guidelines").map((g: any) =>
        JSON.parse(g.data),
      ),
    }),
  );
  app.put("/api/doctor/guidelines/:condition", (req, res) => {
    const condition = String(req.params.condition).toUpperCase();
    const data = { condition, ...req.body };
    change(
      "INSERT OR REPLACE INTO guidelines(condition,data) VALUES(?,?)",
      condition,
      JSON.stringify(data),
    );
    res.json({ ok: true, guideline: data });
  });
  app.use("/api/admin", auth, roles("ADMIN"));
  app.get("/api/admin/stats", (_req, res) =>
    res.json({
      activePatients: get(
        "SELECT COUNT(*) n FROM users WHERE role='PATIENT' AND active=1",
      ).n,
      activeDoctors: get(
        "SELECT COUNT(*) n FROM users WHERE role='DOCTOR' AND active=1",
      ).n,
      sosThisWeek: get(
        "SELECT COUNT(*) n FROM sos WHERE created_at>=datetime('now','-7 days')",
      ).n,
      verificationRate: Math.round(
        (get("SELECT COUNT(*) n FROM chat WHERE status='VERIFIED'").n /
          Math.max(1, get("SELECT COUNT(*) n FROM chat").n)) *
          100,
      ),
      logs: all(
        "SELECT date,AVG(adherence) adherence FROM logs GROUP BY date ORDER BY date DESC LIMIT 14",
      ),
    }),
  );
  app.get("/api/admin/users", (req, res) => {
    const search = String(req.query.search || "").toLowerCase(),
      role = String(req.query.role || "ALL");
    res.json({
      users: all(
        "SELECT id,email,name,role,age,active FROM users ORDER BY role,name",
      ).filter(
        (u: any) =>
          (role === "ALL" || u.role === role) &&
          (!search || `${u.name} ${u.email}`.toLowerCase().includes(search)),
      ),
    });
  });
  app.patch("/api/admin/users/:id", (req, res) => {
    change(
      "UPDATE users SET active=? WHERE id=?",
      req.body.active ? 1 : 0,
      req.params.id,
    );
    res.json({ ok: true });
  });
  app.get("/api/admin/config", (_req, res) =>
    res.json({
      config: Object.fromEntries(
        all("SELECT key,value FROM config").map((r: any) => [r.key, r.value]),
      ),
      verified: get("SELECT COUNT(*) n FROM chat WHERE status='VERIFIED'").n,
      pending: get("SELECT COUNT(*) n FROM chat WHERE status='PENDING'").n,
      rejected: get("SELECT COUNT(*) n FROM chat WHERE status='REJECTED'").n,
    }),
  );
  app.put("/api/admin/config", (req, res) => {
    for (const [key, value] of Object.entries(req.body))
      change(
        "INSERT OR REPLACE INTO config(key,value) VALUES(?,?)",
        key,
        String(value),
      );
    res.json({ ok: true });
  });
}
