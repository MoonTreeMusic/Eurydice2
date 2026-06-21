import { useState, useEffect, useCallback, useRef } from 'react'
import { ViewTabs } from './components/ViewTabs'
import { LibraryView } from './components/LibraryView'
import { AlbumsView } from './components/AlbumsView'
import { ArtistsView } from './components/ArtistsView'
import { PlaylistsView } from './components/PlaylistsView'
import { PlayerBar } from './components/PlayerBar'
import { PromptDialog } from './components/PromptDialog'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { localFileUrl } from '../shared/format.js'

export default function App() {
  const [libraryTracks, setLibraryTracks] = useState([])
  const [scanProgress, setScanProgress] = useState(null)
  const [view, setView] = useState('library')
  const [query, setQuery] = useState('')
  const [playlists, setPlaylists] = useState([])
  const [activePlaylist, setActivePlaylist] = useState(null) // { id, name, tracks }
  const [prompt, setPrompt] = useState(null) // { title, defaultValue }
  const promptResolve = useRef(null)
  const player = useAudioPlayer()

  // window.prompt() isn't supported in Electron, so use an in-app dialog.
  // Resolves to the entered string, or null if cancelled.
  const askName = useCallback((title, defaultValue = '') => {
    return new Promise((resolve) => {
      promptResolve.current = resolve
      setPrompt({ title, defaultValue })
    })
  }, [])

  const closePrompt = useCallback((value) => {
    setPrompt(null)
    const resolve = promptResolve.current
    promptResolve.current = null
    resolve?.(value)
  }, [])

  const refreshPlaylists = useCallback(() => {
    return window.electronAPI.getPlaylists().then(setPlaylists)
  }, [])

  const refreshActivePlaylist = useCallback(async (id) => {
    const pl = await window.electronAPI.getPlaylistWithTracks(id)
    setActivePlaylist(pl)
    return pl
  }, [])

  useEffect(() => {
    window.electronAPI.getTracks().then(setLibraryTracks)
    refreshPlaylists()
    const unsub = window.electronAPI.onScanProgress((p) => setScanProgress(p))
    return unsub
  }, [refreshPlaylists])

  const changeView = useCallback((next) => {
    setView(next)
    setQuery('') // search resets per view
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
    (track, queueTracks) => {
      const playable = queueTracks.map((t) => ({
        id: t.id,
        path: t.path,
        name: t.title,
        artist: t.artist,
        url: localFileUrl(t.path),
      }))
      const startIndex = queueTracks.findIndex((t) => t.id === track.id)
      player.loadAndPlayAt(playable, startIndex >= 0 ? startIndex : 0)
    },
    [player]
  )

  const handleRemoveFromLibrary = useCallback(
    async (track) => {
      const ok = window.confirm(
        `Remove "${track.title}" from your library?\n\n` +
          'This deletes the library entry only — the file on disk is not affected, ' +
          'and re-scanning the folder will add it back.'
      )
      if (!ok) return
      await window.electronAPI.deleteTrack(track.id)
      setLibraryTracks((prev) => prev.filter((t) => t.id !== track.id))
      // The track may also have been in playlists.
      refreshPlaylists()
      if (activePlaylist) refreshActivePlaylist(activePlaylist.id)
    },
    [activePlaylist, refreshPlaylists, refreshActivePlaylist]
  )

  const handleAddToPlaylist = useCallback(
    async (track, playlistId) => {
      await window.electronAPI.addTrackToPlaylist(playlistId, track.id)
      refreshPlaylists()
      if (activePlaylist?.id === playlistId) refreshActivePlaylist(playlistId)
    },
    [activePlaylist, refreshPlaylists, refreshActivePlaylist]
  )

  const handleAddToNewPlaylist = useCallback(
    async (track) => {
      const name = await askName('New playlist name', 'New Playlist')
      if (!name) return
      const pl = await window.electronAPI.createPlaylist(name)
      await window.electronAPI.addTrackToPlaylist(pl.id, track.id)
      await refreshPlaylists()
    },
    [askName, refreshPlaylists]
  )

  const handleCreatePlaylist = useCallback(async () => {
    const name = await askName('New playlist name', 'New Playlist')
    if (!name) return
    const pl = await window.electronAPI.createPlaylist(name)
    await refreshPlaylists()
    await refreshActivePlaylist(pl.id)
  }, [askName, refreshPlaylists, refreshActivePlaylist])

  const handleSelectPlaylist = useCallback(
    (id) => refreshActivePlaylist(id),
    [refreshActivePlaylist]
  )

  const handleDeletePlaylist = useCallback(
    async (id) => {
      const pl = playlists.find((p) => p.id === id)
      if (!window.confirm(`Delete playlist "${pl?.name ?? ''}"? This cannot be undone.`)) return
      await window.electronAPI.deletePlaylist(id)
      await refreshPlaylists()
      setActivePlaylist((cur) => (cur?.id === id ? null : cur))
    },
    [playlists, refreshPlaylists]
  )

  const handleReorderPlaylist = useCallback(
    async (id, trackIds) => {
      await window.electronAPI.reorderPlaylistTracks(id, trackIds)
      refreshActivePlaylist(id)
    },
    [refreshActivePlaylist]
  )

  const handleRemoveFromPlaylist = useCallback(
    async (id, track) => {
      await window.electronAPI.removeTrackFromPlaylist(id, track.id)
      refreshActivePlaylist(id)
      refreshPlaylists()
    },
    [refreshActivePlaylist, refreshPlaylists]
  )

  // Shared track context-menu actions passed to every view.
  const menuProps = {
    playlists,
    onAddToPlaylist: handleAddToPlaylist,
    onAddToNewPlaylist: handleAddToNewPlaylist,
    onRemoveFromLibrary: handleRemoveFromLibrary,
  }

  const viewShared = {
    tracks: libraryTracks,
    query,
    currentTrack: player.currentTrack,
    onPlayTrack: handlePlayTrack,
    menuProps,
  }

  function renderView() {
    if (view === 'playlists') {
      return (
        <PlaylistsView
          playlists={playlists}
          activePlaylist={activePlaylist}
          query={query}
          currentTrack={player.currentTrack}
          onPlayTrack={handlePlayTrack}
          onCreatePlaylist={handleCreatePlaylist}
          onSelectPlaylist={handleSelectPlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onReorderPlaylist={handleReorderPlaylist}
          onRemoveFromPlaylist={handleRemoveFromPlaylist}
          menuProps={menuProps}
        />
      )
    }
    if (libraryTracks.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">♪</div>
          <p className="empty-message">No music in library</p>
          <button className="btn-icon" onClick={handleScanFolder}>
            Scan a Folder
          </button>
        </div>
      )
    }
    if (view === 'albums') return <AlbumsView {...viewShared} />
    if (view === 'artists') return <ArtistsView {...viewShared} />
    return <LibraryView {...viewShared} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Eurydice</h1>
        <ViewTabs view={view} onChange={changeView} />
        <div className="header-actions">
          <input
            className="search-input"
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search tracks"
          />
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

      <main className="app-main">{renderView()}</main>

      <PlayerBar player={player} />

      {prompt && (
        <PromptDialog
          title={prompt.title}
          defaultValue={prompt.defaultValue}
          onSubmit={(value) => closePrompt(value)}
          onCancel={() => closePrompt(null)}
        />
      )}
    </div>
  )
}
