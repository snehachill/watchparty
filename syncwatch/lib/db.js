import mongoose from 'mongoose';

// Reuse the connection across hot reloads / serverless invocations
let cached = global._mongoose;
if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  let uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable in .env / .env.local');
  }

  // Sanitize URI: remove leading/trailing quotes or whitespace if present
  uri = uri.trim().replace(/^["']|["']$/g, '');

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(
      `Invalid MONGODB_URI scheme. Expected "mongodb://" or "mongodb+srv://", received: "${uri.substring(0, 15)}..."`
    );
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(uri, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reset promise on error so next call retries
    throw e;
  }

  return cached.conn;
}