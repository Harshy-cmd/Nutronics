import { db } from '../db/schema.js';
import { foods } from './dataService.js';

export async function ensurePatientStarterData(userId: string) {
  const one = (sql: string, ...args: any[]) => db.prepare(sql).get(...args) as Promise<any>;
  const run = (sql: string, ...args: any[]) => db.prepare(sql).run(...args);

  const mealCount = Number((await one('SELECT COUNT(*) c FROM meals WHERE user_id=?', userId))?.c || 0);
  if (mealCount === 0) {
    const verifiedFoods = foods.filter((f: any) => f.calories && f.calories > 0);
    const pool = verifiedFoods.length > 0 ? verifiedFoods : foods;
    for (let day = 0; day < 7; day++) {
      for (const [j, slot] of ['Breakfast', 'Lunch', 'Dinner'].entries()) {
        const food = pool[(day * 3 + j) % pool.length];
        if (food) await run("INSERT INTO meals(user_id,day,slot,food_id,status,doctor) VALUES(?,?,?,?,'RULE_MATCHED',NULL)", userId, day, slot, food.id);
      }
    }
  }

  const reminderCount = Number((await one('SELECT COUNT(*) c FROM reminders WHERE user_id=?', userId))?.c || 0);
  if (reminderCount === 0) {
    for (const [label, kind, time] of [
      ['Morning medicine', 'Medicine', '08:00'], ['Drink water', 'Water', '10:30'],
      ['Breakfast', 'Meal', '09:00'], ['Evening medicine', 'Medicine', '20:00'],
    ]) await run('INSERT INTO reminders(user_id,label,kind,time) VALUES(?,?,?,?)', userId, label, kind, time);
  }

  const logCount = Number((await one('SELECT COUNT(*) c FROM logs WHERE user_id=?', userId))?.c || 0);
  if (logCount === 0) {
    for (let d = 7; d >= 0; d--) {
      const dt = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      await run('INSERT INTO logs(user_id,date,adherence,weight,water,calories,systolic,diastolic,glucose,meals,symptoms) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        userId, dt, d === 0 ? 80 : 75 + ((d * 7) % 25), 68,
        d === 0 ? 1500 : 1800 + ((d * 100) % 500), d === 0 ? 1650 : 1700 + ((d * 80) % 300),
        120 + (d % 6), 78 + (d % 4), 98 + (d % 8), d === 0 ? 2 : 3, d === 2 ? 'Mild fatigue' : '');
    }
  }

  const deviceCount = Number((await one('SELECT COUNT(*) c FROM devices WHERE user_id=?', userId))?.c || 0);
  if (deviceCount === 0) for (const [name, paired] of [['Smart Scale', 1], ['Blood Pressure Monitor', 0], ['Fitness Band', 0]])
    await run('INSERT INTO devices(user_id,name,paired) VALUES(?,?,?)', userId, name, paired);

  const contactCount = Number((await one('SELECT COUNT(*) c FROM contacts WHERE user_id=?', userId))?.c || 0);
  if (contactCount === 0) await run('INSERT INTO contacts(user_id,name,phone,relationship) VALUES(?,?,?,?)', userId, 'Family Caregiver', '+91 98765 43210', 'Family');
}
