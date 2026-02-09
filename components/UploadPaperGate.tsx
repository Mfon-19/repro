'use client';

import { useEffect, useState } from 'react';

import AuthCTAButton from '@/components/AuthCTAButton';
import UploadPaperModal from '@/components/UploadPaperModal';

type GateState = 'loading' | 'authenticated' | 'unauthenticated';

export default function UploadPaperGate() {
  const [state, setState] = useState<GateState>('loading');

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const response = await fetch('/api/v1/session', { credentials: 'include' });
        if (!active) {
          return;
        }
        if (!response.ok) {
          setState('unauthenticated');
          return;
        }
        const data = await response.json();
        setState(data?.authenticated ? 'authenticated' : 'unauthenticated');
      } catch {
        if (active) {
          setState('unauthenticated');
        }
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  if (state === 'authenticated') {
    return <UploadPaperModal />;
  }

  if (state === 'loading') {
    return (
      <button className="btn-outline text-xs px-6 py-3" disabled>
        CHECKING_SESSION...
      </button>
    );
  }

  return (
    <AuthCTAButton className="btn-solid text-xs px-6 py-3" redirectPath="/home">
      LOGIN_TO_UPLOAD
    </AuthCTAButton>
  );
}
