import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { config } from './config.js';
import { db, initializeDatabase } from './db/schema.js';
import { auth, roles } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { answerFor, DISCLAIMER } from './services/aiEngine.js';
import { foods, medicines } from './services/dataService.js';
import { ensurePatientStarterData } from './services/starterDataService.js';
import {
  usdaLookup,
  openFoodFactsLookup,
  rxNavLookup,
  fdaLookup,
  medlineLookup,
} from './services/externalDataService.js';
import { authRouter, safeUser } from './routes/auth.js';
import { attachRoutes } from './routes.js';
import { deleteRecordObject, downloadRecordObject, ensureRecordBucket, uploadRecordObject } from './services/recordStorageService.js';

await initializeDatabase();
const seededUserCount = Number((await db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: string | number }).count);
if (seededUserCount === 0) {
  await import('./db/seed.js');
}
if (config.nodeEnv === 'production') await ensureRecordBucket();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(null, /\.(pdf|png|jpe?g|txt)$/i.test(file.originalname)),
});

const app = express();
if (config.trustProxy) {
  app.set('trust proxy', config.trustProxy);
}

// Support CORS with credentials for httpOnly refresh cookies
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use('/api/auth', (req, res, next) => {
  const origin = req.get('origin');
  if (origin && origin !== config.clientOrigin) return res.status(403).json({ error: 'Origin not allowed' });
  next();
});
app.use(express.json({ limit: '1mb' }));

const rows = (sql: string, ...args: any[]) => db.prepare(sql).all(...args);
const one = (sql: string, ...args: any[]) => db.prepare(sql).get(...args) as any;
const run = (sql: string, ...args: any[]) => db.prepare(sql).run(...args);

app.get('/api/health', async (_req, res) =>
  res.json({ ok: true, service: 'Nutronics API' })
);

// Mount dedicated auth routes (register, login, google, refresh, logout, forgot-password, reset-password, me)
app.use('/api/auth', authRouter);

// Patient routes
app.use('/api/patient', auth, roles('PATIENT'));

app.get('/api/patient/dashboard', async (req, res) => {
  const uid = req.user!.id;
  await ensurePatientStarterData(uid);
  const today = new Date().toISOString().slice(0, 10);
  const latest = await one('SELECT * FROM logs WHERE user_id=? ORDER BY date DESC LIMIT 1', uid);
  const todays = (await rows('SELECT * FROM meals WHERE user_id=? AND day=0', uid)).map(
    (m: any) => ({ ...m, ...foods.find((f: any) => f.id === m.food_id) })
  );
  const reminders = await rows('SELECT * FROM reminders WHERE user_id=? ORDER BY time', uid);
  res.json({
    user: safeUser(await one('SELECT * FROM users WHERE id=?', uid)),
    today,
    adherence: latest?.adherence || 0,
    log: latest,
    meals: todays,
    reminders,
    disclaimer: DISCLAIMER,
  });
});

app.get('/api/patient/diet', async (req, res) => {
  await ensurePatientStarterData(req.user!.id);
  res.json({
    meals: (await rows(
      'SELECT * FROM meals WHERE user_id=? ORDER BY day,slot',
      req.user!.id
    )).map((m: any) => ({ ...m, ...foods.find((f: any) => f.id === m.food_id) })),
    foods: foods.slice(0, 40),
    disclaimer: DISCLAIMER,
  });
});

