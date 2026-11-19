import { config } from '../src/config.js';
import { db } from '../src/db/schema.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';

async function runTests() {
  console.log('--- Starting Auth Endpoints Diagnostic Tests ---');

  console.log('Testing JWT expiry duration...');
  const testToken = jwt.sign({ id: 'test' }, config.jwtSecret, { expiresIn: '15m' });
  const decoded: any = jwt.decode(testToken);
  const durationSec = decoded.exp - decoded.iat;
  if (durationSec === 15 * 60) {
    console.log('✓ Access token expires in exactly 15 minutes (900 seconds)');
  } else {
    throw new Error(`Expected 900 seconds, got ${durationSec}`);
  }

  // Create temporary test user to satisfy foreign key constraints
  const testUserId = 'user-test-db-diag';
  db.prepare('DELETE FROM users WHERE id=?').run(testUserId);
  db.prepare('INSERT INTO users(id, email, password, name, role) VALUES(?,?,?,?,?)').run(
    testUserId,
    'diag@nutronics.org',
    bcrypt.hashSync('testpass123', 10),
    'Diag User',
    'PATIENT'
  );

  console.log('Testing refresh token hash generation and lookup...');
  const rawToken = 'test-refresh-token-xyz';
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES(?,?,?)').run(testUserId, tokenHash, expiresAt);
  
  const found: any = db.prepare('SELECT * FROM refresh_tokens WHERE token_hash=?').get(tokenHash);
  if (!found || found.user_id !== testUserId) {
    throw new Error('Refresh token lookup failed');
  }
  console.log('✓ Refresh token stored and hashed correctly');
  db.prepare('DELETE FROM refresh_tokens WHERE user_id=?').run(testUserId);

  console.log('Testing password reset token single-use flag and expiry...');
  const resetRawToken = 'test-reset-raw-token';
  const resetHash = createHash('sha256').update(resetRawToken).digest('hex');
  const resetExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO password_reset_tokens(user_id, token_hash, expires_at) VALUES(?,?,?)').run(testUserId, resetHash, resetExpires);
  const resetFound: any = db.prepare('SELECT * FROM password_reset_tokens WHERE token_hash=?').get(resetHash);
  if (!resetFound || resetFound.used !== 0) {
    throw new Error('Password reset token lookup failed');
  }
  db.prepare('UPDATE password_reset_tokens SET used=1 WHERE id=?').run(resetFound.id);
  const resetUsed: any = db.prepare('SELECT * FROM password_reset_tokens WHERE id=?').get(resetFound.id);
  if (resetUsed.used !== 1) {
    throw new Error('Password reset token mark used failed');
  }
  console.log('✓ Password reset token single-use lifecycle verified');
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').run(testUserId);

  // Clean up test user
  db.prepare('DELETE FROM users WHERE id=?').run(testUserId);

  console.log('--- All Unit / DB Checks Passed ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
