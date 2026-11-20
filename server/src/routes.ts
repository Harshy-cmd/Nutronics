// TODO(email): integrate transactional email provider
// TODO(sms): integrate Twilio / native SMS gateway
import type { Express } from "express";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { isAssignedDoctor } from "./services/doctorAccess.js";
import { db, pool } from "./db/schema.js";
import { auth, roles } from "./middleware/auth.js";

const all = (sql: string, ...args: any[]) => db.prepare(sql).all(...args);
const get = (sql: string, ...args: any[]) => db.prepare(sql).get(...args) as Promise<any>;
const change = (sql: string, ...args: any[]) => db.prepare(sql).run(...args);

export function attachRoutes(app: Express) {
  app.use("/api/doctor", auth, roles("DOCTOR"));
  app.get("/api/doctor/dashboard", async (req, res) => {
    const users = await all("SELECT u.id,u.name,u.age,u.conditions FROM users u JOIN doctor_patient_assignments a ON a.patient_id=u.id WHERE a.doctor_id=? AND u.role='PATIENT' AND u.active=1", req.user!.id) as any[];
    for (const p of users) await change("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)", req.user!.id, "assigned_patient_summary_read", "patient", p.id);
    const patients = await Promise.all(users.map(async (p: any) => ({
      ...p,
      conditions: JSON.parse(p.conditions),
      adherence: (await get("SELECT adherence FROM logs WHERE user_id=? ORDER BY date DESC LIMIT 1", p.id))?.adherence || 0,
      lastActive: (await get("SELECT MAX(date) d FROM logs WHERE user_id=?", p.id))?.d,
      sos: !!(await get("SELECT id FROM sos WHERE user_id=? AND created_at>=datetime('now','-7 days')", p.id)),
    })));
    res.json({ patients, queue: (await get("SELECT COUNT(*) n FROM chat c JOIN doctor_patient_assignments a ON a.patient_id=c.user_id WHERE a.doctor_id=? AND c.status='PENDING'", req.user!.id))?.n || 0 });
  });

  app.get("/api/doctor/patients/:id", async (req, res) => {
    if (!await isAssignedDoctor(req.user!.id, String(req.params.id))) return res.status(404).json({ error: "Patient not found" });
    const patient = await get("SELECT u.id,u.name,u.email,u.age,u.conditions FROM users u JOIN doctor_patient_assignments a ON a.patient_id=u.id WHERE u.id=? AND u.role='PATIENT' AND a.doctor_id=?", req.params.id, req.user!.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)", req.user!.id, "patient_dossier_read", "patient", patient.id);
    patient.conditions = JSON.parse(patient.conditions);
    const [logs, meals, records, sos] = await Promise.all([
      all("SELECT * FROM logs WHERE user_id=? ORDER BY date", patient.id),
      all("SELECT * FROM meals WHERE user_id=? ORDER BY day", patient.id),
      all("SELECT id,name,category,created_at FROM records WHERE user_id=?", patient.id),
      all("SELECT * FROM sos WHERE user_id=? ORDER BY id DESC LIMIT 10", patient.id),
    ]);
    res.json({ patient, logs, meals, records, sos });
  });

  app.get("/api/doctor/verification-queue", async (req, res) => {
    const items = await all("SELECT c.*,u.name patient_name FROM chat c JOIN users u ON u.id=c.user_id JOIN doctor_patient_assignments a ON a.patient_id=c.user_id WHERE c.status='PENDING' AND a.doctor_id=? ORDER BY c.id DESC", req.user!.id);
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,details) VALUES(?,?,?,?)", req.user!.id, "assigned_patient_review_queue_read", "chat", JSON.stringify({ count: items.length }));
    res.json({ items });
  });
  app.patch("/api/doctor/verification-queue/:id", async (req, res) => {
    const status = req.body.status;
    if (!["VERIFIED", "REJECTED"].includes(status)) return res.status(400).json({ error: "Invalid review decision" });
    const updated = await change("UPDATE chat SET status=?,answer=COALESCE(?,answer),doctor_note=? WHERE id=? AND status='PENDING' AND EXISTS (SELECT 1 FROM doctor_patient_assignments a WHERE a.patient_id=chat.user_id AND a.doctor_id=?)", status, req.body.answer || null, req.body.doctorNote || "", Number(req.params.id), req.user!.id);
    if (!updated.changes) return res.status(404).json({ error: "Review item not found for an assigned patient" });
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)", req.user!.id, "assistant_review", "chat", String(req.params.id), JSON.stringify({ status }));
    res.json({ ok: true });
  });
  app.get("/api/doctor/guidelines", async (_req, res) =>
    res.json({ guidelines: (await all("SELECT * FROM guidelines") as any[]).map((g: any) => JSON.parse(g.data)) }),
  );
  app.put("/api/doctor/guidelines/:condition", async (req, res) => {
    const condition = String(req.params.condition).toUpperCase();
    const data = { ...req.body, condition };
    await change("INSERT OR REPLACE INTO guidelines(condition,data) VALUES(?,?)", condition, JSON.stringify(data));
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)", req.user!.id, "clinical_guideline_changed", "guideline", condition);
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
    const assignments = await all("SELECT doctor_id,patient_id FROM doctor_patient_assignments");
    const doctors = await all("SELECT id,name,email FROM users WHERE role='DOCTOR' AND active=1 ORDER BY name");
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,details) VALUES(?,?,?,?)", req.user!.id, "account_directory_read", "users", JSON.stringify({ role, search: Boolean(search) }));
    res.json({ users: users.filter((u: any) => (role === "ALL" || u.role === role) && (!search || `${u.name} ${u.email}`.toLowerCase().includes(search))), assignments, doctors });
  });
  app.get("/api/admin/assignments", async (_req, res) => {
    const [patients, doctors, assignments] = await Promise.all([
      all("SELECT id,name,email FROM users WHERE role='PATIENT' AND active=1 ORDER BY name"),
      all("SELECT id,name,email FROM users WHERE role='DOCTOR' AND active=1 ORDER BY name"),
      all("SELECT doctor_id,patient_id FROM doctor_patient_assignments"),
    ]);
    res.json({ patients, doctors, assignments });
  });
  app.put("/api/admin/assignments/:patientId", async (req, res) => {
    const patientId = String(req.params.patientId);
    const doctorIds = Array.isArray(req.body.doctorIds) ? [...new Set(req.body.doctorIds.map(String))] : null;
    if (!doctorIds || doctorIds.length > 50) return res.status(400).json({ error: "doctorIds must be a list of up to 50 doctor IDs" });
    const patient = await get("SELECT id FROM users WHERE id=? AND role='PATIENT' AND active=1", patientId);
    if (!patient) return res.status(404).json({ error: "Active patient not found" });
    if (doctorIds.length) {
      const valid = await all("SELECT id FROM users WHERE role='DOCTOR' AND active=1 AND id=ANY(?::text[])", doctorIds);
      if (valid.length !== doctorIds.length) return res.status(400).json({ error: "All assigned accounts must be active doctors" });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM doctor_patient_assignments WHERE patient_id=$1", [patientId]);
      for (const doctorId of doctorIds) await client.query("INSERT INTO doctor_patient_assignments(doctor_id,patient_id,assigned_by) VALUES($1,$2,$3)", [doctorId, patientId, req.user!.id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)", req.user!.id, "patient_assignments_changed", "patient", patientId, JSON.stringify({ doctorIds }));
    res.json({ ok: true });
  });
  app.post("/api/admin/users", async (req, res) => {
    const email = String(req.body.email || "").trim().toLowerCase();
    const name = String(req.body.name || "").trim();
    const role = String(req.body.role || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 120 || !["DOCTOR", "ADMIN"].includes(role)) return res.status(400).json({ error: "Provide a valid email, name, and DOCTOR or ADMIN role" });
    if (await get("SELECT id FROM users WHERE email=?", email)) return res.status(409).json({ error: "An account already exists for this email" });
    const id = `staff-${randomUUID()}`;
    await change("INSERT INTO users(id,email,password,name,role,conditions,auth_provider) VALUES(?,?,?,?,?,'[]','firebase')", id, email, bcrypt.hashSync(randomUUID(), 10), name, role);
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)", req.user!.id, "staff_provisioned", "user", id, JSON.stringify({ email, role }));
    res.status(201).json({ ok: true, user: { id, email, name, role, active: 1 }, message: "Staff account provisioned. Use the matching verified Firebase email link or Google account to sign in." });
  });
  app.patch("/api/admin/users/:id", async (req, res) => {
    if (typeof req.body.active !== "boolean") return res.status(400).json({ error: "active must be a boolean" });
    if (req.params.id === req.user!.id && !req.body.active) return res.status(400).json({ error: "You cannot deactivate your own administrator account" });
    const updated = await change("UPDATE users SET active=? WHERE id=?", req.body.active ? 1 : 0, req.params.id);
    if (!updated.changes) return res.status(404).json({ error: "Account not found" });
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)", req.user!.id, "account_activation_changed", "user", String(req.params.id), JSON.stringify({ active: req.body.active }));
    res.json({ ok: true });
  });
  app.get("/api/admin/config", async (_req, res) => {
    const [config, verified, pending, rejected, audit, deletionRequests] = await Promise.all([
      all("SELECT key,value FROM config"),
      get("SELECT COUNT(*) n FROM chat WHERE status='VERIFIED'"),
      get("SELECT COUNT(*) n FROM chat WHERE status='PENDING'"),
      get("SELECT COUNT(*) n FROM chat WHERE status='REJECTED'"),
      all("SELECT a.id,a.actor_id,u.name actor_name,a.action,a.entity_type,a.entity_id,a.details,a.created_at FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 30"),
      all("SELECT d.id,d.user_id,u.email,u.name,d.created_at FROM deletion_requests d JOIN users u ON u.id=d.user_id WHERE d.status='PENDING' ORDER BY d.created_at"),
    ]);
    res.json({ config: Object.fromEntries((config as any[]).map((r: any) => [r.key, r.value])), verified: verified.n, pending: pending.n, rejected: rejected.n, audit, deletionRequests });
  });
  app.put("/api/admin/config", async (req, res) => {
    const allowed = new Set(["aiEngineEnabled", "externalApisEnabled", "autoVerifyGuidelineMatches", "sosCountdownSeconds", "maintenanceBanner"]);
    if (Object.keys(req.body || {}).some((key) => !allowed.has(key))) return res.status(400).json({ error: "One or more configuration keys are unsupported" });
    for (const key of ["aiEngineEnabled", "externalApisEnabled", "autoVerifyGuidelineMatches"]) if (req.body[key] !== undefined && ![true, false, "true", "false"].includes(req.body[key])) return res.status(400).json({ error: `${key} must be true or false` });
    if (req.body.sosCountdownSeconds !== undefined && (!/^\d+$/.test(String(req.body.sosCountdownSeconds)) || Number(req.body.sosCountdownSeconds) > 30)) return res.status(400).json({ error: "SOS countdown must be between 0 and 30 seconds" });
    if (req.body.maintenanceBanner !== undefined && String(req.body.maintenanceBanner).length > 240) return res.status(400).json({ error: "Maintenance banner must be 240 characters or fewer" });
    for (const [key, value] of Object.entries(req.body)) await change("INSERT OR REPLACE INTO config(key,value) VALUES(?,?)", key, String(value));
    await change("INSERT INTO audit_logs(actor_id,action,entity_type,details) VALUES(?,?,?,?)", req.user!.id, "system_config_changed", "config", JSON.stringify(Object.keys(req.body)));
    res.json({ ok: true });
  });
}
