import { SeekBar } from './SeekBar'
import { VolumeControl } from './VolumeControl'

export function PlayerBar({ player }) {
  const { currentTrack, isPlaying, currentTime, duration, volume, togglePlay, seek, setVolume } =
    player

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
        <button
          className={`btn-play${isPlaying ? ' playing' : ''}`}
          onClick={togglePlay}
          disabled={!currentTrack}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} />
      </div>

      <div className="player-bar-volume">
        <VolumeControl volume={volume} onVolumeChange={setVolume} />
      </div>
    </div>
  )
}
