import { useState, useCallback } from 'react'
import { ContextMenu } from './ContextMenu'
import { buildTrackMenuItems } from './trackMenu'
import { formatDuration } from '../../shared/format'

// Shared track list used by every view. `tracks` is already filtered/ordered.
// Menu actions are opt-in via the corresponding props (see buildTrackMenuItems).
export function TrackTable({
  tracks,
  currentTrack,
  onPlay,
  playlists,
  onAddToPlaylist,
  onAddToNewPlaylist,
  onRemoveFromLibrary,
  reorder,
  showArtist = false,
  showAlbum = false,
}) {
  const [menu, setMenu] = useState(null)

  const openMenu = useCallback(
    (e, track, index) => {
      e.preventDefault()
      const items = buildTrackMenuItems({
        track,
        index,
        listLength: tracks.length,
        reorder,
        playlists,
        onAddToPlaylist,
        onAddToNewPlaylist,
        onRemoveFromLibrary,
      })
      if (items.length === 0) return
      setMenu({ x: e.clientX, y: e.clientY, items })
    },
    [tracks.length, reorder, playlists, onAddToPlaylist, onAddToNewPlaylist, onRemoveFromLibrary]
  )

  return (
    <>
      <table className="track-table">
        <tbody>
          {tracks.map((track, index) => {
            const isActive = currentTrack?.id === track.id
            return (
              <tr
                key={track.id}
                className={`track-row${isActive ? ' active' : ''}`}
                onClick={() => onPlay(track)}
                onContextMenu={(e) => openMenu(e, track, index)}
              >
                <td className="track-num">{isActive ? '▶' : track.trackNumber || ''}</td>
                <td className="track-title-cell">{track.title}</td>
                {showArtist && <td className="track-meta-cell">{track.artist}</td>}
                {showAlbum && <td className="track-meta-cell">{track.album}</td>}
                <td className="track-dur">{formatDuration(track.duration)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {menu && (
        <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />
      )}
    </>
  )
}
