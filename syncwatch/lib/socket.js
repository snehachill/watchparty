import { io } from 'socket.io-client';

let socket;

// Singleton so every component in the room shares one connection instead of
// each opening its own socket. Call getSocket() from any client component.
export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
    });
  }
  return socket;
}