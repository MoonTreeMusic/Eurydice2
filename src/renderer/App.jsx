import { useState, useEffect, useCallback } from 'react'
import { Library } from './components/Library'
import { PlayerBar } from './components/PlayerBar'
import { useAudioPlayer } from './hooks/useAudioPlayer'

export default function App() {
  const [libraryTracks, setLibraryTracks] = useState([])
  const [scanProgress, setScanProgress] = useState(null)
  const player = useAudioPlayer()

  useEffect(() => {
    window.electronAPI.getTracks().then(setLibraryTracks)
    const unsub = window.electronAPI.onScanProgress((p) => setScanProgress(p))
    return unsub
  }, [])

  const handleScanFolder = useCallback(async () => {
    const folderPath = await window.electronAPI.chooseFolder()
    if (!folderPath) return
    setScanProgress({ current: 0, total: 0 })
    const result = await window.electronAPI.scanFolder(folderPath)
    setScanProgress(null)
    setLibraryTracks(result.tracks)
  }, [])

  const handlePlayTrack = useCallback(
    (track, albumTracks) => {
      const playable = albumTracks.map((t) => ({
        path: t.path,
        name: t.title,
        artist: t.artist,
        url: `local-file://${t.path.replace(/\\/g, '/')}`,
      }))
      const startIndex = albumTracks.findIndex((t) => t.id === track.id)
      player.loadAndPlayAt(playable, startIndex >= 0 ? startIndex : 0)
    },
    [player]
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Moo Music</h1>
        <div className="header-actions">
          {scanProgress ? (
            <span className="scan-status">
              Scanning {scanProgress.current}/{scanProgress.total || '…'}
            </span>
          ) : (
            <button className="btn-icon" onClick={handleScanFolder}>
              + Scan Folder
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        {libraryTracks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">♪</div>
            <p className="empty-message">No music in library</p>
            <button className="btn-icon" onClick={handleScanFolder}>
              Scan a Folder
            </button>
          </div>
        ) : (
          <Library
            tracks={libraryTracks}
            currentTrack={player.currentTrack}
            onPlayTrack={handlePlayTrack}
          />
        )}
      </main>

      <PlayerBar player={player} />
    </div>
  )
}
