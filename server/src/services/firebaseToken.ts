import { createPublicKey, verify as verifySignature } from 'node:crypto';

type FirebaseJwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
type FirebaseClaims = {
  aud?: string;
  iss?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  firebase?: { sign_in_provider?: string };
};

let cachedKeys: FirebaseJwk[] = [];
let cacheExpiresAt = 0;

async function getSigningKeys(forceRefresh = false): Promise<FirebaseJwk[]> {
  if (!forceRefresh && cachedKeys.length && Date.now() < cacheExpiresAt) return cachedKeys;
  const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com', {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Could not retrieve Firebase signing keys');
  const body = await response.json() as { keys?: FirebaseJwk[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error('Firebase signing keys are unavailable');
  const maxAge = Number(/max-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 3600);
  cachedKeys = body.keys;
  cacheExpiresAt = Date.now() + Math.max(60, maxAge) * 1000;
  return cachedKeys;
}

function decodeJsonSegment<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

export function getUnverifiedFirebaseClaims(token: string): FirebaseClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 16_384) return null;
  try {
    return decodeJsonSegment<FirebaseClaims>(parts[1]);
  } catch {
    return null;
  }
}

export async function verifyFirebaseIdToken(token: string, projectId: string): Promise<FirebaseClaims> {
  const parts = token.split('.');
  if (parts.length !== 3 || token.length > 16_384) throw new Error('Malformed Firebase token');
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  const header = decodeJsonSegment<{ alg?: string; kid?: string }>(encodedHeader);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Firebase token signature');

  let keys = await getSigningKeys();
  let jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) {
    keys = await getSigningKeys(true);
    jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  }
  if (!jwk) throw new Error('Firebase token signing key was not found');

  const verified = verifySignature(
    'RSA-SHA256',
    Buffer.from(`${encodedHeader}.${encodedClaims}`),
    createPublicKey({ key: jwk, format: 'jwk' } as Parameters<typeof createPublicKey>[0]),
    Buffer.from(encodedSignature, 'base64url'),
  );
  if (!verified) throw new Error('Invalid Firebase token signature');

  const claims = decodeJsonSegment<FirebaseClaims>(encodedClaims);
  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== projectId) throw new Error('Firebase token belongs to a different project');
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid Firebase token issuer');
  if (!claims.sub || claims.sub.length > 128) throw new Error('Firebase token has no user ID');
  if (!claims.exp || claims.exp <= now || !claims.iat || claims.iat > now + 60) throw new Error('Firebase token has expired or is not yet valid');
  if (!claims.auth_time || claims.auth_time > now + 60) throw new Error('Firebase token authentication time is invalid');
  if (claims.email_verified !== true || !claims.email) throw new Error('Firebase account email is not verified');
  return claims;
}
