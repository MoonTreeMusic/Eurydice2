import { useState, useMemo, useCallback } from 'react'
import { TrackTable } from './TrackTable'
import { trackMatchesQuery } from '../../shared/search'

function albumKey(artist, album) {
  return `${artist} ${album}`
}

function defaultSort(a, b) {
  return (a.trackNumber || 999) - (b.trackNumber || 999) || a.title.localeCompare(b.title)
}

// Browse by artist → album. Supports session-only custom track ordering and
// "remove from list" per album (layered over the scanned library).
export function ArtistsView({ tracks, query, currentTrack, onPlayTrack, menuProps }) {
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [albumOrders, setAlbumOrders] = useState({}) // albumKey -> ordered [trackId]
  const [removedIds, setRemovedIds] = useState(() => new Set())

  const library = useMemo(() => {
    const lib = {}
    for (const t of tracks) {
      if (!trackMatchesQuery(t, query)) continue
      if (!lib[t.artist]) lib[t.artist] = {}
      if (!lib[t.artist][t.album]) lib[t.artist][t.album] = []
      lib[t.artist][t.album].push(t)
    }
    return lib
  }, [tracks, query])

  const artists = useMemo(
    () =>
      Object.keys(library).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [library]
  )

  const orderedAlbumTracks = useCallback(
    (key, albumTracks) => {
      const visible = albumTracks.filter((t) => !removedIds.has(t.id))
      const order = albumOrders[key]
      if (!order) return [...visible].sort(defaultSort)
      const pos = new Map(order.map((id, i) => [id, i]))
      return [...visible].sort((a, b) => {
        const ai = pos.has(a.id) ? pos.get(a.id) : Infinity
        const bi = pos.has(b.id) ? pos.get(b.id) : Infinity
        return ai !== bi ? ai - bi : defaultSort(a, b)
      })
    },
    [albumOrders, removedIds]
  )

  const moveTrack = useCallback((key, ordered, trackId, direction) => {
    const idx = ordered.findIndex((t) => t.id === trackId)
    const swapWith = idx + direction
    if (idx < 0 || swapWith < 0 || swapWith >= ordered.length) return
    const ids = ordered.map((t) => t.id)
    ;[ids[idx], ids[swapWith]] = [ids[swapWith], ids[idx]]
    setAlbumOrders((prev) => ({ ...prev, [key]: ids }))
  }, [])

  const removeTrack = useCallback((trackId) => {
    setRemovedIds((prev) => {
      const next = new Set(prev)
      next.add(trackId)
      return next
    })
  }, [])

  const activeArtist = (selectedArtist && library[selectedArtist] ? selectedArtist : artists[0]) ?? null
  const albums = activeArtist ? library[activeArtist] : {}

  if (artists.length === 0) {
    return <div className="view-empty">No artists match “{query}”.</div>
  }

  return (
    <div className="library">
      <div className="artist-sidebar">
        <div className="section-label">Artists</div>
        {artists.map((artist) => (
          <div
            key={artist}
            className={`artist-item${activeArtist === artist ? ' active' : ''}`}
            onClick={() => setSelectedArtist(artist)}
          >
            {artist}
          </div>
        ))}
      </div>

      <div className="album-panel">
        {activeArtist &&
          Object.entries(albums)
            .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .map(([album, albumTracks]) => {
              const key = albumKey(activeArtist, album)
              const ordered = orderedAlbumTracks(key, albumTracks)
              if (ordered.length === 0) return null
              return (
                <div key={album} className="album-block">
                  <div className="album-title">{album}</div>
                  <TrackTable
                    tracks={ordered}
                    currentTrack={currentTrack}
                    onPlay={(t) => onPlayTrack(t, ordered)}
                    reorder={{
                      onMove: (t, dir) => moveTrack(key, ordered, t.id, dir),
                      onRemoveFromList: (t) => removeTrack(t.id),
                    }}
                    {...menuProps}
                  />
                </div>
              )
            })}
      </div>
    </div>
  )
}
