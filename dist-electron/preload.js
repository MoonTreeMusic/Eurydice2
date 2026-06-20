"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  openFileDialog: () => electron.ipcRenderer.invoke("open-file-dialog"),
  // Library API
  getTracks: () => electron.ipcRenderer.invoke("library:get-tracks"),
  scanFolder: (folderPath) => electron.ipcRenderer.invoke("library:scan", folderPath),
  chooseFolder: () => electron.ipcRenderer.invoke("library:choose-folder"),
  getSetting: (key) => electron.ipcRenderer.invoke("library:get-setting", key),
  onScanProgress: (cb) => {
    const handler = (_, progress) => cb(progress);
    electron.ipcRenderer.on("library:scan-progress", handler);
    return () => electron.ipcRenderer.off("library:scan-progress", handler);
  },
  // Playlist API
  getPlaylists: () => electron.ipcRenderer.invoke("playlist:get-all"),
  getPlaylistWithTracks: (id) => electron.ipcRenderer.invoke("playlist:get-with-tracks", id),
  createPlaylist: (name) => electron.ipcRenderer.invoke("playlist:create", name),
  renamePlaylist: (id, name) => electron.ipcRenderer.invoke("playlist:rename", id, name),
  deletePlaylist: (id) => electron.ipcRenderer.invoke("playlist:delete", id),
  addTrackToPlaylist: (playlistId, trackId) => electron.ipcRenderer.invoke("playlist:add-track", playlistId, trackId),
  removeTrackFromPlaylist: (playlistId, trackId) => electron.ipcRenderer.invoke("playlist:remove-track", playlistId, trackId),
  reorderPlaylistTracks: (playlistId, trackIds) => electron.ipcRenderer.invoke("playlist:reorder", playlistId, trackIds)
});
