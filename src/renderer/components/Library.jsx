import { useState, useMemo } from 'react'

function formatDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Library({ tracks, currentTrack, onPlayTrack }) {
  const [selectedArtist, setSelectedArtist] = useState(null)

  const library = useMemo(() => {
    const lib = {}
    for (const t of tracks) {
      if (!lib[t.artist]) lib[t.artist] = {}
      if (!lib[t.artist][t.album]) lib[t.artist][t.album] = []
      lib[t.artist][t.album].push(t)
    }
    return lib
  }, [tracks])

  const artists = useMemo(
    () => Object.keys(library).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [library]
  )

  const activeArtist = selectedArtist ?? artists[0] ?? null
  const albums = activeArtist ? library[activeArtist] : {}

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
              const sorted = [...albumTracks].sort(
                (a, b) =>
                  (a.trackNumber || 999) - (b.trackNumber || 999) ||
                  a.title.localeCompare(b.title)
              )
              return (
                <div key={album} className="album-block">
                  <div className="album-title">{album}</div>
                  <table className="track-table">
                    <tbody>
                      {sorted.map((track) => {
                        const isActive = currentTrack?.id === track.id
                        return (
                          <tr
                            key={track.id}
                            className={`track-row${isActive ? ' active' : ''}`}
                            onClick={() => onPlayTrack(track, sorted)}
                          >
                            <td className="track-num">
                              {isActive ? '▶' : track.trackNumber || ''}
                            </td>
                            <td className="track-title-cell">{track.title}</td>
                            <td className="track-dur">{formatDuration(track.duration)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
      </div>
    </div>
  )
}
