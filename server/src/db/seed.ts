import { faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { db, initializeDatabase } from "./schema.js";
import { config } from "../config.js";
import "./generateDatasets.js";
async function seed() {
await initializeDatabase();
faker.seed(20250303);
const dataDir = config.dataPath;
const read = (name: string) =>
  JSON.parse(
    fs.readFileSync(path.join(dataDir, `${name}.json`), "utf8"),
  ) as any[];
const foods = read("foods");
const accounts = [
  [
    "patient-1",
    "patient@nutronics.org",
    "Aarav Sharma",
    "PATIENT",
    68,
    ["DIABETES", "HYPERTENSION"],
  ],
  [
    "patient-2",
    "meera@nutronics.org",
    "Meera Nair",
    "PATIENT",
    72,
    ["CKD", "HYPERTENSION"],
  ],
  [
    "patient-3",
    "kabir@nutronics.org",
    "Kabir Verma",
    "PATIENT",
    58,
    ["HEART_DISEASE", "OBESITY"],
  ],
  ["doctor-1", "doctor@nutronics.org", "Dr. Priya Menon", "DOCTOR", null, []],
  ["admin-1", "admin@nutronics.org", "Vikram Desai", "ADMIN", null, []],
] as const;
const insertUser = db.prepare(
  "INSERT OR IGNORE INTO users(id,email,password,name,role,age,conditions) VALUES(?,?,?,?,?,?,?)",
);
for (const [id, email, name, role, age, conditions] of accounts)
  await insertUser.run(
    id,
    email,
    bcrypt.hashSync("password123", 10),
    name,
    role,
    age,
    JSON.stringify(conditions),
  );
const insertGuideline = db.prepare(
  "INSERT OR REPLACE INTO guidelines(condition,data) VALUES(?,?)",
);
for (const g of read("guidelines"))
  await insertGuideline.run(g.condition, JSON.stringify(g));
const logCount = db.prepare("SELECT COUNT(*) n FROM logs WHERE user_id=?");
const addLog = db.prepare(
  "INSERT INTO logs(user_id,date,adherence,weight,water,calories,systolic,diastolic,glucose,meals,symptoms) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
);
for (let p = 0; p < 3; p++) {
  const uid = `patient-${p + 1}`;
  if ((await logCount.get(uid))!.n === 0)
    for (let d = 29; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      await addLog.run(
        uid,
        date.toISOString().slice(0, 10),
        65 + ((d * 7 + p * 11) % 35),
        72 + p * 8 - d * 0.04,
        1400 + ((d * 47) % 900),
        1500 + ((d * 29) % 800),
        118 + ((d * 3 + p * 5) % 28),
        72 + ((d * 2) % 15),
        90 + ((d * 5 + p * 8) % 60),
        2 + (d % 3),
        d % 11 === 0 ? "Tired" : "",
      );
    }
}
const addReminder = db.prepare(
  "INSERT INTO reminders(user_id,label,kind,time) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM reminders WHERE user_id=? AND label=?)",
);
for (const [uid] of accounts.slice(0, 3))
  for (const [label, kind, time] of [
    ["Morning medicine", "Medicine", "08:00"],
    ["Drink water", "Water", "10:30"],
    ["Breakfast", "Meal", "09:00"],
    ["Evening medicine", "Medicine", "20:00"],
  ] as const)
    await addReminder.run(uid, label, kind, time, uid, label);
const addMeal = db.prepare(
  "INSERT INTO meals(user_id,day,slot,food_id,status,doctor) SELECT ?,?,?,? ,'VERIFIED','Dr. Priya Menon' WHERE NOT EXISTS (SELECT 1 FROM meals WHERE user_id=? AND day=? AND slot=?)",
);
for (let p = 0; p < 3; p++)
  for (let day = 0; day < 7; day++)
    for (const [j, slot] of ["Breakfast", "Lunch", "Dinner"].entries())
      await addMeal.run(
        `patient-${p + 1}`,
        day,
        slot,
        foods[(p * 7 + day * 3 + j) % foods.length].id,
        `patient-${p + 1}`,
        day,
        slot,
      );
for (const [condition, data] of [
  ["aiEngineEnabled", "true"],
  ["externalApisEnabled", "false"],
  ["autoVerifyGuidelineMatches", "true"],
  ["sosCountdownSeconds", "5"],
  ["maintenanceBanner", ""],
] as const)
  await db.prepare("INSERT OR IGNORE INTO config(key,value) VALUES(?,?)").run(
    condition,
    data,
  );
const contactCount = db.prepare(
  "SELECT COUNT(*) n FROM contacts WHERE user_id=?",
);
const addContact = db.prepare(
  "INSERT INTO contacts(user_id,name,phone,relationship) VALUES(?,?,?,?)",
);
for (const [uid, name] of [
  ["patient-1", "Aarav Sharma"],
  ["patient-2", "Meera Nair"],
  ["patient-3", "Kabir Verma"],
])
  if ((await contactCount.get(uid))!.n === 0)
    await addContact.run(
      uid,
      `${name.split(" ")[0]} Family`,
      "+91 90000 00000",
      "Family",
    );
const device = db.prepare(
  "INSERT INTO devices(user_id,name,paired) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM devices WHERE user_id=? AND name=?)",
);
for (const uid of ["patient-1", "patient-2", "patient-3"])
  for (const [i, name] of [
    "Smart Scale",
    "Blood Pressure Monitor",
    "Fitness Band",
  ].entries())
    await device.run(uid, name, i === 0 ? 1 : 0, uid, name);
fs.mkdirSync(config.uploadsPath, { recursive: true });
for (const [uid, name] of [
  ["patient-1", "Aarav Sharma"],
  ["patient-2", "Meera Nair"],
  ["patient-3", "Kabir Verma"],
]) {
  const file = `demo-${uid}.txt`;
  fs.writeFileSync(
    path.resolve(config.uploadsPath, file),
    `Nutronics sample health record for ${name}. Synthetic demo content.`,
  );
  await db.prepare(
    "INSERT INTO records(user_id,name,category,file_path) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM records WHERE user_id=? AND name=?)",
  ).run(
    uid,
    "Sample Health Summary",
    "Lab report",
    file,
    uid,
    "Sample Health Summary",
  );
}
for (const [uid, message] of [
  ["patient-1", "Your weekly meal plan is ready."],
  ["patient-2", "Remember to follow your clinician’s fluid guidance."],
  ["patient-3", "Your progress log is ready to update."],
])
  await db.prepare(
    "INSERT INTO notifications(user_id,message) SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM notifications WHERE user_id=? AND message=?)",
  ).run(uid, message, uid, message);
const chatCount = db.prepare("SELECT COUNT(*) n FROM chat WHERE user_id=?");
if ((await chatCount.get("patient-1"))!.n === 0) {
  await db.prepare(
    "INSERT INTO chat(user_id,question,answer,status) VALUES(?,?,?,?)",
  ).run(
    "patient-1",
    "Can I eat mango with diabetes?",
    "Mango contains natural sugar. Choose a modest portion and account for it within your personalized carbohydrate plan. Ask your clinician for an individual target.",
    "VERIFIED",
  );
  await db.prepare(
    "INSERT INTO chat(user_id,question,answer,status) VALUES(?,?,?,?)",
  ).run(
    "patient-1",
    "Can you create a very low potassium meal plan?",
    "This needs your latest kidney labs and clinician guidance. Please ask your renal care team to review a tailored plan.",
    "PENDING",
  );
}
console.log(
  "Seed complete: 5 accounts, 30 days of logs, meal plans, reminders, records, contacts, devices, and guidelines.",
);

}

await seed();
