import { useState, useEffect, useCallback, useRef } from 'react'
import { ViewTabs } from './components/ViewTabs'
import { LibraryView } from './components/LibraryView'
import { AlbumsView } from './components/AlbumsView'
import { ArtistsView } from './components/ArtistsView'
import { PlaylistsView } from './components/PlaylistsView'
import { PlayerBar } from './components/PlayerBar'
import { PromptDialog } from './components/PromptDialog'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useAuth, apiClient } from './hooks/useAuth'

export default function App() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const [libraryTracks, setLibraryTracks] = useState([])
  const [scanProgress, setScanProgress] = useState(null)
  const [view, setView] = useState('library')
  const [query, setQuery] = useState('')
  const [playlists, setPlaylists] = useState([])
  const [activePlaylist, setActivePlaylist] = useState(null)
  const [prompt, setPrompt] = useState(null)
  const promptResolve = useRef(null)
  const player = useAudioPlayer()

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
    return apiClient.getPlaylists().then(setPlaylists)
  }, [])

  const refreshActivePlaylist = useCallback(async (id) => {
    const pl = await apiClient.getPlaylistWithTracks(id)
    setActivePlaylist(pl)
    return pl
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.getTracks().then(setLibraryTracks)
      refreshPlaylists()
    }
  }, [isAuthenticated, refreshPlaylists])

  const changeView = useCallback((next) => {
    setView(next)
    setQuery('')
  }, [])

  const handleScanFolder = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = '.mp3,.flac,.aac,.ogg,.wav,.m4a,.opus,.wma,.webm'

    input.onchange = async (e) => {
      const files = Array.from(e.target.files)
      if (files.length === 0) return

      setScanProgress({ current: 0, total: files.length })

      try {
        const filesData = await Promise.all(
          files.map(async (file) => ({
            filename: file.name,
            data: await file.arrayBuffer().then((buf) => Buffer.from(buf).toString('base64')),
          }))
        )

        const result = await apiClient.scanFolder(filesData)
        setLibraryTracks(result.tracks)
      } catch (error) {
        console.error('Scan failed:', error)
        alert('Scan failed: ' + error.message)
      } finally {
        setScanProgress(null)
      }
    }

    input.click()
  }, [])

  const handlePlayTrack = useCallback(
    async (track, queueTracks) => {
      try {
        const playable = await Promise.all(
          queueTracks.map(async (t) => {
            try {
              const { url } = await apiClient.getAudioUrl(t.id)
              return {
                id: t.id,
                name: t.title,
                artist: t.artist,
                url,
              }
            } catch {
              return {
                id: t.id,
                name: t.title,
                artist: t.artist,
                url: null,
              }
            }
          })
        )
        const startIndex = queueTracks.findIndex((t) => t.id === track.id)
        player.loadAndPlayAt(playable, startIndex >= 0 ? startIndex : 0)
      } catch (error) {
        console.error('Failed to get audio URL:', error)
        alert('Failed to play track: ' + error.message)
      }
    },
    [player]
  )

  const handleRemoveFromLibrary = useCallback(
    async (track) => {
      const ok = window.confirm(
        `Remove "${track.title}" from your library?\n\n` +
          'This deletes the library entry only — the file on disk is not affected, ' +
          'and re-scanning will add it back.'
      )
      if (!ok) return
      await apiClient.deleteTrack(track.id)
      setLibraryTracks((prev) => prev.filter((t) => t.id !== track.id))
      refreshPlaylists()
      if (activePlaylist) refreshActivePlaylist(activePlaylist.id)
    },
    [activePlaylist, refreshPlaylists, refreshActivePlaylist]
  )

  const handleAddToPlaylist = useCallback(
    async (track, playlistId) => {
      await apiClient.addTrackToPlaylist(playlistId, track.id)
      refreshPlaylists()
      if (activePlaylist?.id === playlistId) refreshActivePlaylist(playlistId)
    },
    [activePlaylist, refreshPlaylists, refreshActivePlaylist]
  )

  const handleAddToNewPlaylist = useCallback(
    async (track) => {
      const name = await askName('New playlist name', 'New Playlist')
      if (!name) return
      const pl = await apiClient.createPlaylist(name)
      await apiClient.addTrackToPlaylist(pl.id, track.id)
      await refreshPlaylists()
    },
    [askName, refreshPlaylists]
  )

  const handleCreatePlaylist = useCallback(async () => {
    const name = await askName('New playlist name', 'New Playlist')
    if (!name) return
    const pl = await apiClient.createPlaylist(name)
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
      await apiClient.deletePlaylist(id)
      await refreshPlaylists()
      setActivePlaylist((cur) => (cur?.id === id ? null : cur))
    },
    [playlists, refreshPlaylists]
  )

  const handleReorderPlaylist = useCallback(
    async (id, trackIds) => {
      await apiClient.reorderPlaylistTracks(id, trackIds)
      refreshActivePlaylist(id)
    },
    [refreshActivePlaylist]
  )

  const handleRemoveFromPlaylist = useCallback(
    async (id, track) => {
      await apiClient.removeTrackFromPlaylist(id, track.id)
      refreshActivePlaylist(id)
      refreshPlaylists()
    },
    [refreshActivePlaylist, refreshPlaylists]
  )

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

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="login-screen">
          <h1>Eurydice</h1>
          <p>Sign in to access your music library</p>
          <button className="btn-primary" onClick={login}>
            Sign in with Microsoft
          </button>
        </div>
      </div>
    )
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