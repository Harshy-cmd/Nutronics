import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID, randomBytes, randomInt, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { db } from '../db/schema.js';
import { ensurePatientStarterData } from '../services/starterDataService.js';
import { auth } from '../middleware/auth.js';
import { getUnverifiedFirebaseClaims, verifyFirebaseIdToken } from '../services/firebaseToken.js';

export const authRouter = Router();

const REFRESH_COOKIE_NAME = 'nutronics_refresh';
const googleClient = new OAuth2Client(config.googleClientId);

const rows = (sql: string, ...args: any[]) => db.prepare(sql).all(...args);
const one = (sql: string, ...args: any[]) => db.prepare(sql).get(...args) as any;
const run = (sql: string, ...args: any[]) => db.prepare(sql).run(...args);

export function safeUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    age: u.age,
    conditions: JSON.parse(u.conditions || '[]'),
    settings: JSON.parse(u.settings || '{}'),
    google_id: u.google_id || null,
    auth_provider: u.auth_provider || 'local',
  };
}

function parseCookies(header?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!header) return list;
  for (const item of header.split(';')) {
    const [key, ...v] = item.trim().split('=');
    if (key) list[key] = decodeURIComponent(v.join('='));
  }
  return list;
}

function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    secure: config.nodeEnv === 'production',
    path: '/api/auth',
  });
}

// Access tokens now carry version claim v: 2 to invalidate pre-change 7-day tokens
function createAccessToken(userId: string): string {
  return jwt.sign({ id: userId, v: 2 }, config.jwtSecret, { expiresIn: '15m' });
}

async function issueRefreshToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await run(
    'INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES(?,?,?)',
    userId,
    tokenHash,
    expiresAt
  );
  return rawToken;
}

async function sendResetEmail(email: string, resetUrl: string) {
  if (config.smtpHost && config.smtpUser) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      await transporter.sendMail({
        from: config.smtpFrom,
        to: email,
        subject: 'Password Reset Request - Nutronics',
        text: `Hello,\n\nYou requested a password reset for your Nutronics account.\nClick the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 30 minutes.\nIf you did not request this, you can safely ignore this email.\n`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #193b37;">
            <h2 style="color: #167d73;">Password Reset Request</h2>
            <p>You requested a password reset for your Nutronics health companion account.</p>
            <p><a href="${resetUrl}" style="display: inline-block; background: #167d73; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset My Password</a></p>
            <p style="font-size: 12px; color: #758985;">This link will expire in 30 minutes. If you did not request this, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Failed to send reset email via SMTP:', (err as Error).message);
    }
  } else if (config.nodeEnv !== 'production') {
    // Dev console fallback strictly disabled in production
    console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
  }
}

async function sendLoginOtpEmail(email: string, code: string) {
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    throw new Error('Email OTP is not configured');
  }
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  await transporter.sendMail({
    from: config.smtpFrom,
    to: email,
    subject: 'Your Nutronics sign-in code',
    text: `Your Nutronics sign-in code is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this email.`,
    html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;color:#193b37"><h2 style="color:#167d73">Your sign-in code</h2><p>Enter this code to sign in to Nutronics:</p><p style="font-size:28px;font-weight:700;letter-spacing:8px">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
  });
}

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many code requests. Try again in 15 minutes.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
});

const staffRoleSchema = z.enum(['DOCTOR', 'ADMIN']);
const isProductionDemoEmail = (email: string) =>
  config.nodeEnv === 'production' && DEMO_EMAILS.includes(email);

function codeHash(userId: string, code: string) {
  return createHmac('sha256', config.jwtSecret).update(`${userId}:${code}`).digest('hex');
}

async function authenticateUser(user: any, res: Response) {
  const accessToken = createAccessToken(user.id);
  const refreshToken = await issueRefreshToken(user.id);
  setRefreshTokenCookie(res, refreshToken);
  res.json({ token: accessToken, user: safeUser(user) });
}

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' },
});

const DEMO_EMAILS = [
  'patient@nutronics.org',
  'doctor@nutronics.org',
  'admin@nutronics.org',
];

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req: Request, res: Response) => {
  const parsed = z
    .object({
      email: z.string().trim().email('Enter a valid email address'),
      password: z.string().min(1, 'Password is required'),
      portalRole: staffRoleSchema.optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid email and password' });
  }

  const emailLower = parsed.data.email.toLowerCase();

  // Reject demo accounts in production
  if (isProductionDemoEmail(emailLower)) {
    return res.status(403).json({ error: 'Demo accounts are disabled in production' });
  }

  const user = await one('SELECT * FROM users WHERE email=?', emailLower);
  if (parsed.data.portalRole && user?.role !== parsed.data.portalRole) {
    return res.status(403).json({ error: 'This account does not have access to that portal.' });
  }

  // Safe password comparison (handles Google-only users with empty/dummy password safely without crash)
  let passwordValid = false;
  try {
    passwordValid =
      !!user && !!user.password && bcrypt.compareSync(parsed.data.password, user.password);
  } catch {
    passwordValid = false;
  }

  if (!user || !user.active || !passwordValid) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }

  await authenticateUser(user, res);
});

