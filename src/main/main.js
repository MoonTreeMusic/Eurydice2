import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'url'
import path from 'path'
import { localFileUrl } from '../shared/format.js'
import {
  loadLibrary,
  scanFolder,
  getAllTracks,
  deleteTrack,
  getSetting,
  getAllPlaylists,
  getPlaylistWithTracks,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
} from './library.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#0f0f0f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  loadLibrary()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'flac', 'm4a', 'wav', 'ogg', 'aac', 'wma', 'webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (result.canceled || result.filePaths.length === 0) return null

  return result.filePaths.map((filePath) => ({
    path: filePath,
    name: path.basename(filePath),
    url: localFileUrl(filePath),
  }))
})

ipcMain.handle('library:get-tracks', () => getAllTracks())

ipcMain.handle('library:delete-track', (_e, id) => deleteTrack(id))

ipcMain.handle('library:scan', async (event, folderPath) => {
  const count = await scanFolder(folderPath, (current, total) => {
    mainWindow?.webContents.send('library:scan-progress', { current, total })
  })
  return { count, tracks: getAllTracks() }
})

ipcMain.handle('library:choose-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose Music Folder',
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('library:get-setting', (_event, key) => getSetting(key))

// ── Playlist IPC ──────────────────────────────────────────────────────────────

ipcMain.handle('playlist:get-all', () => getAllPlaylists())
ipcMain.handle('playlist:get-with-tracks', (_e, id) => getPlaylistWithTracks(id))
ipcMain.handle('playlist:create', (_e, name) => createPlaylist(name))
ipcMain.handle('playlist:rename', (_e, id, name) => renamePlaylist(id, name))
ipcMain.handle('playlist:delete', (_e, id) => deletePlaylist(id))
ipcMain.handle('playlist:add-track', (_e, playlistId, trackId) =>
  addTrackToPlaylist(playlistId, trackId)
)
ipcMain.handle('playlist:remove-track', (_e, playlistId, trackId) =>
  removeTrackFromPlaylist(playlistId, trackId)
)
ipcMain.handle('playlist:reorder', (_e, playlistId, trackIds) =>
  reorderPlaylistTracks(playlistId, trackIds)
)
