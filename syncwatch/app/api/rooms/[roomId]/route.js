import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Room from '@/models/Room';

export async function GET(request, { params }) {
  // ✅ Await params before destructuring
  const { roomId } = await params;

  try {
    await connectToDatabase();
    const room = await Room.findOne({ roomId }).lean();

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    return NextResponse.json({
      roomId: room.roomId,
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}