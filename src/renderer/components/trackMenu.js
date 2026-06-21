// Builds the right-click menu items for a track row. Centralized so every view
// (Library, Albums, Artists, Playlists) offers a consistent menu. Sections are
// included only when the relevant callbacks are provided:
//   - reorder: { onMove(track, dir), onRemoveFromList(track) } (optional)
//   - playlists + onAddToPlaylist: "Add to <name>" entries
//   - onAddToNewPlaylist: "Add to new playlist…"
//   - onRemoveFromLibrary: destructive "Remove from library"
export function buildTrackMenuItems({
  track,
  index,
  listLength,
  reorder,
  playlists = [],
  onAddToPlaylist,
  onAddToNewPlaylist,
  onRemoveFromLibrary,
}) {
  const items = []

  if (reorder?.onMove) {
    items.push({
      label: 'Move Up',
      disabled: index <= 0,
      onClick: () => reorder.onMove(track, -1),
    })
    items.push({
      label: 'Move Down',
      disabled: index < 0 || index >= listLength - 1,
      onClick: () => reorder.onMove(track, 1),
    })
  }

  if ((playlists.length && onAddToPlaylist) || onAddToNewPlaylist) {
    if (items.length) items.push({ separator: true })
    for (const pl of playlists) {
      items.push({ label: `Add to "${pl.name}"`, onClick: () => onAddToPlaylist(track, pl.id) })
    }
    if (onAddToNewPlaylist) {
      items.push({ label: 'Add to new playlist…', onClick: () => onAddToNewPlaylist(track) })
    }
  }

  const destructive = []
  if (reorder?.onRemoveFromList) {
    destructive.push({
      label: 'Remove from list',
      danger: true,
      onClick: () => reorder.onRemoveFromList(track),
    })
  }
  if (onRemoveFromLibrary) {
    destructive.push({
      label: 'Remove from library',
      danger: true,
      onClick: () => onRemoveFromLibrary(track),
    })
  }
  if (destructive.length) {
    if (items.length) items.push({ separator: true })
    items.push(...destructive)
  }

  return items
}
