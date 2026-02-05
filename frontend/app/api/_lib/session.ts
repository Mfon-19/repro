import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { env, requireEnv } from './env';

export type SessionData = {
  userId: string;
  provider: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, 'base64url').toString('utf-8');
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function buildToken(payload: object, secret: string, maxAgeSeconds: number) {
  const body = JSON.stringify({ ...payload, exp: Date.now() + maxAgeSeconds * 1000 });
  const encoded = base64UrlEncode(body);
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

function verifyToken(token: string, secret: string) {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) {
    return null;
  }
  const expected = sign(encoded, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as { exp?: number } & SessionData;
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSession(request: NextRequest) {
  const token = request.cookies.get(env.sessionCookieName)?.value;
  if (!token || !env.sessionSecret) {
    return null;
  }
  return verifyToken(token, env.sessionSecret) as SessionData | null;
}

export function createSessionCookie(session: SessionData, maxAgeSeconds = DEFAULT_TTL_SECONDS) {
  const secret = requireEnv(env.sessionSecret, 'SESSION_SECRET');
  return {
    name: env.sessionCookieName,
    value: buildToken(session, secret, maxAgeSeconds),
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function clearSessionCookie() {
  return {
    name: env.sessionCookieName,
    value: '',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
}
