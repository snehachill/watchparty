// Resolves two video control events that arrived within the same conflict
// window. Kept as a pure function so it's testable without a running socket
// server — see __tests__/conflictResolution.test.js in the main app repo
// (mirror any changes made here over there, or extract to a shared package).
//
// Strategy: last-write-wins by server-assigned sequence number. Sequence
// numbers are strictly increasing per room, assigned at receipt time, so
// "last write" means "last to reach the server", not "last by client clock"
// — client clocks can't be trusted to agree with each other.
function resolvePlaybackConflict(eventA, eventB) {
  if (eventA.sequence > eventB.sequence) return eventA;
  if (eventB.sequence > eventA.sequence) return eventB;
  // Exact tie (shouldn't happen with a monotonic counter, but fall back to
  // whichever has the later client timestamp rather than throwing)
  return eventA.timestamp >= eventB.timestamp ? eventA : eventB;
}

module.exports = { resolvePlaybackConflict };