app.post('/api/patient/diet/swap', async (req, res) => {
  const p = z.object({ mealId: z.number(), foodId: z.string() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid meal swap' });
  const meal = await one('SELECT * FROM meals WHERE id=? AND user_id=?', p.data.mealId, req.user!.id);
  if (!meal) return res.status(404).json({ error: 'Meal not found' });
  await run("UPDATE meals SET food_id=?,status='PENDING' WHERE id=?", p.data.foodId, p.data.mealId);
  res.json({ ok: true, verificationStatus: 'PENDING' });
});

app.get('/api/patient/reminders', async (req, res) => {
  await ensurePatientStarterData(req.user!.id);
  res.json({
    reminders: await rows('SELECT * FROM reminders WHERE user_id=? ORDER BY time', req.user!.id),
  });
});

app.post('/api/patient/reminders', async (req, res) => {
  const p = z
    .object({
      label: z.string().min(1),
      kind: z.enum(['Medicine', 'Water', 'Meal']),
      time: z.string(),
    })
    .safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid reminder' });
  const result = await run(
    'INSERT INTO reminders(user_id,label,kind,time) VALUES(?,?,?,?)',
    req.user!.id,
    p.data.label,
    p.data.kind,
    p.data.time
  );
  res.status(201).json(await one('SELECT * FROM reminders WHERE id=?', result.lastInsertRowid));
});

app.patch('/api/patient/reminders/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await one('SELECT * FROM reminders WHERE id=? AND user_id=?', id, req.user!.id);
  if (!item) return res.status(404).json({ error: 'Reminder not found' });
  if (req.body.done !== undefined)
    await run('UPDATE reminders SET done=? WHERE id=?', req.body.done ? 1 : 0, id);
  if (req.body.snooze)
    await run("UPDATE reminders SET snoozed_until=datetime('now','+15 minutes') WHERE id=?", id);
  res.json(await one('SELECT * FROM reminders WHERE id=?', id));
});

app.delete('/api/patient/reminders/:id', async (req, res) => {
  await run('DELETE FROM reminders WHERE id=? AND user_id=?', Number(req.params.id), req.user!.id);
  res.json({ ok: true });
});

app.get('/api/patient/progress', async (req, res) => {
  await ensurePatientStarterData(req.user!.id);
  res.json({
    logs: await rows('SELECT * FROM logs WHERE user_id=? ORDER BY date', req.user!.id),
  });
});

app.post('/api/patient/progress', async (req, res) => {
  const p = z
    .object({
      weight: z.number().optional(),
      water: z.number().optional(),
      calories: z.number().optional(),
      systolic: z.number().optional(),
      diastolic: z.number().optional(),
      glucose: z.number().optional(),
      meals: z.number().optional(),
      symptoms: z.string().optional(),
    })
    .safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Invalid progress values' });
  const today = new Date().toISOString().slice(0, 10);
  const prior = await one('SELECT * FROM logs WHERE user_id=? AND date=?', req.user!.id, today);
  const v = { ...prior, ...p.data };
  if (prior)
    await run(
      'UPDATE logs SET weight=?,water=?,calories=?,systolic=?,diastolic=?,glucose=?,meals=?,symptoms=?,adherence=? WHERE id=?',
      v.weight || null,
      v.water || null,
      v.calories || null,
      v.systolic || null,
      v.diastolic || null,
      v.glucose || null,
      v.meals || 0,
      v.symptoms || '',
      Math.min(100, (v.meals || 0) * 30),
      prior.id
    );
  else
    await run(
      'INSERT INTO logs(user_id,date,adherence,weight,water,calories,systolic,diastolic,glucose,meals,symptoms) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      req.user!.id,
      today,
      80,
      v.weight || null,
      v.water || null,
      v.calories || null,
      v.systolic || null,
      v.diastolic || null,
      v.glucose || null,
      v.meals || 0,
      v.symptoms || ''
    );
  res.json({ log: await one('SELECT * FROM logs WHERE user_id=? AND date=?', req.user!.id, today) });
});

app.get('/api/patient/assistant/history', async (req, res) =>
  res.json({
    messages: await rows('SELECT * FROM chat WHERE user_id=? ORDER BY id', req.user!.id),
    disclaimer: DISCLAIMER,
  })
);

app.post('/api/patient/assistant/ask', async (req, res) => {
  const p = z.object({ question: z.string().min(2) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Ask a question to get started' });
  const result = await answerFor(req.user!.id, p.data.question);
  const saved = await run(
    'INSERT INTO chat(user_id,question,answer,status) VALUES(?,?,?,?)',
    req.user!.id,
    p.data.question,
    result.answer,
    result.verificationStatus
  );
  res.json({ ...result, id: saved.lastInsertRowid });
});

app.get('/api/patient/records', async (req, res) =>
  res.json({
    records: await rows(
      'SELECT id,name,category,created_at FROM records WHERE user_id=? ORDER BY id DESC',
      req.user!.id
    ),
  })
);

app.post('/api/patient/records', upload.single('file'), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ error: 'Select a PDF, image, or text file under 5 MB' });
  const extension = req.file.originalname.split('.').pop()?.toLowerCase() || '';
  const mimeByExtension: Record<string, string> = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain',
  };
  const contentType = mimeByExtension[extension];
  if (!contentType) return res.status(400).json({ error: 'Unsupported record file type' });
  const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'record';
  const storageKey = `${req.user!.id}/${randomUUID()}-${safeName}`;
  await uploadRecordObject(storageKey, req.file.buffer, contentType);
  let id: number;
  try {
    id = (await run(
      'INSERT INTO records(user_id,name,category,file_path) VALUES(?,?,?,?)',
      req.user!.id,
      req.body.name || req.file.originalname,
      req.body.category || 'Other',
      storageKey
    )).lastInsertRowid;
  } catch (error) {
    await deleteRecordObject(storageKey);
    throw error;
  }
  res.status(201).json(await one('SELECT id,name,category,created_at FROM records WHERE id=?', id));
});

