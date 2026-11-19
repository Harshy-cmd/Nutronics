/// <reference path="../src/types.d.ts" />
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

async function runHttpTests() {
  console.log('--- Comprehensive HTTP Auth & Security Test Suite ---');

  const tempDbPath = path.join(os.tmpdir(), `nutronics_test_${Date.now()}.sqlite`);
  console.log(`[TEST DB] Initializing temporary database: ${tempDbPath}`);
  process.env.DATABASE_PATH = tempDbPath;

  const { config } = await import('../src/config.js');
  const { db } = await import('../src/db/schema.js');
  const { authRouter } = await import('../src/routes/auth.js');
  const { auth } = await import('../src/middleware/auth.js');

  const app = express();
  if (config.trustProxy) {
    app.set('trust proxy', config.trustProxy);
  }
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use('/api/auth', authRouter);

  // Test protected endpoint to verify auth middleware
  app.get('/api/test-protected', auth, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  const port = 4006;
  const server = app.listen(port);
  const base = `http://localhost:${port}/api/auth`;

  try {
    const testEmail = `patient-${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    // TEST 1: Register
    console.log('\n[TEST 1] Register new user');
    const regRes = await fetch(`${base}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Patient',
        email: testEmail,
        password: testPassword,
        age: 40,
        conditions: ['HYPERTENSION'],
      }),
    });
    if (regRes.status !== 201) throw new Error(`Register failed: ${await regRes.text()}`);
    const regData = await regRes.json();
    console.log('✓ Successfully registered PATIENT user');

    // TEST 2: Exact Set-Cookie Header Verification
    console.log('\n[TEST 2] Exact Set-Cookie header check');
    const setCookie = regRes.headers.get('set-cookie');
    if (!setCookie) throw new Error('Missing Set-Cookie header');
    console.log('   Received Set-Cookie:', setCookie);
    if (!setCookie.includes('HttpOnly') && !setCookie.includes('httponly')) {
      throw new Error('Set-Cookie must contain HttpOnly');
    }
    if (!setCookie.includes('SameSite=Lax') && !setCookie.includes('samesite=lax')) {
      throw new Error('Set-Cookie must contain SameSite=Lax');
    }
    if (!setCookie.includes('Path=/api/auth')) {
      throw new Error('Set-Cookie must contain Path=/api/auth');
    }
    console.log('✓ Set-Cookie has HttpOnly, SameSite=Lax, and Path=/api/auth');

    const initialRefreshToken = setCookie.match(/nutronics_refresh=([^;]+)/)![1];

    // TEST 3: Token Version Claim Check (v: 2)
    console.log('\n[TEST 3] Token Version Check (old-style token rejected, new accepted)');
    const oldStyleToken = jwt.sign({ id: regData.user.id }, config.jwtSecret, { expiresIn: '7d' });
    const oldRes = await fetch(`http://localhost:${port}/api/test-protected`, {
      headers: { Authorization: `Bearer ${oldStyleToken}` },
    });
    if (oldRes.status !== 401) {
      throw new Error(`Expected 401 for old token without v: 2 claim, got ${oldRes.status}`);
    }
    console.log('✓ Old-style token without v: 2 claim rejected with 401');

    const newRes = await fetch(`http://localhost:${port}/api/test-protected`, {
      headers: { Authorization: `Bearer ${regData.token}` },
    });
    if (newRes.status !== 200) {
      throw new Error(`Expected 200 for new token with v: 2 claim, got ${newRes.status}`);
    }
    console.log('✓ New token with v: 2 claim accepted with 200');

    // TEST 4: Token Rotation & Grace Window
    console.log('\n[TEST 4] Token rotation and server-side grace window');
    const rotRes1 = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { Cookie: `nutronics_refresh=${initialRefreshToken}` },
    });
    if (rotRes1.status !== 200) throw new Error('Rotation 1 failed');
    const rotatedCookie = rotRes1.headers.get('set-cookie')!.match(/nutronics_refresh=([^;]+)/)![1];

    // Present initialRefreshToken again immediately (within 10s grace window)
    const graceRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { Cookie: `nutronics_refresh=${initialRefreshToken}` },
    });
    if (graceRes.status !== 200) {
      throw new Error(`Expected 200 within grace window, got ${graceRes.status}`);
    }
    console.log('✓ Just-rotated token accepted within 10s grace window without revoking user session');

    // TEST 5: Refresh Token Reuse Detection (outside grace window)
    console.log('\n[TEST 5] Token reuse outside grace window revokes ALL user tokens');
    // Set revoked_at to 20 seconds ago to simulate request arriving after grace window
    const pastTime = new Date(Date.now() - 20000).toISOString();
    const initHash = createHash('sha256').update(initialRefreshToken).digest('hex');
    db.prepare('UPDATE refresh_tokens SET revoked_at=? WHERE token_hash=?').run(pastTime, initHash);

    const attackRes = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { Cookie: `nutronics_refresh=${initialRefreshToken}` },
    });
    if (attackRes.status !== 401) throw new Error('Expected 401 for token reuse outside grace window');

    // Verify active token was revoked
    const activeCheck = await fetch(`${base}/refresh`, {
      method: 'POST',
      headers: { Cookie: `nutronics_refresh=${rotatedCookie}` },
    });
    if (activeCheck.status !== 401) throw new Error('Expected active token to be revoked following reuse attack');
    console.log('✓ Token reuse outside grace window revoked ALL user refresh tokens');

    // TEST 6: Single-Flight Refresh with 5 Parallel Requests
    console.log('\n[TEST 6] Single-flight refresh: 5 parallel requests with expired access token');
    const freshLogin = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const freshLoginCookie = freshLogin.headers.get('set-cookie')!.match(/nutronics_refresh=([^;]+)/)![1];

    const expiredToken = jwt.sign(
      { id: regData.user.id, v: 2 },
      config.jwtSecret,
      { expiresIn: '-5m' }
    );

    // Single-flight client simulation with shared in-flight refreshPromise & token store
    let clientInFlightRefresh: Promise<string> | null = null;
    let refreshCallCount = 0;
    let clientStoredToken = expiredToken;

    async function getClientRefreshedToken(): Promise<string> {
      if (!clientInFlightRefresh) {
        clientInFlightRefresh = (async () => {
          refreshCallCount++;
          const refRes = await fetch(`${base}/refresh`, {
            method: 'POST',
            headers: { Cookie: `nutronics_refresh=${freshLoginCookie}` },
          });
          const data = await refRes.json();
          clientStoredToken = data.token;
          return data.token;
        })().finally(() => {
          clientInFlightRefresh = null;
        });
      }
      return clientInFlightRefresh;
    }

    async function clientApiRequest(endpoint: string, initialToken: string): Promise<any> {
      const res = await fetch(`http://localhost:${port}${endpoint}`, {
        headers: { Authorization: `Bearer ${initialToken}` },
      });

      if (res.status === 401) {
        const newToken = clientStoredToken !== initialToken
          ? clientStoredToken
          : await getClientRefreshedToken();

        const retryRes = await fetch(`http://localhost:${port}${endpoint}`, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        return retryRes.json();
      }
      return res.json();
    }

    // Fire 5 requests in parallel with the expired token
    const parallelResults = await Promise.all([
      clientApiRequest('/api/test-protected', expiredToken),
      clientApiRequest('/api/test-protected', expiredToken),
      clientApiRequest('/api/test-protected', expiredToken),
      clientApiRequest('/api/test-protected', expiredToken),
      clientApiRequest('/api/test-protected', expiredToken),
    ]);

    for (const r of parallelResults) {
      if (!r.ok || r.user.id !== regData.user.id) {
        throw new Error('Parallel request failed to stay signed in');
      }
    }
    if (refreshCallCount !== 1) {
      throw new Error(`Expected exactly 1 refresh call for 5 parallel requests, got ${refreshCallCount}`);
    }
    console.log(`✓ 5 parallel requests shared exactly 1 refresh call; all 5 stayed signed in`);

    // TEST 7: Google-only Account Password Login
    console.log('\n[TEST 7] Password login for Google-only account (no valid local password)');
    const googleUserEmail = `googleonly-${Date.now()}@example.com`;
    const googleUserId = `user-google-${Date.now()}`;
    db.prepare(`
      INSERT INTO users(id, email, password, name, role, auth_provider, google_id)
      VALUES(?,?,?,?,?,?,?)
    `).run(googleUserId, googleUserEmail, bcrypt.hashSync(randomBytes(16).toString('hex'), 10), 'Google Only', 'PATIENT', 'google', 'google-sub-123');

    const googlePassLogin = await fetch(`${base}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: googleUserEmail, password: 'AnyPasswordAttempt123!' }),
    });
    if (googlePassLogin.status !== 401) {
      throw new Error(`Expected 401 for Google-only password login, got ${googlePassLogin.status}`);
    }
    const googlePassData = await googlePassLogin.json();
    if (googlePassData.error !== 'Email or password is incorrect') {
      throw new Error(`Expected generic error message, got: ${googlePassData.error}`);
    }
    console.log('✓ Google-only account password login safely returns generic 401 without crashing');

    // TEST 8: New Forgot-Password Request Invalidates Older Unused Tokens
    console.log('\n[TEST 8] New forgot-password request invalidates older unused reset tokens');
    // Request reset token 1
    await fetch(`${base}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const token1Row: any = db.prepare('SELECT * FROM password_reset_tokens WHERE user_id=? ORDER BY id DESC LIMIT 1').get(regData.user.id);

    // Request reset token 2
    await fetch(`${base}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const token1After: any = db.prepare('SELECT * FROM password_reset_tokens WHERE id=?').get(token1Row.id);
    if (token1After.used !== 1) {
      throw new Error('Previous unused reset token was NOT invalidated by the new request!');
    }
    console.log('✓ First reset token was marked used (invalidated) when second was requested');

    // TEST 9: Expired Reset Token Check
    console.log('\n[TEST 9] Expired reset token is rejected');
    const expiredRawToken = 'raw-expired-reset-token-xyz';
    const expiredTokenHash = createHash('sha256').update(expiredRawToken).digest('hex');
    const pastExpires = new Date(Date.now() - 60000).toISOString(); // Expired 1 min ago
    db.prepare('INSERT INTO password_reset_tokens(user_id, token_hash, expires_at, used) VALUES(?,?,?,0)').run(regData.user.id, expiredTokenHash, pastExpires);

    const expiredResetRes = await fetch(`${base}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: expiredRawToken, password: 'NewSecurePassword123!' }),
    });
    if (expiredResetRes.status !== 400) {
      throw new Error(`Expected 400 for expired reset token, got ${expiredResetRes.status}`);
    }
    const expiredData = await expiredResetRes.json();
    if (!expiredData.error.includes('expired')) {
      throw new Error(`Expected expiration error message, got: ${expiredData.error}`);
    }
    console.log('✓ Expired reset token rejected with 400 ("Password reset link has expired")');

    // TEST 10: Reset Token Reuse
    console.log('\n[TEST 10] Reset token reuse is rejected (single-use only)');
    const validRawReset = 'raw-valid-reset-token-123';
    const validResetHash = createHash('sha256').update(validRawReset).digest('hex');
    const futureExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO password_reset_tokens(user_id, token_hash, expires_at, used) VALUES(?,?,?,0)').run(regData.user.id, validResetHash, futureExpires);

    // Use it once
    const firstUseRes = await fetch(`${base}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: validRawReset, password: 'BrandNewPassword123!' }),
    });
    if (firstUseRes.status !== 200) throw new Error('First reset attempt failed');
    console.log('   First reset succeeded');

    // Attempt to reuse it
    const reuseAttemptRes = await fetch(`${base}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: validRawReset, password: 'AnotherPassword456!' }),
    });
    if (reuseAttemptRes.status !== 400) {
      throw new Error(`Expected 400 for reset token reuse, got ${reuseAttemptRes.status}`);
    }
    console.log('✓ Reused reset token rejected with 400 ("Invalid or already used")');

    console.log('\n======================================================');
    console.log('✓ ALL 10 COMPREHENSIVE TESTS PASSED WITH 100% SUCCESS');
    console.log('======================================================\n');
  } finally {
    server.close();
    try {
      const { db } = await import('../src/db/schema.js');
      db.close();
    } catch {}
    try {
      fs.unlinkSync(tempDbPath);
      console.log(`[TEST DB] Cleaned up temporary database: ${tempDbPath}`);
    } catch {}
  }
}

runHttpTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
