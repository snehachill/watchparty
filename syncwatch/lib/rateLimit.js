// Basic in-memory token bucket, keyed by IP. Good enough at this scale —
// swap for Redis if you ever run multiple server instances.
const buckets = new Map();

export function isRateLimited(key, { maxRequests = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return bucket.count > maxRequests;
}