app.get('/api/patient/records/:id/download', async (req, res) => {
  const rec = await one(
    'SELECT * FROM records WHERE id=? AND user_id=?',
    Number(req.params.id),
    req.user!.id
  );
  if (!rec) return res.status(404).json({ error: 'Record not found' });
  const file = await downloadRecordObject(rec.file_path);
  res.type(file.contentType).attachment(rec.name).send(Buffer.from(file.bytes));
});

app.delete('/api/patient/records/:id', async (req, res) => {
  const rec = await one(
    'SELECT * FROM records WHERE id=? AND user_id=?',
    Number(req.params.id),
    req.user!.id
  );
  if (rec) {
    await deleteRecordObject(rec.file_path);
    await run('DELETE FROM records WHERE id=?', rec.id);
  }
  res.json({ ok: true });
});

app.get('/api/patient/profile', async (req, res) => {
  await ensurePatientStarterData(req.user!.id);
  res.json({
    user: safeUser(await one('SELECT * FROM users WHERE id=?', req.user!.id)),
    contacts: await rows('SELECT * FROM contacts WHERE user_id=?', req.user!.id),
    activity: await rows("SELECT a.action,a.entity_type,a.entity_id,a.created_at,u.name actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id WHERE a.actor_id=? OR (a.entity_type='patient' AND a.entity_id=?) ORDER BY a.id DESC LIMIT 50", req.user!.id, req.user!.id),
  });
});

app.get('/api/patient/export', async (req, res) => {
  const userId = req.user!.id;
  const [user, logs, reminders, meals, conversations, records, contacts, sos, notifications] = await Promise.all([
    one('SELECT id,email,name,role,age,conditions,settings,privacy_consented_at,created_at FROM users WHERE id=?', userId),
    rows('SELECT * FROM logs WHERE user_id=? ORDER BY date', userId),
    rows('SELECT * FROM reminders WHERE user_id=? ORDER BY time', userId),
    rows('SELECT * FROM meals WHERE user_id=? ORDER BY day,slot', userId),
    rows('SELECT id,question,answer,status,created_at,doctor_note FROM chat WHERE user_id=? ORDER BY id', userId),
    rows('SELECT id,name,category,created_at FROM records WHERE user_id=? ORDER BY id', userId),
    rows('SELECT id,name,phone,relationship FROM contacts WHERE user_id=?', userId),
    rows('SELECT id,created_at FROM sos WHERE user_id=? ORDER BY id', userId),
    rows('SELECT id,message,read,created_at FROM notifications WHERE user_id=? ORDER BY id', userId),
  ]);
  res.setHeader('Content-Disposition', 'attachment; filename="nutronics-data-export.json"');
  res.json({ exportedAt: new Date().toISOString(), note: 'Health record files are not bundled; download them separately from Health records.', user, logs, reminders, meals, conversations, records, contacts, sos, notifications });
});

