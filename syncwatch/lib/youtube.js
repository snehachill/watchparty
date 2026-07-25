// Extracts an 11-char youtube video id from any common url shape.
// Returns null if the url doesn't look like a valid youtube link.
export function extractYoutubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/embed/')[1] || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}