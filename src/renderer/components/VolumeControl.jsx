export function VolumeControl({ volume, onVolumeChange }) {
  function getIcon() {
    if (volume === 0) return '🔇'
    if (volume < 0.4) return '🔈'
    if (volume < 0.7) return '🔉'
    return '🔊'
  }

  return (
    <div className="volume-control">
      <span className="volume-icon" onClick={() => onVolumeChange(volume > 0 ? 0 : 0.7)}>
        {getIcon()}
      </span>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="volume-slider"
        aria-label="Volume"
      />
    </div>
  )
}
