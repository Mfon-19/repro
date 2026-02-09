'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const defaultRedirect = '/home';

type AuthCTAButtonProps = {
  children: ReactNode;
  className?: string;
  redirectPath?: string;
};

export default function AuthCTAButton({ children, className, redirectPath }: AuthCTAButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const { sessionUrl, authUrl, redirect } = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
    const target = sanitizeRedirect(redirectPath || defaultRedirect);
    const session = base ? `${base}/api/v1/session` : '/api/v1/session';
    const auth = base
      ? `${base}/auth/github?redirect=${encodeURIComponent(target)}`
      : `/auth/github?redirect=${encodeURIComponent(target)}`;
    return { sessionUrl: session, authUrl: auth, redirect: target };
  }, [redirectPath]);

  const handleClick = useCallback(async () => {
    if (pending) {
      return;
    }
    setPending(true);

    try {
      const response = await fetch(sessionUrl, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data?.authenticated) {
          router.push(redirect);
          return;
        }
      }
    } catch {
      // Ignore and fall back to OAuth flow.
    } finally {
      setPending(false);
    }

    window.location.assign(authUrl);
  }, [authUrl, pending, redirect, router, sessionUrl]);

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
    >
      {children}
    </button>
  );
}

function sanitizeRedirect(path: string) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return defaultRedirect;
  }
  return path;
}
