import Link from 'next/link';

// No next/font import here on purpose — this page is statically prerendered
// at build time, and font loading is already handled once, globally, by
// app/layout.js. Duplicating a next/font call inside a 'use client'
// component on this specific route was causing a build-time prerender
// crash ("Cannot read properties of null (reading 'useContext')").
// Fonts still apply here via the CSS variables set on <html>/<body> in the
// root layout, using Tailwind's font-* utility classes below instead of a
// second font instance.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0d] px-6 text-center text-[#f2f0ea]">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8a8880" strokeWidth="1.5" className="mb-4">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9c0-1.5 3-1.5 3 0s-1.5 1.5-1.5 3" strokeLinecap="round" />
        <circle cx="10.5" cy="16" r="0.5" fill="#8a8880" />
      </svg>
      <h1 className="mb-1 font-serif text-lg">This room doesn't exist</h1>
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