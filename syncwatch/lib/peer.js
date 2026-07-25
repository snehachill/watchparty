import Peer from 'peerjs';

let peerInstance;

// PeerJS's default config only includes Google's public STUN server, which
// fails whenever either side is behind a strict/symmetric NAT (common on
// mobile data, some routers, some corporate/college networks) — there's no
// TURN relay to fall back to. Adding a couple of public STUN servers plus
// Open Relay's free TURN server meaningfully improves connection success
// across real-world networks. For anything beyond a portfolio project,
// swap in a paid TURN provider (Twilio, Metered, etc.) — free TURN servers
// aren't reliable enough for production.
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export function createPeer() {
  if (peerInstance && !peerInstance.destroyed) return peerInstance;

  peerInstance = new Peer(undefined, {
    config: { iceServers: ICE_SERVERS },
    debug: 2, // 0 = none, 1 = errors, 2 = errors+warnings, 3 = all — turn down once stable
  });

  return peerInstance;
}

export function destroyPeer() {
  if (peerInstance && !peerInstance.destroyed) {
    peerInstance.destroy();
  }
  peerInstance = null;
}