app.get('/api/patient/export.csv', async (req, res) => {
  const userId = req.user!.id;
  const sections = await Promise.all([
    one('SELECT id,email,name,age,conditions,settings,privacy_consented_at,created_at FROM users WHERE id=?', userId).then((x: any) => [x]),
    rows('SELECT * FROM logs WHERE user_id=? ORDER BY date', userId),
    rows('SELECT * FROM reminders WHERE user_id=? ORDER BY time', userId),
    rows('SELECT * FROM meals WHERE user_id=? ORDER BY day,slot', userId),
    rows('SELECT id,question,answer,status,created_at,doctor_note FROM chat WHERE user_id=? ORDER BY id', userId),
    rows('SELECT id,name,category,created_at FROM records WHERE user_id=? ORDER BY id', userId),
    rows('SELECT id,name,phone,relationship FROM contacts WHERE user_id=?', userId),
    rows('SELECT id,created_at FROM sos WHERE user_id=? ORDER BY id', userId),
    rows('SELECT id,message,read,created_at FROM notifications WHERE user_id=? ORDER BY id', userId),
  ]);
  const escapeCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const lines = ['section,record_json'];
  const names = ['profile', 'logs', 'reminders', 'meals', 'conversations', 'records', 'contacts', 'sos', 'notifications'];
  for (const [index, records] of sections.entries()) for (const record of records as any[]) lines.push(`${escapeCell(names[index])},${escapeCell(JSON.stringify(record))}`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="nutronics-data-export.csv"');
  res.send(lines.join('\r\n'));
});

app.post('/api/patient/deletion-request', async (req, res) => {
  await run("INSERT INTO deletion_requests(user_id,status) VALUES(?,'PENDING') ON CONFLICT DO NOTHING", req.user!.id);
  await run("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)", req.user!.id, 'account_deletion_requested', 'user', req.user!.id);
  res.status(202).json({ ok: true, message: 'Your request was recorded. Account and file deletion requires administrator follow-up; this request does not immediately erase data.' });
});

app.patch('/api/patient/profile', async (req, res) => {
  const user = await one('SELECT * FROM users WHERE id=?', req.user!.id);
  const settings = { ...JSON.parse(user.settings || '{}'), ...(req.body.settings || {}) };
  await run(
    'UPDATE users SET name=?,age=?,conditions=?,settings=? WHERE id=?',
    req.body.name || user.name,
    req.body.age || user.age,
    JSON.stringify(req.body.conditions || JSON.parse(user.conditions)),
    JSON.stringify(settings),
    user.id
  );
  res.json({ user: safeUser(await one('SELECT * FROM users WHERE id=?', user.id)) });
});

app.post('/api/patient/contacts', async (req, res) => {
  const p = z
    .object({
      name: z.string().min(1),
      phone: z.string().min(5),
      relationship: z.string().min(1),
    })
    .safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: 'Enter contact details' });
  const r = await run(
    'INSERT INTO contacts(user_id,name,phone,relationship) VALUES(?,?,?,?)',
    req.user!.id,
    p.data.name,
    p.data.phone,
    p.data.relationship
  );
  res.status(201).json(await one('SELECT * FROM contacts WHERE id=?', r.lastInsertRowid));
});

app.delete('/api/patient/contacts/:id', async (req, res) => {
  await run('DELETE FROM contacts WHERE id=? AND user_id=?', Number(req.params.id), req.user!.id);
  res.json({ ok: true });
});

app.get('/api/patient/devices', async (req, res) => {
  await ensurePatientStarterData(req.user!.id);
  res.json({ devices: await rows('SELECT * FROM devices WHERE user_id=?', req.user!.id) });
});

app.post('/api/patient/devices', async (req, res) => {
  const name = String(req.body.name || 'Health Tracker');
  const r = await run('INSERT INTO devices(user_id,name,paired) VALUES(?,?,0)', req.user!.id, name);
  res.status(201).json(await one('SELECT * FROM devices WHERE id=?', r.lastInsertRowid));
});

