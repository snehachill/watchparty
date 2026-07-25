'use client';

import { useEffect, useRef, useState, useCallback, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { getSocket } from '@/lib/socket';
import { createPeer, destroyPeer } from '@/lib/peer';

const fraunces = Fraunces({ subsets: ['latin'], weight: ['500'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-body' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

const REACTIONS = ['😂', '❤️', '😮', '👏'];
const DRIFT_TOLERANCE_SECONDS = 1.5;
const SYNC_BROADCAST_INTERVAL_MS = 5000;
const PEER_SETUP_TIMEOUT_MS = 4000;

export default function RoomPage() {
  const params = useParams();
  // Safe extraction for Next.js 15+
  const roomId = params?.roomId;

  const router = useRouter();

  // Early return if roomId is undefined during hydration
  if (!roomId) {
    console.log('[Room] roomId is undefined, waiting for hydration...');
    return null;
  }

  const socketRef = useRef(null);
  const playerRef = useRef(null);
  const playerElRef = useRef(null);
  const playerReadyRef = useRef(false);
  const suppressUntilRef = useRef(0);
  const chatEndRef = useRef(null);

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const activeCallsRef = useRef(new Map());
  const myPeerIdRef = useRef(null);

  const [displayName, setDisplayName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);

  const [connectionState, setConnectionState] = useState('connecting');
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [reactions, setReactions] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [viewMode, setViewMode] = useState('classic');

  const [peerSetupDone, setPeerSetupDone] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);
  const [roomFetchError, setRoomFetchError] = useState('');

  useEffect(() => {
    if (hasLocalStream && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [hasLocalStream]);

  useEffect(() => {
    const saved = window.localStorage.getItem('syncwatch:displayName');
    if (saved) {
      setDisplayName(saved);
      setHasJoined(true);
    }
  }, []);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    window.localStorage.setItem('syncwatch:displayName', trimmed);
    setDisplayName(trimmed);
    setHasJoined(true);
  };

  useEffect(() => {
    if (window.YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
  }, []);

  // --- Camera/mic + PeerJS setup ---------------------------------------
  useEffect(() => {
    if (!hasJoined) return;
    let cancelled = false;
    let timeoutId;

    async function setup() {
      try {
        console.log('[Media] Requesting camera/mic access...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setHasLocalStream(true);
        console.log('[Media] Camera/mic access granted');
      } catch (err) {
        console.error('[Media] Camera/mic access failed:', err);
        if (!cancelled) {
          setMediaError("Camera or mic access wasn't granted — you can still watch and chat.");
        }
      }

      try {
        console.log('[Peer] Initializing PeerJS...');
        const peer = createPeer();
        peerRef.current = peer;

        peer.on('open', (id) => {
          if (cancelled) return;
          console.log('[Peer] PeerJS connected with ID:', id);
          myPeerIdRef.current = id;
          setPeerSetupDone(true);
        });

        peer.on('error', (err) => {
          console.error('[Peer] PeerJS error:', err);
          if (!cancelled) {
            setPeerSetupDone(true);
            // Don't crash the app on PeerJS errors - just log them
          }
        });

        peer.on('call', (call) => {
          console.log('[Peer] Incoming call from:', call.peer);
          call.answer(localStreamRef.current || undefined);
          call.on('stream', (remoteStream) => {
            console.log('[Peer] Received remote stream from:', call.peer);
            setRemoteStreams((prev) => ({ ...prev, [call.peer]: remoteStream }));
          });
          call.on('close', () => {
            console.log('[Peer] Call ended with:', call.peer);
            setRemoteStreams((prev) => {
              const next = { ...prev };
              delete next[call.peer];
              return next;
            });
          });
          activeCallsRef.current.set(call.peer, call);
        });
      } catch (err) {
        console.error('[Peer] PeerJS initialization failed:', err);
        if (!cancelled) {
          setMediaError("Video calling failed to initialize — you can still watch and chat.");
          setPeerSetupDone(true);
        }
      }
    }

    setup();

    timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.log('[Peer] Setup timeout reached, marking as done');
        setPeerSetupDone(true);
      }
    }, PEER_SETUP_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      activeCallsRef.current.forEach((call) => call.close());
      activeCallsRef.current.clear();
      destroyPeer();
      peerRef.current = null;
    };
  }, [hasJoined]);

  const callPeer = useCallback((peerId) => {
    if (!peerRef.current || !peerId) return;
    if (peerId === myPeerIdRef.current) return;
    if (activeCallsRef.current.has(peerId)) return;

    const outgoingStream = localStreamRef.current || new MediaStream();
    const call = peerRef.current.call(peerId, outgoingStream);
    if (!call) return;

    call.on('stream', (remoteStream) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: remoteStream }));
    });
    call.on('close', () => {
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[peerId];
        return next;
      });
    });
    activeCallsRef.current.set(peerId, call);
  }, []);

  function toggleMic() {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  }

  function toggleCam() {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn((prev) => !prev);
  }

  // --- Socket connection + room events -----------------------------------
  useEffect(() => {
    if (!hasJoined || !displayName || !peerSetupDone || !roomId) return;

    console.log('[Socket] Connecting to room:', roomId);
    const socket = getSocket();
    socketRef.current = socket;
    socket.connect();

    socket.on('connect', () => {
      console.log('[Socket] Connected');
      setConnectionState('connected');
      socket.emit('room:join', { roomId, displayName, peerId: myPeerIdRef.current });
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnectionState('reconnecting');
    });
    
    socket.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      setConnectionState('connected');
      socket.emit('room:join', { roomId, displayName, peerId: myPeerIdRef.current });
    });

    socket.on('room:notFound', () => {
      console.log('[Socket] Room not found:', roomId);
      setRoomNotFound(true);
    });

    socket.on('room:state', (state) => {
      if (!state) return;
      console.log('[Socket] Room state updated');
      applyRemotePlaybackState(state.currentTime, state.isPlaying);
      setParticipants(state.participants || []);
      setReactions(state.reactions || []);
      (state.participants || []).forEach((p) => {
        if (p.peerId) callPeer(p.peerId);
      });
    });

    socket.on('room:userJoined', ({ displayName: name, peerId }) => {
      console.log('[Socket] User joined:', name);
      setParticipants((prev) => [...prev, { displayName: name, peerId }]);
    });

    socket.on('room:userLeft', ({ displayName: name, peerId }) => {
      console.log('[Socket] User left:', name);
      setParticipants((prev) => prev.filter((p) => p.displayName !== name));
      if (peerId) {
        activeCallsRef.current.get(peerId)?.close();
        activeCallsRef.current.delete(peerId);
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      }
    });

    socket.on('video:play', ({ currentTime }) => applyRemotePlaybackState(currentTime, true));
    socket.on('video:pause', ({ currentTime }) => applyRemotePlaybackState(currentTime, false));
    socket.on('video:seek', ({ currentTime }) => {
      if (!playerRef.current || !playerReadyRef.current) return;
      suppressUntilRef.current = Date.now() + 1000;
      playerRef.current.seekTo(currentTime, true);
    });
    socket.on('video:sync', ({ currentTime }) => correctDrift(currentTime));

    socket.on('chat:message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('reaction:add', (reaction) => {
      setReactions((prev) => [...prev, reaction]);
      const id = `${reaction.userId}-${Date.now()}-${Math.random()}`;
      setFloatingReactions((prev) => [...prev, { ...reaction, id }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2200);
    });

    return () => {
      console.log('[Socket] Cleaning up');
      socket.off();
      socket.disconnect();
    };
  }, [hasJoined, displayName, roomId, peerSetupDone, callPeer]);

  function applyRemotePlaybackState(currentTime, isPlaying) {
    if (!playerRef.current || !playerReadyRef.current) return;
    suppressUntilRef.current = Date.now() + 1000;

    const drift = Math.abs(playerRef.current.getCurrentTime() - currentTime);
    if (drift > DRIFT_TOLERANCE_SECONDS) {
      playerRef.current.seekTo(currentTime, true);
    }

    const currentState = playerRef.current.getPlayerState();
    const alreadyPlaying = currentState === window.YT.PlayerState.PLAYING;
    const alreadyPaused = currentState === window.YT.PlayerState.PAUSED;

    if (isPlaying && !alreadyPlaying) playerRef.current.playVideo();
    else if (!isPlaying && !alreadyPaused) playerRef.current.pauseVideo();
  }

  function correctDrift(hostTime) {
    if (!playerRef.current || !playerReadyRef.current) return;
    const drift = Math.abs(playerRef.current.getCurrentTime() - hostTime);
    if (drift > DRIFT_TOLERANCE_SECONDS) {
      suppressUntilRef.current = Date.now() + 1000;
      playerRef.current.seekTo(hostTime, true);
    }
  }

  // --- API Room Fetch Fix ---------------------------------------
  useEffect(() => {
    if (!hasJoined || !roomId) return; // FIX: Added !roomId condition
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 3;

    async function fetchRoomWithRetry() {
      setIsLoadingRoom(true);
      setRoomFetchError('');

      for (let i = 0; i < maxRetries; i++) {
        if (cancelled) return;

        try {
          console.log(`[Room] Fetching room ${roomId} (attempt ${i + 1}/${maxRetries})`);
          const res = await fetch(`/api/rooms/${roomId}`);
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`[Room] Fetch failed:`, res.status, errorData);
            
            if (res.status === 404) {
              setRoomNotFound(true);
              return;
            }
            
            // For 500 errors or cold starts, retry
            if (i < maxRetries - 1) {
              const delay = Math.pow(2, i) * 1000; // Exponential backoff: 1s, 2s, 4s
              console.log(`[Room] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            throw new Error(errorData.error || `HTTP ${res.status}`);
          }

          const data = await res.json();
          console.log('[Room] Room data received:', data);
          
          if (cancelled) return;

          function createYoutubePlayer(videoId) {
            if (cancelled || !playerElRef.current) return;
            playerRef.current = new window.YT.Player(playerElRef.current, {
              videoId,
              playerVars: { rel: 0, modestbranding: 1 },
              events: {
                onReady: (e) => {
                  playerReadyRef.current = true;
                  setVideoDuration(e.target.getDuration());
                },
                onStateChange: handlePlayerStateChange,
              },
            });
          }

          if (window.YT && window.YT.Player) {
            createYoutubePlayer(data.videoId);
          } else {
            window.onYouTubeIframeAPIReady = () => createYoutubePlayer(data.videoId);
          }
          
          setIsLoadingRoom(false);
          return;
        } catch (error) {
          console.error('[Room] Fetch error:', error);
          if (i === maxRetries - 1) {
            setRoomFetchError(`Failed to load room: ${error.message}`);
            setIsLoadingRoom(false);
          }
        }
      }
    }

    fetchRoomWithRetry();

    return () => { cancelled = true; };
  }, [hasJoined, roomId]);

  const handlePlayerStateChange = useCallback((event) => {
    const socket = socketRef.current;
    if (!socket) return;

    const isPlaying = event.data === window.YT.PlayerState.PLAYING;
    const isPaused = event.data === window.YT.PlayerState.PAUSED;
    if (!isPlaying && !isPaused) return;

    if (Date.now() < suppressUntilRef.current) return;

    const currentTime = event.target.getCurrentTime();
    if (isPlaying) {
      socket.emit('video:play', { roomId, currentTime });
    } else {
      socket.emit('video:pause', { roomId, currentTime });
    }
  }, [roomId]);

  useEffect(() => {
    if (!hasJoined || !roomId) return;
    const interval = setInterval(() => {
      if (!playerRef.current || !playerReadyRef.current || !socketRef.current) return;
      socketRef.current.emit('video:sync', {
        roomId,
        currentTime: playerRef.current.getCurrentTime(),
      });
    }, SYNC_BROADCAST_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [hasJoined, roomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendChatMessage(e) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit('chat:message', { roomId, displayName, text });
    setChatInput('');
  }

  function sendReaction(emoji) {
    if (!socketRef.current || !playerRef.current) return;
    socketRef.current.emit('reaction:add', {
      roomId,
      emoji,
      videoTimestamp: playerRef.current.getCurrentTime(),
      userId: displayName,
    });
  }

  function nameForPeer(peerId) {
    return participants.find((p) => p.peerId === peerId)?.displayName || 'Guest';
  }

  if (roomNotFound) {
    router.replace('/not-found');
    return null;
  }

  const fontClasses = `${fraunces.variable} ${inter.variable} ${mono.variable}`;

  if (!hasJoined) {
    return (
      <main className={`${fontClasses} flex min-h-screen items-center justify-center bg-[#0b0b0d] px-6 text-[#f2f0ea]`} style={{ fontFamily: 'var(--font-body)' }}>
        <form onSubmit={handleJoinSubmit} className="w-full max-w-sm rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <h1 className="mb-1 text-lg" style={{ fontFamily: 'var(--font-display)' }}>Join the room</h1>
          <p className="mb-4 text-sm text-[#8a8880]">Pick a display name for this session.</p>
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            maxLength={24}
            className="mb-4 w-full rounded-lg border border-white/10 bg-[#0b0b0d] px-3 py-2.5 text-sm text-[#f2f0ea] placeholder:text-[#5c5a54] focus:border-[#e8a33d]/50 focus:outline-none focus:ring-1 focus:ring-[#e8a33d]/50"
          />
          <button type="submit" className="w-full rounded-lg bg-[#e8a33d] py-2.5 text-sm font-medium text-[#0b0b0d] hover:opacity-90">
            Enter room
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className={`${fontClasses} min-h-screen bg-[#0b0b0d] px-4 py-4 text-[#f2f0ea] sm:px-6 sm:py-6`} style={{ fontFamily: 'var(--font-body)' }}>
      {connectionState === 'reconnecting' && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#e8a33d]/30 bg-[#e8a33d]/10 px-3 py-2 text-xs text-[#e8a33d]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e8a33d]" />
          Reconnecting…
        </div>
      )}
      {isLoadingRoom && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#3dbfa8]/30 bg-[#3dbfa8]/10 px-3 py-2 text-xs text-[#3dbfa8]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3dbfa8]" />
          Loading room…
        </div>
      )}
      {roomFetchError && (
        <div className="mb-3 rounded-lg border border-[#e0685b]/30 bg-[#e0685b]/10 px-3 py-2 text-xs text-[#e0685b]">
          {roomFetchError}
        </div>
      )}
      {mediaError && (
        <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[#8a8880]">
          {mediaError}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-[#3dbfa8]" />
          <span style={{ fontFamily: 'var(--font-mono)' }}>room #{roomId}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            <button
              onClick={() => setViewMode('classic')}
              className={`rounded-md px-3 py-1 text-xs ${viewMode === 'classic' ? 'bg-[#1c1c1f] text-[#f2f0ea]' : 'text-[#8a8880]'}`}
            >
              Classic
            </button>
            <button
              disabled
              title="Theater view is coming soon"
              className="cursor-not-allowed rounded-md px-3 py-1 text-xs text-[#5c5a54]"
            >
              Theater
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#8a8880]">
            <span>{participants.length}</span>
            watching
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <div ref={playerElRef} className="h-full w-full" />
            {floatingReactions.map((r) => (
              <span
                key={r.id}
                className="pointer-events-none absolute bottom-4 animate-[float-up_2.2s_ease-out_forwards] text-2xl"
                style={{ left: `${20 + Math.random() * 60}%` }}
              >
                {r.emoji}
              </span>
            ))}
          </div>

          {videoDuration > 0 && (
            <div className="relative mt-2 h-1 rounded-full bg-white/10">
              {reactions.map((r, i) => (
                <span
                  key={i}
                  className="absolute -top-2 text-[10px]"
                  style={{ left: `${(r.videoTimestamp / videoDuration) * 100}%` }}
                  title={`${r.emoji} at ${formatTime(r.videoTimestamp)}`}
                >
                  {r.emoji}
                </span>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-lg hover:bg-white/[0.06]"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={toggleMic}
                disabled={!hasLocalStream}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  micOn ? 'border-white/10 bg-white/[0.03] text-[#f2f0ea]' : 'border-[#e0685b]/30 bg-[#e0685b]/10 text-[#e0685b]'
                } disabled:opacity-40`}
              >
                {micOn ? 'Mic on' : 'Mic off'}
              </button>
              <button
                onClick={toggleCam}
                disabled={!hasLocalStream}
                className={`rounded-lg border px-3 py-1.5 text-xs ${
                  camOn ? 'border-white/10 bg-white/[0.03] text-[#f2f0ea]' : 'border-[#e0685b]/30 bg-[#e0685b]/10 text-[#e0685b]'
                } disabled:opacity-40`}
              >
                {camOn ? 'Cam on' : 'Cam off'}
              </button>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto">
            <div className="relative h-20 min-w-[112px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
              {hasLocalStream ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-[#5c5a54]">No camera</div>
              )}
              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px]">You</span>
            </div>

            {Object.entries(remoteStreams).map(([peerId, stream]) => (
              <RemoteVideoTile key={peerId} stream={stream} label={nameForPeer(peerId)} />
            ))}

            {participants
              .filter((p) => p.peerId !== myPeerIdRef.current && p.displayName !== displayName)
              .filter((p) => !p.peerId || !remoteStreams[p.peerId])
              .map((p, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="flex h-20 min-w-[112px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs text-[#8a8880]"
                >
                  {p.displayName}
                </div>
              ))}
          </div>
        </div>

        <div className="flex h-[420px] flex-col rounded-xl border border-white/10 bg-white/[0.03] p-3 lg:h-auto">
          <div className="flex-1 space-y-2 overflow-y-auto text-sm">
            {messages.map((m, i) => (
              <div key={i}>
                <span className="font-medium">{m.displayName}</span>
                <span className="text-[#8a8880]"> {m.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChatMessage} className="mt-2 flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send a message"
              className="flex-1 rounded-lg border border-white/10 bg-[#0b0b0d] px-3 py-2 text-sm text-[#f2f0ea] placeholder:text-[#5c5a54] focus:border-[#e8a33d]/50 focus:outline-none focus:ring-1 focus:ring-[#e8a33d]/50"
            />
          </form>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-120px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </main>
  );
}

function RemoteVideoTile({ stream, label }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative h-20 min-w-[112px] overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px]">{label}</span>
    </div>
  );
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}