// POST /api/auth/otp/request — only active, already-provisioned staff accounts can request a code.
authRouter.post('/otp/request', otpRequestLimiter, async (req: Request, res: Response) => {
  const parsed = z.object({
    email: z.string().trim().email(),
    portalRole: staffRoleSchema,
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return res.status(503).json({ error: 'Email code sign-in is not configured yet.' });
  }

  const email = parsed.data.email.toLowerCase();
  const genericResponse = { message: 'If an eligible account exists, a sign-in code has been sent.' };
  if (isProductionDemoEmail(email)) return res.json(genericResponse);
  const user = await one('SELECT id,email,role,active FROM users WHERE email=?', email);
  if (!user || !user.active || user.role !== parsed.data.portalRole) return res.json(genericResponse);

  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await run('UPDATE email_login_otps SET used=1 WHERE user_id=? AND used=0', user.id);
  await run(
    'INSERT INTO email_login_otps(user_id,code_hash,expires_at) VALUES(?,?,?)',
    user.id,
    codeHash(user.id, code),
    expiresAt,
  );
  try {
    await sendLoginOtpEmail(user.email, code);
  } catch (error) {
    await run('UPDATE email_login_otps SET used=1 WHERE user_id=? AND used=0', user.id);
    console.error('Failed to send staff login OTP:', (error as Error).message);
    return res.status(503).json({ error: 'Could not send a sign-in code. Try again later.' });
  }
  return res.json(genericResponse);
});

// POST /api/auth/otp/verify — a code is single-use, expires after 10 minutes, and allows 5 attempts.
authRouter.post('/otp/verify', otpVerifyLimiter, async (req: Request, res: Response) => {
  const parsed = z.object({
    email: z.string().trim().email(),
    code: z.string().regex(/^\d{6}$/),
    portalRole: staffRoleSchema,
  }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and 6-digit code.' });

  const email = parsed.data.email.toLowerCase();
  const user = await one('SELECT * FROM users WHERE email=? AND active=1', email);
  if (!user || user.role !== parsed.data.portalRole || isProductionDemoEmail(email)) {
    return res.status(401).json({ error: 'The code is invalid or expired.' });
  }
  const otp = await one(
    'SELECT * FROM email_login_otps WHERE user_id=? AND used=0 ORDER BY created_at DESC LIMIT 1',
    user.id,
  );
  if (!otp || new Date(otp.expires_at).getTime() <= Date.now() || otp.attempts >= 5) {
    if (otp && !otp.used) await run('UPDATE email_login_otps SET used=1 WHERE id=?', otp.id);
    return res.status(401).json({ error: 'The code is invalid or expired.' });
  }
  const expected = Buffer.from(otp.code_hash, 'hex');
  const supplied = Buffer.from(codeHash(user.id, parsed.data.code), 'hex');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    await run('UPDATE email_login_otps SET attempts=attempts+1, used=CASE WHEN attempts+1>=5 THEN 1 ELSE used END WHERE id=? AND used=0', otp.id);
    return res.status(401).json({ error: 'The code is invalid or expired.' });
  }
  const consumed = await run('UPDATE email_login_otps SET used=1 WHERE id=? AND used=0', otp.id);
  if (!consumed.changes) return res.status(401).json({ error: 'The code is invalid or expired.' });
  await authenticateUser(user, res);
});

// POST /api/auth/register
authRouter.post('/register', registerLimiter, async (req: Request, res: Response) => {
  const parsed = z
    .object({
      name: z.string().trim().min(2, 'Name must be at least 2 characters'),
      email: z.string().trim().email('Enter a valid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      age: z.coerce.number().int().min(18).max(120).optional().default(30),
      conditions: z.array(z.string()).optional().default([]),
      privacyConsent: z.literal(true, { errorMap: () => ({ message: 'Privacy notice consent is required' }) }),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Please check your registration details' });
  }

  const emailLower = parsed.data.email.toLowerCase();

  // Check existing user to avoid exposing detailed errors
  const existing = await one('SELECT id FROM users WHERE email=?', emailLower);
  if (existing) {
    return res.status(400).json({
      error: 'Unable to register with that email. If you already have an account, please sign in.',
    });
  }

  const id = `user-${randomUUID()}`;
  try {
    await run(
      'INSERT INTO users(id, email, password, name, role, age, conditions, auth_provider, privacy_consented_at) VALUES(?,?,?,?,?,?,?,? ,NOW())',
      id,
      emailLower,
      bcrypt.hashSync(parsed.data.password, 10),
      parsed.data.name,
      'PATIENT', // Role is strictly PATIENT for public registration
      parsed.data.age,
      JSON.stringify(parsed.data.conditions),
      'local'
    );

    const user = await one('SELECT * FROM users WHERE id=?', id);
    await ensurePatientStarterData(id);
    const accessToken = createAccessToken(id);
    const refreshToken = await issueRefreshToken(id);
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      token: accessToken,
      user: safeUser(user),
    });
  } catch {
    res.status(400).json({
      error: 'Unable to complete registration. Please check your details and try again.',
    });
  }
});

// POST /api/auth/google
authRouter.post('/google', async (req: Request, res: Response) => {
  const parsed = z
    .object({
      credential: z.string().min(1, 'Google credential token is required'),
      portalRole: staffRoleSchema.optional(),
      privacyConsent: z.boolean().optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Google credential token is required' });
  }

  const unverifiedFirebaseClaims = getUnverifiedFirebaseClaims(parsed.data.credential);
  let payload: any;
  let firebaseIdentity = false;
  if (
    config.firebaseProjectId &&
    unverifiedFirebaseClaims?.iss === `https://securetoken.google.com/${config.firebaseProjectId}`
  ) {
    try {
      payload = await verifyFirebaseIdToken(parsed.data.credential, config.firebaseProjectId);
      firebaseIdentity = true;
    } catch {
      return res.status(401).json({ error: 'Invalid Firebase authentication token' });
    }
  } else {
    if (!config.googleClientId) {
      return res.status(503).json({ error: 'Google sign-in is not configured on this server' });
    }
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: parsed.data.credential,
        audience: config.googleClientId,
      });
    } catch {
      return res.status(401).json({ error: 'Invalid Google authentication token' });
    }
    payload = ticket.getPayload();
  }

  // Strictly enforce email_verified is true
  if (!payload || !payload.email || payload.email_verified !== true) {
    return res.status(401).json({ error: 'Sign-in account email is not verified' });
  }

  const emailLower = payload.email.toLowerCase();
  let user = await one('SELECT * FROM users WHERE email=?', emailLower);
  if (isProductionDemoEmail(emailLower)) {
    return res.status(403).json({ error: 'Demo accounts are disabled in production.' });
  }

  if (user) {
    if (!user.active) {
      return res.status(401).json({ error: 'Account unavailable or deactivated' });
    }
    if (user.role === 'DOCTOR' || user.role === 'ADMIN') {
      if (!parsed.data.portalRole || parsed.data.portalRole !== user.role) {
        return res.status(403).json({ error: 'Use the matching staff portal for this account.' });
      }
      if (!firebaseIdentity && user.google_id && user.google_id !== payload.sub) {
        return res.status(403).json({ error: 'This Google account is not linked to the staff account.' });
      }
    } else if (parsed.data.portalRole) {
      return res.status(403).json({ error: 'This account does not have access to that portal.' });
    }
    // Link google_id if not linked yet
    if (!firebaseIdentity && !user.google_id) {
      await run(
        'UPDATE users SET google_id=?, auth_provider=CASE WHEN auth_provider="local" THEN "google" ELSE auth_provider END WHERE id=?',
        payload.sub,
        user.id
      );
      user = await one('SELECT * FROM users WHERE id=?', user.id);
    } else if (firebaseIdentity && user.auth_provider === 'local') {
      await run('UPDATE users SET auth_provider=? WHERE id=?', 'firebase', user.id);
      user = await one('SELECT * FROM users WHERE id=?', user.id);
    }
  } else {
    if (parsed.data.portalRole) {
      return res.status(403).json({ error: 'Staff accounts must be provisioned before Google sign-in.' });
    }
    if (parsed.data.privacyConsent !== true) return res.status(400).json({ error: 'Please accept the privacy notice before creating an account.' });
    // New Google users are ALWAYS created with PATIENT role
    const id = `user-${randomUUID()}`;
    const dummyPasswordHash = bcrypt.hashSync(randomUUID(), 10);
    const name = payload.name || payload.email.split('@')[0];

    await run(
      'INSERT INTO users(id, email, password, name, role, age, conditions, google_id, auth_provider, privacy_consented_at) VALUES(?,?,?,?,?,?,?,?,?,NOW())',
      id,
      emailLower,
      dummyPasswordHash,
      name,
      'PATIENT',
      null,
      '[]',
      firebaseIdentity ? null : payload.sub,
      firebaseIdentity ? 'firebase' : 'google'
    );
    user = await one('SELECT * FROM users WHERE id=?', id);
    await ensurePatientStarterData(id);
  }

  if (!firebaseIdentity && (user.role === 'DOCTOR' || user.role === 'ADMIN') && !user.google_id) {
    await run(
      `UPDATE users SET google_id=?, auth_provider=CASE WHEN auth_provider='local' THEN 'google' ELSE auth_provider END WHERE id=?`,
      payload.sub,
      user.id,
    );
    user = await one('SELECT * FROM users WHERE id=?', user.id);
  }

  await authenticateUser(user, res);
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[REFRESH_COOKIE_NAME];

  if (!rawToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const record = await one('SELECT * FROM refresh_tokens WHERE token_hash=?', tokenHash);

  const GRACE_WINDOW_MS = 10 * 1000; // 10-second grace window for concurrent/in-flight requests

  if (!record || record.revoked) {
    if (record?.revoked) {
      const isWithinGrace =
        record.revoked_at &&
        Date.now() - new Date(record.revoked_at).getTime() < GRACE_WINDOW_MS;

      if (isWithinGrace) {
        // Just rotated within the grace window: issue a valid access token without revoking
        const user = await one('SELECT * FROM users WHERE id=? AND active=1', record.user_id);
        if (user) {
          const accessToken = createAccessToken(user.id);
          return res.json({
            token: accessToken,
            user: safeUser(user),
          });
        }
      }

      // Outside grace window: genuine reuse attempt -> revoke ALL refresh tokens for this user
      await run('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', record.user_id);
    }
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: 'Invalid or revoked refresh token' });
  }

  if (new Date(record.expires_at) < new Date()) {
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: 'Refresh token has expired' });
  }

  const user = await one('SELECT * FROM users WHERE id=? AND active=1', record.user_id);
  if (!user) {
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: 'Account unavailable or deactivated' });
  }

  // Rotate refresh token: record revocation timestamp for grace window
  const nowIso = new Date().toISOString();
  await run('UPDATE refresh_tokens SET revoked=1, revoked_at=? WHERE id=?', nowIso, record.id);
  const newRefreshToken = await issueRefreshToken(user.id);
  setRefreshTokenCookie(res, newRefreshToken);

  const newAccessToken = createAccessToken(user.id);
  res.json({
    token: newAccessToken,
    user: safeUser(user),
  });
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie);
  const rawToken = cookies[REFRESH_COOKIE_NAME];

  if (rawToken) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await run('UPDATE refresh_tokens SET revoked=1 WHERE token_hash=?', tokenHash);
  }

  clearRefreshTokenCookie(res);
  res.json({ ok: true });
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', forgotPasswordLimiter, async (req: Request, res: Response) => {
  const parsed = z
    .object({
      email: z.string().trim().email('Enter a valid email address'),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const emailLower = parsed.data.email.toLowerCase();
  const genericResponse = {
    message: 'If an account exists with that email, password reset instructions have been sent.',
  };

  const user = await one('SELECT * FROM users WHERE email=? AND active=1', emailLower);
  if (!user) {
    // Always return generic response to prevent user enumeration
    return res.json(genericResponse);
  }

  // Invalidate older unused reset tokens for this user before issuing a new one
  await run('UPDATE password_reset_tokens SET used=1 WHERE user_id=? AND used=0', user.id);

  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

  await run(
    'INSERT INTO password_reset_tokens(user_id, token_hash, expires_at) VALUES(?,?,?)',
    user.id,
    tokenHash,
    expiresAt
  );

  const resetUrl = `${config.clientOrigin}/auth/reset-password?token=${rawToken}`;
  await sendResetEmail(user.email, resetUrl);

  res.json(genericResponse);
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', resetPasswordLimiter, async (req: Request, res: Response) => {
  const parsed = z
    .object({
      token: z.string().min(1, 'Reset token is required'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Please enter a valid password of at least 8 characters and provide a reset token.',
    });
  }

  const tokenHash = createHash('sha256').update(parsed.data.token).digest('hex');
  const record = await one('SELECT * FROM password_reset_tokens WHERE token_hash=?', tokenHash);

  if (!record || record.used === 1) {
    return res.status(400).json({
      error: 'Invalid or already used password reset link. Please request a new one.',
    });
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({
      error: 'Password reset link has expired. Please request a new one.',
    });
  }

  // Mark token used
  await run('UPDATE password_reset_tokens SET used=1 WHERE id=?', record.id);

  // Update user password
  const newHash = bcrypt.hashSync(parsed.data.password, 10);
  await run('UPDATE users SET password=? WHERE id=?', newHash, record.user_id);

  // Revoke all refresh tokens for security on password reset
  await run('UPDATE refresh_tokens SET revoked=1 WHERE user_id=?', record.user_id);

  res.json({
    message: 'Password has been reset successfully. Please sign in with your new password.',
  });
});

// GET /api/auth/me
authRouter.get('/me', auth, async (req: Request, res: Response) => {
  const user = await one('SELECT * FROM users WHERE id=?', req.user!.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: safeUser(user) });
});
