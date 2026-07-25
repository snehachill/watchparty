import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  videoId: { type: String, required: true },
  hostSocketId: { type: String, default: null },
  isPlaying: { type: Boolean, default: false },
  currentTime: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: '7d' }, // auto-expire stale rooms
});

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);