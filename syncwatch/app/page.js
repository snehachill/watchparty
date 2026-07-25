'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export default function LandingPage() {
  const router = useRouter();
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreateRoom(e) {
    e.preventDefault();
    setError('');

    if (!youtubeUrl.trim()) {
      setError('Paste a youtube link to get started.');
      return;
    }

    const isValidYoutube = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/.test(
      youtubeUrl.trim()
    );
    if (!isValidYoutube) {
      setError("That doesn't look like a youtube link. Try pasting the full url.");
      return;
    }

    setLoading(true);
    console.log('[CreateRoom] Starting room creation with URL:', youtubeUrl.trim());
    
    // Timeout wrapper to prevent infinite loading
    const TIMEOUT_MS = 10000; // 10 seconds
    let timeoutId;
    
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${TIMEOUT_MS}ms`));
      }, TIMEOUT_MS);
    });
    
    try {
      console.log('[CreateRoom] Initiating fetch to /api/rooms');
      const fetchStart = performance.now();
      
      const fetchPromise = fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() }),
      });
      
      // Race between fetch and timeout
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      
      clearTimeout(timeoutId);
      const fetchEnd = performance.now();
      console.log('[CreateRoom] Fetch completed in', (fetchEnd - fetchStart).toFixed(2), 'ms');
      console.log('[CreateRoom] Response status:', res.status, res.statusText);
      console.log('[CreateRoom] Response headers:', Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unknown error');
        console.error('[CreateRoom] Response not OK:', res.status, errorText);
        throw new Error(`Could not create the room. Server returned ${res.status}: ${errorText}`);
      }
      
      console.log('[CreateRoom] Parsing JSON response');
      const data = await res.json();
      console.log('[CreateRoom] Parsed response data:', data);
      
      // Runtime check for roomId
      if (!data.roomId) {
        console.error('[CreateRoom] ERROR: roomId is missing from response!', data);
        throw new Error('Server response missing roomId. Please try again.');
      }
      
      console.log('[CreateRoom] Extracted roomId:', data.roomId);
      console.log('[CreateRoom] About to navigate to /room/', data.roomId);
      
      router.push(`/room/${data.roomId}`);
      console.log('[CreateRoom] Navigation initiated');
      
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[CreateRoom] ERROR in fetch chain:', err);
      console.error('[CreateRoom] Error stack:', err.stack);
      setError(err.message || 'Failed to create room. Please try again.');
      setLoading(false);
    }
  }

  function handleJoinRoom(e) {
    e.preventDefault();
    setError('');
    const code = roomCode.trim().toLowerCase();
    if (!code) {
      setError('Enter a room code to join.');
      return;
    }
    router.push(`/room/${code}`);
  }

  return (
    <main
      className={`${fraunces.variable} ${inter.variable} ${mono.variable} relative min-h-screen overflow-hidden bg-[#0b0b0d] text-[#f2f0ea]`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Background layer 1: projector-beam glow behind the hero */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(232,163,61,0.16) 0%, rgba(232,163,61,0.05) 35%, transparent 70%)',
        }}
      />

      {/* Background layer 2: dot grid, faint synced-screens field */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: 'radial-gradient(rgba(242,240,234,0.5) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at 50% 20%, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 20%, black 0%, transparent 70%)',
        }}
      />

      {/* Background layer 3: film grain texture */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.035]">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-16 sm:pt-28">
        {/* Signature element: sync pulse */}
        <div className="relative mb-10 flex h-28 w-28 items-center justify-center">
          <span className="absolute h-28 w-28 animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full border border-[#e8a33d]/40" />
          <span className="absolute h-28 w-28 animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full border border-[#e8a33d]/40 [animation-delay:0.8s]" />
          <span className="absolute h-28 w-28 animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full border border-[#e8a33d]/40 [animation-delay:1.6s]" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#e8a33d]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0b0b0d">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#3dbfa8]/30 bg-[#3dbfa8]/10 px-3 py-1 text-xs text-[#3dbfa8]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3dbfa8]" />
          one signal, everyone in sync
        </div>

        <h1
          className="max-w-2xl text-center text-4xl leading-[1.1] text-[#f2f0ea] sm:text-5xl"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
        >
          Watch together, <em className="italic text-[#e8a33d]">frame for frame</em>
        </h1>
        <p className="mt-5 max-w-md text-center text-[15px] leading-relaxed text-[#8a8880]">
          Paste a youtube link, share the room, and everyone's playback stays locked
          together — down to the second. Live chat and webcams included.
        </p>

        {/* Create / join card */}
        <div className="mt-10 w-full max-w-md">
          <div className="mb-3 flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => { setMode('create'); setError(''); }}
              className={`flex-1 rounded-md py-2 text-sm transition-colors ${
                mode === 'create'
                  ? 'bg-[#1c1c1f] text-[#f2f0ea]'
                  : 'text-[#8a8880] hover:text-[#f2f0ea]'
              }`}
            >
              Create room
            </button>
            <button
              type="button"
              onClick={() => { setMode('join'); setError(''); }}
              className={`flex-1 rounded-md py-2 text-sm transition-colors ${
                mode === 'join'
                  ? 'bg-[#1c1c1f] text-[#f2f0ea]'
                  : 'text-[#8a8880] hover:text-[#f2f0ea]'
              }`}
            >
              Join room
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            {mode === 'create' ? (
              <form onSubmit={handleCreateRoom}>
                <label htmlFor="youtube-url" className="mb-2 block text-xs text-[#8a8880]">
                  Youtube url
                </label>
                <input
                  id="youtube-url"
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="mb-4 w-full rounded-lg border border-white/10 bg-[#0b0b0d] px-3 py-2.5 text-sm text-[#f2f0ea] placeholder:text-[#5c5a54] focus:border-[#e8a33d]/50 focus:outline-none focus:ring-1 focus:ring-[#e8a33d]/50"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e8a33d] py-2.5 text-sm font-medium text-[#0b0b0d] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Creating room…' : 'Create room'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleJoinRoom}>
                <label htmlFor="room-code" className="mb-2 block text-xs text-[#8a8880]">
                  Room code
                </label>
                <input
                  id="room-code"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="a8k3f2"
                  maxLength={8}
                  className="mb-4 w-full rounded-lg border border-white/10 bg-[#0b0b0d] px-3 py-2.5 text-sm text-[#f2f0ea] placeholder:text-[#5c5a54] focus:border-[#e8a33d]/50 focus:outline-none focus:ring-1 focus:ring-[#e8a33d]/50"
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#3dbfa8]/40 bg-[#3dbfa8]/10 py-2.5 text-sm font-medium text-[#3dbfa8] transition-colors hover:bg-[#3dbfa8]/20"
                >
                  Join room
                </button>
              </form>
            )}
            {error && (
              <p className="mt-3 text-xs text-[#e0685b]">{error}</p>
            )}
          </div>
        </div>

        {/* How it works — a genuine sequence, numbering earns its place */}
        <div className="mt-20 grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { n: '01', label: 'Paste a link', detail: 'Drop in any youtube video to start a room.' },
            { n: '02', label: 'Share the code', detail: 'Send the link or room code to your friends.' },
            { n: '03', label: 'Watch in sync', detail: 'Play, pause, and seek stay locked for everyone.' },
          ].map((step) => (
            <div key={step.n}>
              <div
                className="mb-2 text-xs text-[#e8a33d]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {step.n}
              </div>
              <div className="mb-1 text-sm font-medium text-[#f2f0ea]">{step.label}</div>
              <div className="text-[13px] leading-relaxed text-[#8a8880]">{step.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
    </main>
  );
};

