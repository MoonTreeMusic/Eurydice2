import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { SeekBar } from './SeekBar'
import { VolumeControl } from './VolumeControl'
import { TrackList } from './TrackList'

export function Player() {
  const {
    tracks,
    currentTrack,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    error,
    loadTracks,
    togglePlay,
    seek,
    setVolume,
    selectTrack,
    clearTracks,
  } = useAudioPlayer()

  async function openFiles() {
    const files = await window.electronAPI.openFileDialog()
    if (files && files.length > 0) {
      loadTracks(files)
    }
  }

  return (
    <div className="player">
      <div className="track-panel">
        <div className="track-panel-header">
          <span className="panel-title">Queue ({tracks.length})</span>
          <div className="panel-actions">
            <button className="btn-icon" onClick={openFiles} title="Add files">+ Open Files</button>
            {tracks.length > 0 && (
              <button className="btn-icon btn-danger" onClick={clearTracks} title="Clear all">Clear</button>
            )}
          </div>
        </div>
        <TrackList
          tracks={tracks}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          onSelectTrack={selectTrack}
        />
      </div>

      <div className="controls-panel">
        {error && <div className="error-banner">{error}</div>}

        <div className="now-playing">
          {currentTrack
            ? <span className="now-playing-name">{currentTrack.name}</span>
            : <span className="now-playing-idle">No track selected</span>
          }
        </div>

        <SeekBar currentTime={currentTime} duration={duration} onSeek={seek} />

        <div className="transport">
          <button
            className={`btn-play ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlay}
            disabled={tracks.length === 0}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <VolumeControl volume={volume} onVolumeChange={setVolume} />
        </div>
      </div>
    </div>
  )
}
