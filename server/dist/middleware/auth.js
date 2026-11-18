import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/schema.js';
export function auth(req, res, next) { try {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token)
        throw new Error('Sign in required');
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id,role,name,active FROM users WHERE id=?').get(payload.id);
    if (!user || !user.active)
        throw new Error('Account unavailable');
    req.user = user;
    next();
}
catch (e) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Unauthorized' });
} }
export const roles = (...allowed) => (req, res, next) => { if (!req.user || !allowed.includes(req.user.role))
    return res.status(403).json({ error: 'Access denied' }); next(); };
