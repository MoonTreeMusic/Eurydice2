import { useRef } from 'react'
import { formatDuration } from '../../shared/format'

export function SeekBar({ currentTime, duration, onSeek }) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  function handleClick(e) {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    onSeek(ratio * duration)
  }

  return (
    <div className="seek-bar">
      <span className="time">{formatDuration(currentTime)}</span>
      <div className="seek-track" onClick={handleClick} role="slider" aria-label="Seek">
        <div className="seek-fill" style={{ width: `${progress}%` }} />
        <div className="seek-thumb" style={{ left: `${progress}%` }} />
      </div>
      <span className="time">{formatDuration(duration)}</span>
    </div>
  )
}
