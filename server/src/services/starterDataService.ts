import { db } from '../db/schema.js';
import { foods } from './dataService.js';

export function ensurePatientStarterData(userId: string) {
  const one = (sql: string, ...args: any[]) => db.prepare(sql).get(...args) as any;
  const run = (sql: string, ...args: any[]) => db.prepare(sql).run(...args);

  // 1. Ensure 7-day meal plan
  const mealCount = one('SELECT COUNT(*) c FROM meals WHERE user_id=?', userId)?.c || 0;
  if (mealCount === 0) {
    const addMeal = db.prepare(
      "INSERT INTO meals(user_id,day,slot,food_id,status,doctor) VALUES(?,?,?,?,'VERIFIED','Dr. Priya Menon')"
    );
    const verifiedFoods = foods.filter((f: any) => f.calories && f.calories > 0);
    const pool = verifiedFoods.length > 0 ? verifiedFoods : foods;

    for (let day = 0; day < 7; day++) {
      for (const [j, slot] of ['Breakfast', 'Lunch', 'Dinner'].entries()) {
        const food = pool[(day * 3 + j) % pool.length];
        if (food) {
          addMeal.run(userId, day, slot, food.id);
        }
      }
    }
  }

  // 2. Ensure reminders
  const reminderCount = one('SELECT COUNT(*) c FROM reminders WHERE user_id=?', userId)?.c || 0;
  if (reminderCount === 0) {
    const addReminder = db.prepare(
      'INSERT INTO reminders(user_id,label,kind,time) VALUES(?,?,?,?)'
    );
    addReminder.run(userId, 'Morning medicine', 'Medicine', '08:00');
    addReminder.run(userId, 'Drink water', 'Water', '10:30');
    addReminder.run(userId, 'Breakfast', 'Meal', '09:00');
    addReminder.run(userId, 'Evening medicine', 'Medicine', '20:00');
  }

  // 3. Ensure logs for the past 7 days + today
  const logCount = one('SELECT COUNT(*) c FROM logs WHERE user_id=?', userId)?.c || 0;
  if (logCount === 0) {
    const addLog = db.prepare(
      'INSERT INTO logs(user_id,date,adherence,weight,water,calories,systolic,diastolic,glucose,meals,symptoms) VALUES(?,?,?,?,?,?,?,?,?,?,?)'
    );
    for (let d = 7; d >= 0; d--) {
      const dt = new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);
      addLog.run(
        userId,
        dt,
        d === 0 ? 80 : 75 + ((d * 7) % 25),
        68,
        d === 0 ? 1500 : 1800 + ((d * 100) % 500),
        d === 0 ? 1650 : 1700 + ((d * 80) % 300),
        120 + (d % 6),
        78 + (d % 4),
        98 + (d % 8),
        d === 0 ? 2 : 3,
        d === 2 ? 'Mild fatigue' : ''
      );
    }
  }

  // 4. Ensure devices
  const devCount = one('SELECT COUNT(*) c FROM devices WHERE user_id=?', userId)?.c || 0;
  if (devCount === 0) {
    const addDev = db.prepare('INSERT INTO devices(user_id,name,paired) VALUES(?,?,?)');
    addDev.run(userId, 'Smart Scale', 1);
    addDev.run(userId, 'Blood Pressure Monitor', 0);
    addDev.run(userId, 'Fitness Band', 0);
  }

  // 5. Ensure emergency contacts
  const contactCount = one('SELECT COUNT(*) c FROM contacts WHERE user_id=?', userId)?.c || 0;
  if (contactCount === 0) {
    db.prepare('INSERT INTO contacts(user_id,name,phone,relationship) VALUES(?,?,?,?)').run(
      userId,
      'Family Caregiver',
      '+91 98765 43210',
      'Family'
    );
  }
}
