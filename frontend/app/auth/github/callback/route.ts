import { NextResponse, type NextRequest } from 'next/server';

import { sql } from '../../../api/_lib/db';
import { env, requireEnv } from '../../../api/_lib/env';
import { createSessionCookie } from '../../../api/_lib/session';

export const runtime = 'nodejs';

type GithubUser = {
  id: number;
  name: string | null;
  login: string;
  email: string | null;
  avatar_url: string | null;
};

type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

function getRedirect(request: NextRequest) {
  const redirect = request.cookies.get('repro_oauth_redirect')?.value;
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/home';
  }
  return redirect;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const expectedState = request.cookies.get('repro_oauth_state')?.value;

  if (!state || !code || !expectedState || state !== expectedState) {
    return NextResponse.json({ error: 'invalid_state' }, { status: 400 });
  }

  const clientId = requireEnv(env.githubClientId, 'GITHUB_CLIENT_ID');
  const clientSecret = requireEnv(env.githubClientSecret, 'GITHUB_CLIENT_SECRET');
  const callbackUrl = env.githubCallbackUrl || `${request.nextUrl.origin}/auth/github/callback`;

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  const tokenData = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return NextResponse.json({ error: 'oauth_failed', message: tokenData.error || 'no access token' }, { status: 400 });
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'repro-app',
    },
  });

  if (!userResponse.ok) {
    return NextResponse.json({ error: 'github_user_failed' }, { status: 502 });
  }

  const user = (await userResponse.json()) as GithubUser;
  let email = user.email;

  if (!email) {
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'repro-app',
      },
    });
    if (emailResponse.ok) {
      const emails = (await emailResponse.json()) as GithubEmail[];
      const primary = emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified);
      email = primary?.email || null;
    }
  }

  const providerUserId = String(user.id);
  const userId = `github:${providerUserId}`;

  await sql`
    insert into users (id, provider, provider_user_id, name, email, avatar_url)
    values (${userId}, 'github', ${providerUserId}, ${user.name || user.login}, ${email}, ${user.avatar_url})
    on conflict (id)
    do update set
      name = excluded.name,
      email = excluded.email,
      avatar_url = excluded.avatar_url,
      updated_at = now()
  `;

  const sessionCookie = createSessionCookie({
    userId,
    provider: 'github',
    name: user.name || user.login,
    email,
    avatarUrl: user.avatar_url,
  });

  const response = NextResponse.redirect(new URL(getRedirect(request), request.nextUrl.origin));
  response.cookies.set(sessionCookie);
  response.cookies.set({ name: 'repro_oauth_state', value: '', path: '/', maxAge: 0 });
  response.cookies.set({ name: 'repro_oauth_redirect', value: '', path: '/', maxAge: 0 });
  return response;
}
