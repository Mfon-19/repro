import { NextResponse, type NextRequest } from 'next/server';

import { getSession } from '../../_lib/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = getSession(request);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      name: session.name || '',
      email: session.email || '',
      provider: session.provider,
      avatar_url: session.avatarUrl || '',
    },
  });
}
