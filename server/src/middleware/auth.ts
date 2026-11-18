import type { Request,Response,NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { db } from '../db/schema.js';
declare global { namespace Express { interface Request { user?: {id:string;role:string;name:string} } } }
export function auth(req:Request,res:Response,next:NextFunction){try{const token=req.headers.authorization?.replace(/^Bearer /,'');if(!token)throw new Error('Sign in required');const payload=jwt.verify(token,config.jwtSecret) as {id:string};const user=db.prepare('SELECT id,role,name,active FROM users WHERE id=?').get(payload.id) as any;if(!user||!user.active)throw new Error('Account unavailable');req.user=user;next()}catch(e){res.status(401).json({error:e instanceof Error?e.message:'Unauthorized'})}}
export const roles=(...allowed:string[]) => (req:Request,res:Response,next:NextFunction)=>{if(!req.user||!allowed.includes(req.user.role))return res.status(403).json({error:'Access denied'});next()};
