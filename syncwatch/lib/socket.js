import { io } from 'socket.io-client';

let socket;

// Singleton so every component in the room shares one connection instead of
// each opening its own socket. Call getSocket() from any client component.
export function getSocket() {
  if (!socket) {
    // Use environment variable with fallback to current origin for production
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      (typeof window !== 'undefined' ? window.location.origin : '');
    
    console.log('[Socket] Connecting to:', socketUrl);
    
    socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      transports: ['websocket', 'polling'], // Fallback for production
    });
  }
  return socket;
}