require('dotenv').config();

const { createServer } = require('http');
const { Server } = require('socket.io');
const { connectToDatabase, Room } = require('./db');
const {
  getRoomState,
  applyEvent,
  addParticipant,
  removeParticipant,
  addReaction,
  setHost,
  isHost,
} = require('./roomState');

const PORT = process.env.PORT || 4000;

// Allow requests from localhost OR your production Vercel frontend URL
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const DEBUG = process.env.DEBUG_SOCKET !== 'false';

function log(...args) {
  if (DEBUG) console.log('[socket]', ...args);
}

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { 
    origin: CORS_ORIGIN, 
    methods: ['GET', 'POST'],
    credentials: true
  },
});

io.on('connection', (socket) => {
  log('client connected:', socket.id);

  socket.on('room:join', async ({ roomId, displayName, peerId }) => {
    if (!roomId || !displayName) {
      log('room:join missing roomId or displayName, ignoring');
      return;
    }

    let room;
    try {
      room = await Room.findOne({ roomId }).lean();
    } catch (err) {
      log('DB error on room:join:', err.message);
      socket.emit('room:notFound');
      return;
    }

    if (!room) {
      log('room:join — room not found:', roomId);
      socket.emit('room:notFound');
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.displayName = displayName;

    const state = addParticipant(roomId, { displayName, socketId: socket.id, peerId }, room);

    if (!isHost(roomId)) {
      setHost(roomId, socket.id);
      log(`${displayName} (${socket.id}) is now host of room ${roomId}`);
    }

    log(`${displayName} joined room ${roomId} — ${state.participants.length} participant(s)`);

    socket.emit('room:state', { ...state, videoId: room.videoId });
    socket.to(roomId).emit('room:userJoined', { displayName, peerId });
  });

  socket.on('video:play', ({ roomId, currentTime }) => {
    log('RECEIVED video:play', { roomId, currentTime, from: socket.id });
    const result = applyEvent(roomId, { type: 'play', currentTime, socketId: socket.id });
    log('video:play resolved to:', result);
    if (result) io.to(roomId).emit('video:play', { currentTime: result.currentTime });
  });

  socket.on('video:pause', ({ roomId, currentTime }) => {
    log('RECEIVED video:pause', { roomId, currentTime, from: socket.id });
    const result = applyEvent(roomId, { type: 'pause', currentTime, socketId: socket.id });
    log('video:pause resolved to:', result);
    if (result) io.to(roomId).emit('video:pause', { currentTime: result.currentTime });
  });

  socket.on('video:seek', ({ roomId, currentTime }) => {
    log('RECEIVED video:seek', { roomId, currentTime, from: socket.id });
    const result = applyEvent(roomId, { type: 'seek', currentTime, socketId: socket.id });
    log('video:seek resolved to:', result);
    if (result) socket.to(roomId).emit('video:seek', { currentTime: result.currentTime });
  });

  socket.on('video:sync', ({ roomId, currentTime }) => {
    if (!isHost(roomId, socket.id)) return;
    socket.to(roomId).emit('video:sync', { currentTime });
  });

  socket.on('chat:message', ({ roomId, displayName, text }) => {
    if (!text?.trim() || !roomId) return;
    const message = { displayName, text: text.slice(0, 500), timestamp: Date.now() };
    log('chat:message', roomId, message);
    io.to(roomId).emit('chat:message', message);
  });

  socket.on('reaction:add', ({ roomId, emoji, videoTimestamp, userId }) => {
    if (!roomId || !emoji) return;
    const reaction = { emoji, videoTimestamp, userId, roomId };
    addReaction(roomId, reaction);
    io.to(roomId).emit('reaction:add', reaction);
  });

  socket.on('disconnect', () => {
    const { roomId, displayName } = socket.data;
    if (!roomId) return;
    log(`${displayName} (${socket.id}) disconnected from room ${roomId}`);
    removeParticipant(roomId, socket.id);
    socket.to(roomId).emit('room:userLeft', { displayName });
  });
});

connectToDatabase()
  .then(() => {
    log('connected to MongoDB');
    // Important: Added '0.0.0.0' for Render Port Scanning
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Socket.io server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB, server not started:', err.message);
    process.exit(1);
  });