import crypto from 'crypto';

const RAW_SECRET = process.env.QUIZ_TOKEN_SECRET
  || (process.env.NODE_ENV === 'production' ? '' : process.env.SUPABASE_SERVICE_ROLE_KEY || '');

if (!RAW_SECRET) {
  throw new Error('Missing QUIZ_TOKEN_SECRET');
}

if (!process.env.QUIZ_TOKEN_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn('[quiz-token] Using SUPABASE_SERVICE_ROLE_KEY fallback. Set QUIZ_TOKEN_SECRET for production.');
}

const QUIZ_TOKEN_SECRET = RAW_SECRET;

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', QUIZ_TOKEN_SECRET).update(payloadB64).digest('base64url');
}

function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createQuizToken(payload) {
  const body = JSON.stringify({ ...payload, iat: Date.now() });
  const bodyB64 = base64UrlEncode(body);
  const signature = sign(bodyB64);
  return `${bodyB64}.${signature}`;
}

export function verifyQuizToken(token, { maxAgeSeconds = 0 } = {}) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [bodyB64, signature] = parts;
  if (!safeEqual(signature, sign(bodyB64))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(bodyB64));
    if (maxAgeSeconds > 0 && payload?.iat) {
      const ageSeconds = (Date.now() - Number(payload.iat)) / 1000;
      if (!Number.isFinite(ageSeconds) || ageSeconds > maxAgeSeconds) return null;
    }
    return payload;
  } catch {
    return null;
  }
}
