const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  videoId: { type: String, required: true },
  hostSocketId: { type: String, default: null },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: '7d' },
});

// Kept as a duplicate of the Next.js app's model rather than a shared
// import, since this server is a separate deployable with its own
// package.json / node_modules. Keep the schema in sync manually, or move
// both into a shared workspace package if this grows.
const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  return mongoose.connect(process.env.MONGODB_URI);
}

module.exports = { connectToDatabase, Room };