app.patch('/api/patient/devices/:id', async (req, res) => {
  await run(
    'UPDATE devices SET paired=? WHERE id=? AND user_id=?',
    req.body.paired ? 1 : 0,
    Number(req.params.id),
    req.user!.id
  );
  res.json({ ok: true });
});

// TODO(device): integrate Web Bluetooth API / flutter_blue_plus in the mobile app
app.post('/api/patient/devices/:id/sync', async (req, res) => {
  const existing = await one(
    'SELECT * FROM devices WHERE id=? AND user_id=?',
    Number(req.params.id),
    req.user!.id
  );
  if (!existing) return res.status(404).json({ error: 'Device not found' });
  const reading = {
    weight: 68 + Math.round(Math.random() * 15),
    water: 1700,
    systolic: 120 + Math.round(Math.random() * 15),
    diastolic: 75 + Math.round(Math.random() * 8),
    glucose: 100 + Math.round(Math.random() * 25),
    meals: 2,
    calories: 1600,
  };
  res.json({ reading });
});

app.get('/api/patient/notifications', async (req, res) =>
  res.json({
    notifications: await rows(
      'SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC',
      req.user!.id
    ),
  })
);

app.patch('/api/patient/notifications/:id', async (req, res) => {
  await run(
    'UPDATE notifications SET read=1 WHERE id=? AND user_id=?',
    Number(req.params.id),
    req.user!.id
  );
  res.json({ ok: true });
});

app.post('/api/patient/sos', async (req, res) => {
  await run('INSERT INTO sos(user_id) VALUES(?)', req.user!.id);
  await run(
    "INSERT INTO notifications(user_id,message) SELECT a.doctor_id,? FROM doctor_patient_assignments a JOIN users u ON u.id=a.doctor_id WHERE a.patient_id=? AND u.active=1",
    'SOS event recorded for assigned patient ' + req.user!.name,
    req.user!.id
  );
  res.json({
    recorded: true,
    dispatched: false,
    contacts: await rows('SELECT name,phone,relationship FROM contacts WHERE user_id=?', req.user!.id),
    message: 'The event was recorded and an in-app notice was created for assigned doctors. No SMS, phone call, or emergency service was contacted.',
  });
});

attachRoutes(app);

app.post('/api/admin/lookup', auth, roles('ADMIN'), async (req, res) => {
  const q = String(req.body.query || '');
  const fallback = {
    source: 'local',
    results: foods.filter((f: any) => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5),
  };
  if (req.body.kind === 'medicine')
    return res.json({
      data: await rxNavLookup(
        q,
        medicines.filter((m: any) => m.genericName.toLowerCase().includes(q.toLowerCase()))
      ),
    });
  if (req.body.kind === 'condition') return res.json({ data: await medlineLookup(q, fallback) });
  const [usda, off] = await Promise.all([
    usdaLookup(q, fallback),
    openFoodFactsLookup(q, fallback),
  ]);
  res.json({ usda, openFoodFacts: off, fda: await fdaLookup(q, { source: 'local' }) });
});

app.get('/api/shared/foods', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  res.json({
    foods: foods.filter((f: any) => !q || f.name.toLowerCase().includes(q)),
    disclaimer: DISCLAIMER,
  });
});

app.get('/api/shared/medicines', async (_req, res) =>
  res.json({
    medicines,
    disclaimer: DISCLAIMER,
  })
);

app.get('/api/shared/guidelines', async (_req, res) =>
  res.json({
    guidelines: (await rows('SELECT * FROM guidelines')).map((g: any) => JSON.parse(g.data)),
    disclaimer: DISCLAIMER,
  })
);

app.use(errorHandler);

app.listen(config.port, () =>
  console.log(`Nutronics API listening on http://localhost:${config.port}`)
);
// TODO(email): integrate transactional email provider
// TODO(sms): integrate Twilio / native SMS gateway
