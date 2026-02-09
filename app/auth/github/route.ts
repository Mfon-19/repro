import { randomUUID } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '../../api/_lib/env';

export const runtime = 'nodejs';

function sanitizeRedirect(path: string | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return '/home';
  }
  return path;
}

export async function GET(request: NextRequest) {
  if (!env.githubClientId) {
    return NextResponse.json({ error: 'oauth_unavailable' }, { status: 503 });
  }

  const redirectPath = sanitizeRedirect(request.nextUrl.searchParams.get('redirect'));
  const state = randomUUID();
  const callbackUrl = env.githubCallbackUrl || `${request.nextUrl.origin}/auth/github/callback`;

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', env.githubClientId);
  authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizeUrl.searchParams.set('scope', 'read:user user:email');
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set({
    name: 'repro_oauth_state',
    value: state,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  response.cookies.set({
    name: 'repro_oauth_redirect',
    value: redirectPath,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });

  return response;
}
