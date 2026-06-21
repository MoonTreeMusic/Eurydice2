import { useMemo } from 'react'
import { TrackTable } from './TrackTable'
import { trackMatchesQuery } from '../../shared/search'

// Lists user playlists, allows creating/deleting them, and shows the tracks of
// the selected playlist (reorder + remove persist to the library).
export function PlaylistsView({
  playlists,
  activePlaylist,
  query,
  currentTrack,
  onPlayTrack,
  onCreatePlaylist,
  onSelectPlaylist,
  onDeletePlaylist,
  onReorderPlaylist,
  onRemoveFromPlaylist,
  menuProps,
}) {
  const tracks = activePlaylist?.tracks ?? []
  const filtered = useMemo(
    () => tracks.filter((t) => trackMatchesQuery(t, query)),
    [tracks, query]
  )

  function handleMove(track, dir) {
    const ids = tracks.map((t) => t.id)
    const idx = ids.indexOf(track.id)
    const swap = idx + dir
    if (idx < 0 || swap < 0 || swap >= ids.length) return
    ;[ids[idx], ids[swap]] = [ids[swap], ids[idx]]
    onReorderPlaylist(activePlaylist.id, ids)
  }

  return (
    <div className="playlists">
      <div className="playlist-sidebar">
        <div className="playlist-sidebar-header">
          <span className="section-label">Playlists</span>
          <button className="btn-icon" onClick={onCreatePlaylist}>
            + New
          </button>
        </div>
        {playlists.length === 0 ? (
          <div className="playlist-empty-hint">No playlists yet.</div>
        ) : (
          playlists.map((pl) => (
            <div
              key={pl.id}
              className={`playlist-item${activePlaylist?.id === pl.id ? ' active' : ''}`}
              onClick={() => onSelectPlaylist(pl.id)}
            >
              <span className="playlist-name">{pl.name}</span>
              <span className="playlist-count">{pl.trackCount}</span>
            </div>
          ))
        )}
      </div>

      <div className="playlist-panel">
        {!activePlaylist ? (
          <div className="view-empty">Select a playlist, or create one with “+ New”.</div>
        ) : (
          <>
            <div className="playlist-panel-header">
              <h2 className="playlist-panel-title">{activePlaylist.name}</h2>
              <button
                className="btn-icon btn-danger"
                onClick={() => onDeletePlaylist(activePlaylist.id)}
              >
                Delete playlist
              </button>
            </div>
            {filtered.length === 0 ? (
              <div className="view-empty">
                {tracks.length === 0
                  ? 'This playlist is empty. Right-click a track in another view to add it.'
                  : `No tracks match “${query}”.`}
              </div>
            ) : (
              <TrackTable
                tracks={filtered}
                currentTrack={currentTrack}
                onPlay={(t) => onPlayTrack(t, filtered)}
                showArtist
                showAlbum
                reorder={{
                  onMove: query ? undefined : handleMove,
                  onRemoveFromList: (t) => onRemoveFromPlaylist(activePlaylist.id, t),
                }}
                {...menuProps}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
