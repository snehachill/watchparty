const { resolvePlaybackConflict } = require('./conflictResolution');

const CONFLICT_WINDOW_MS = 300;

// roomId -> { currentTime, isPlaying, sequence, lastEvent, participants: Map, reactions: [], hostSocketId }
const rooms = new Map();

function getRoomState(roomId, roomDoc) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      currentTime: roomDoc?.currentTime ?? 0,
      isPlaying: roomDoc?.isPlaying ?? false,
      sequence: 0,
      lastEvent: null,
      participants: new Map(),
      reactions: [],
      hostSocketId: null,
    });
  }
  return rooms.get(roomId);
}

function serializeState(state) {
  return {
    currentTime: state.currentTime,
    isPlaying: state.isPlaying,
    participants: Array.from(state.participants.values()),
    reactions: state.reactions,
  };
}

function addParticipant(roomId, participant, roomDoc) {
  const state = getRoomState(roomId, roomDoc);
  state.participants.set(participant.socketId, {
    displayName: participant.displayName,
    peerId: participant.peerId ?? null, // null if camera/peer setup failed or was denied
  });
  return serializeState(state);
}

function removeParticipant(roomId, socketId) {
  const state = rooms.get(roomId);
  if (!state) return;
  state.participants.delete(socketId);

  if (state.hostSocketId === socketId) {
    const next = state.participants.keys().next();
    state.hostSocketId = next.done ? null : next.value;
  }

  if (state.participants.size === 0) rooms.delete(roomId);
}

function addReaction(roomId, reaction) {
  const state = rooms.get(roomId);
  if (!state) return;
  state.reactions.push(reaction);
}

function setHost(roomId, socketId) {
  const state = rooms.get(roomId);
  if (!state) return;
  state.hostSocketId = socketId;
}

function isHost(roomId, socketId) {
  const state = rooms.get(roomId);
  if (!state) return false;
  if (socketId === undefined) return Boolean(state.hostSocketId);
  return state.hostSocketId === socketId;
}

function applyEvent(roomId, incoming) {
  const state = rooms.get(roomId);
  if (!state) return null;

  state.sequence += 1;
  const candidate = {
    ...incoming,
    sequence: state.sequence,
    timestamp: Date.now(),
  };

  const withinConflictWindow =
    state.lastEvent && candidate.timestamp - state.lastEvent.timestamp < CONFLICT_WINDOW_MS;

  const winner = withinConflictWindow
    ? resolvePlaybackConflict(state.lastEvent, candidate)
    : candidate;

  state.lastEvent = winner;
  state.currentTime = winner.currentTime;
  state.isPlaying = winner.type === 'play' ? true : winner.type === 'pause' ? false : state.isPlaying;

  if (winner !== candidate) return null;
  return winner;
}

module.exports = {
  getRoomState,
  applyEvent,
  addParticipant,
  removeParticipant,
  addReaction,
  setHost,
  isHost,
};