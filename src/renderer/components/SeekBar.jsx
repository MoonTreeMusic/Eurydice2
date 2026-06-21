import { useRef, useState, useCallback } from 'react'
import { formatDuration } from '../../shared/format'

export function SeekBar({ currentTime, duration, onSeek }) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)

  // While scrubbing, show the dragged position instead of the live time so
  // the thumb follows the cursor and isn't fought by timeupdate events.
  const displayTime = dragging ? dragTime : currentTime
  const progress = duration > 0 ? Math.min(100, Math.max(0, (displayTime / duration) * 100)) : 0

  const timeFromClientX = useCallback(
    (clientX) => {
      const el = trackRef.current
      if (!el || !duration) return 0
      const rect = el.getBoundingClientRect()
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0
      return Math.min(duration, Math.max(0, ratio * duration))
    },
    [duration]
  )

  const handlePointerDown = useCallback(
    (e) => {
      if (!duration) return
      e.preventDefault()
      // setPointerCapture keeps move/up events flowing even if the cursor
      // leaves the (thin) track while dragging.
      e.currentTarget.setPointerCapture?.(e.pointerId)
      setDragging(true)
      setDragTime(timeFromClientX(e.clientX))
    },
    [duration, timeFromClientX]
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging) return
      setDragTime(timeFromClientX(e.clientX))
    },
    [dragging, timeFromClientX]
  )

  const handlePointerUp = useCallback(
    (e) => {
      if (!dragging) return
      const time = timeFromClientX(e.clientX)
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      setDragging(false)
      onSeek(time)
    },
    [dragging, timeFromClientX, onSeek]
  )

  const handleKeyDown = useCallback(
    (e) => {
      if (!duration) return
      const step = e.shiftKey ? 10 : 5
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onSeek(Math.min(duration, currentTime + step))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onSeek(Math.max(0, currentTime - step))
      } else if (e.key === 'Home') {
        e.preventDefault()
        onSeek(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        onSeek(duration)
      }
    },
    [duration, currentTime, onSeek]
  )

  return (
    <div className="seek-bar">
      <span className="time">{formatDuration(displayTime)}</span>
      <div
        ref={trackRef}
        className={`seek-track${dragging ? ' dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        aria-valuenow={Math.round(displayTime) || 0}
        aria-valuetext={formatDuration(displayTime)}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="seek-fill" style={{ width: `${progress}%` }} />
        <div className="seek-thumb" style={{ left: `${progress}%` }} />
      </div>
      <span className="time">{formatDuration(duration)}</span>
    </div>
  )
}
