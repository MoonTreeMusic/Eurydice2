export function TrackList({ tracks, currentIndex, isPlaying, onSelectTrack }) {
  if (tracks.length === 0) {
    return (
      <div className="track-list-empty">
        <p>No tracks loaded</p>
        <p className="hint">Click "Open Files" to add audio files</p>
      </div>
    )
  }

  return (
    <ul className="track-list">
      {tracks.map((track, i) => {
        const isActive = i === currentIndex
        return (
          <li
            key={`${track.path}-${i}`}
            className={`track-item${isActive ? ' active' : ''}`}
            onClick={() => onSelectTrack(i)}
          >
            <span className="track-indicator">
              {isActive ? (isPlaying ? '▶' : '⏸') : String(i + 1).padStart(2, '0')}
            </span>
            <span className="track-name">{track.name}</span>
          </li>
        )
      })}
    </ul>
  )
}
