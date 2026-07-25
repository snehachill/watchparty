'use client';

import Link from 'next/link';
import { Fraunces, Inter } from 'next/font/google';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['500'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-body' });

export default function NotFound() {
  return (
    <main
      className={`${fraunces.variable} ${inter.variable} flex min-h-screen flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-[#f2f0ea]`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8a8880" strokeWidth="1.5" className="mb-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9c0-1.5 3-1.5 3 0s-1.5 1.5-1.5 3" strokeLinecap="round" />
        <circle cx="10.5" cy="16" r="0.5" fill="#8a8880" />
      </svg>
      <h1 className="mb-1 text-lg" style={{ fontFamily: 'var(--font-display)' }}>
        This room doesn't exist
      </h1>
      <p className="mb-6 max-w-xs text-sm text-[#8a8880]">
        It may have expired or the link was mistyped.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-[#e8a33d] px-4 py-2 text-sm font-medium text-[#0b0b0d] hover:opacity-90"
      >
        Start a new room
      </Link>
    </main>
  );
}