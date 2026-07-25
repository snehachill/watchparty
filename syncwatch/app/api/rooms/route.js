import { NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { connectToDatabase } from '@/lib/db';
import Room from '@/models/Room';
import { extractYoutubeVideoId } from '@/lib/youtube';
import { isRateLimited } from '@/lib/rateLimit';

// Lowercase alphanumeric, no ambiguous chars (0/o, 1/l) — easier to read
// aloud or type in from a "join room" box.
const generateRoomId = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 6);

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  if (isRateLimited(`create-room:${ip}`, { maxRequests: 10, windowMs: 60_000 })) {
    return NextResponse.json(
      { error: "You're creating rooms too quickly. Wait a minute and try again." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const youtubeUrl = body?.youtubeUrl;
  if (!youtubeUrl) {
    return NextResponse.json({ error: 'Missing youtubeUrl' }, { status: 400 });
  }

  const videoId = extractYoutubeVideoId(youtubeUrl);
  if (!videoId) {
    return NextResponse.json(
      { error: "That doesn't look like a valid youtube link." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  let roomId;
  let attempts = 0;
  // Vanishingly unlikely to collide at 6 chars, but guard anyway
  do {
    roomId = generateRoomId();
    attempts += 1;
  } while (attempts < 5 && (await Room.exists({ roomId })));

  const room = await Room.create({ roomId, videoId });

  return NextResponse.json({ roomId: room.roomId, videoId: room.videoId }, { status: 201 });
}