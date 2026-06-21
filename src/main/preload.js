import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),

  // Library API
  getTracks: () => ipcRenderer.invoke('library:get-tracks'),
  deleteTrack: (id) => ipcRenderer.invoke('library:delete-track', id),
  scanFolder: (folderPath) => ipcRenderer.invoke('library:scan', folderPath),
  chooseFolder: () => ipcRenderer.invoke('library:choose-folder'),
  getSetting: (key) => ipcRenderer.invoke('library:get-setting', key),
  onScanProgress: (cb) => {
    const handler = (_, progress) => cb(progress)
    ipcRenderer.on('library:scan-progress', handler)
    return () => ipcRenderer.off('library:scan-progress', handler)
  },

  // Playlist API
  getPlaylists: () => ipcRenderer.invoke('playlist:get-all'),
  getPlaylistWithTracks: (id) => ipcRenderer.invoke('playlist:get-with-tracks', id),
  createPlaylist: (name) => ipcRenderer.invoke('playlist:create', name),
  renamePlaylist: (id, name) => ipcRenderer.invoke('playlist:rename', id, name),
  deletePlaylist: (id) => ipcRenderer.invoke('playlist:delete', id),
  addTrackToPlaylist: (playlistId, trackId) =>
    ipcRenderer.invoke('playlist:add-track', playlistId, trackId),
  removeTrackFromPlaylist: (playlistId, trackId) =>
    ipcRenderer.invoke('playlist:remove-track', playlistId, trackId),
  reorderPlaylistTracks: (playlistId, trackIds) =>
    ipcRenderer.invoke('playlist:reorder', playlistId, trackIds),
})
