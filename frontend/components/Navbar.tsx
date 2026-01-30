'use client';

import Link from 'next/link';
import AuthCTAButton from '@/components/AuthCTAButton';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)] border-b border-[var(--border)]">
      <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold tracking-tighter hover:text-[var(--accent)] transition-colors">
          [REPRO_]
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-8 text-sm">
          <Link href="#features" className="hover:text-[var(--accent)] hover:underline decoration-1 underline-offset-4">
            // FEATURES
          </Link>
          <Link href="#how-it-works" className="hover:text-[var(--accent)] hover:underline decoration-1 underline-offset-4">
            // HOW_IT_WORKS
          </Link>
          <Link href="#papers" className="hover:text-[var(--accent)] hover:underline decoration-1 underline-offset-4">
            // PAPERS
          </Link>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4">
          <AuthCTAButton className="hidden sm:block text-sm hover:text-[var(--accent)]">
            LOGIN
          </AuthCTAButton>
          <AuthCTAButton className="btn-solid text-sm py-2 px-4 border border-white">
            GET_STARTED
          </AuthCTAButton>
        </div>
      </div>
    </nav>
  );
}
