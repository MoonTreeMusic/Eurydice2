import { useRef, useEffect, useCallback } from 'react'
import { SeekBar } from './SeekBar'
import { VolumeControl } from './VolumeControl'

const DOUBLE_CLICK_MS = 280

export function PlayerBar({ player }) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    togglePlay,
    seek,
    setVolume,
    skipNext,
    skipPrev,
    prevTrack,
    shuffle,
    repeat,
    toggleShuffle,
    toggleRepeat,
  } = player

  // The backward button distinguishes a single click (3-second rule: restart
  // the current track if >3s in, otherwise go to the previous track) from a
  // double click (always jump to the previous track) using a short timer.
  const backTimer = useRef(null)

  useEffect(() => () => clearTimeout(backTimer.current), [])

  const handleBack = useCallback(() => {
    if (backTimer.current) {
      // Second click within the window → previous track.
      clearTimeout(backTimer.current)
      backTimer.current = null
      prevTrack()
    } else {
      backTimer.current = setTimeout(() => {
        backTimer.current = null
        skipPrev()
      }, DOUBLE_CLICK_MS)
    }
  }, [skipPrev, prevTrack])

  return (
    <div className="player-bar">
      <div className="player-bar-info">
        {currentTrack ? (
          <>
            <span className="player-bar-title">{currentTrack.name}</span>
            {currentTrack.artist && (
              <span className="player-bar-artist">{currentTrack.artist}</span>
            )}
          </>
        ) : (
          <span className="player-bar-idle">Nothing playing</span>
        )}
      </div>

      <div className="player-bar-center">
        <div className="player-bar-controls">
          <button
            className={`btn-toggle${shuffle ? ' active' : ''}`}
            onClick={toggleShuffle}
            aria-label="Shuffle"
            aria-pressed={shuffle}
            title={shuffle ? 'Shuffle: on' : 'Shuffle: off'}
          >
            🔀
          </button>
          <button
            className="btn-skip"
            onClick={handleBack}
            disabled={!currentTrack}
            aria-label="Previous (restarts track if more than 3s in; double-click for previous track)"
            title="Restart / previous · double-click for previous track"
          >
            ⏮
          </button>
          <button
            className={`btn-play${isPlaying ? ' playing' : ''}`}
            onClick={togglePlay}
            disabled={!currentTrack}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="btn-skip"
            onClick={skipNext}
            disabled={!currentTrack}
            aria-label="Next track"
            title="Next track"
          >
            ⏭
          </button>
          <button
            className={`btn-toggle${repeat !== 'off' ? ' active' : ''}`}
            onClick={toggleRepeat}
            aria-label={`Repeat: ${repeat}`}
            title={
              repeat === 'one'
                ? 'Repeat: one song'
                : repeat === 'all'
                  ? 'Repeat: all'
                  : 'Repeat: off'
            }
          >
            {repeat === 'one' ? '🔂' : '🔁'}
          </button>
        </div>
        <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} />
      </div>

      <div className="player-bar-volume">
        <VolumeControl volume={volume} onVolumeChange={setVolume} />
      </div>
    </div>
  )
}
