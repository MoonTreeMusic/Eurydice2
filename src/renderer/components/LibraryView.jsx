import { useMemo } from 'react'
import { TrackTable } from './TrackTable'
import { trackMatchesQuery } from '../../shared/search'

// Flat, searchable list of every track in the library.
export function LibraryView({ tracks, query, currentTrack, onPlayTrack, menuProps }) {
  const filtered = useMemo(
    () => tracks.filter((t) => trackMatchesQuery(t, query)),
    [tracks, query]
  )

  if (filtered.length === 0) {
    return <div className="view-empty">No tracks match “{query}”.</div>
  }

  return (
    <div className="flat-panel">
      <TrackTable
        tracks={filtered}
        currentTrack={currentTrack}
        onPlay={(t) => onPlayTrack(t, filtered)}
        showArtist
        showAlbum
        {...menuProps}
      />
    </div>
  )
}
