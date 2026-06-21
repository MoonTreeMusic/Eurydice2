// Case-insensitive match of a track against a search query, checking the
// title, artist, and album fields. Empty/blank queries match everything.
export function trackMatchesQuery(track, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return true
  return (
    (track.title || '').toLowerCase().includes(q) ||
    (track.artist || '').toLowerCase().includes(q) ||
    (track.album || '').toLowerCase().includes(q)
  )
}
