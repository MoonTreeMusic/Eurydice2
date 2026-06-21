import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import ffmpeg from 'fluent-ffmpeg'

const AUDIO_EXTS = new Set(['.mp3', '.flac', '.aac', '.ogg', '.wav', '.m4a', '.opus', '.wma', '.webm'])

function getLibraryPath() {
  return path.join(app.getPath('userData'), 'library.json')
}

let data = { tracks: [], settings: {}, nextId: 1, playlists: [], nextPlaylistId: 1 }

export function loadLibrary() {
  try {
    const raw = fs.readFileSync(getLibraryPath(), 'utf-8')
    data = JSON.parse(raw)
    if (!data.nextId) data.nextId = data.tracks.length + 1
    if (!data.playlists) data.playlists = []
    if (!data.nextPlaylistId) {
      data.nextPlaylistId = data.playlists.length
        ? Math.max(...data.playlists.map((p) => p.id)) + 1
        : 1
    }
  } catch {
    data = { tracks: [], settings: {}, nextId: 1, playlists: [], nextPlaylistId: 1 }
  }
}

function saveLibrary() {
  fs.writeFileSync(getLibraryPath(), JSON.stringify(data), 'utf-8')
}

function upsertTrack(track) {
  const idx = data.tracks.findIndex((t) => t.path === track.path)
  if (idx >= 0) {
    data.tracks[idx] = { ...data.tracks[idx], ...track }
  } else {
    data.tracks.push({ id: data.nextId++, ...track })
  }
}

async function collectAudioFiles(dir, results) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await collectAudioFiles(fullPath, results)
      } else if (AUDIO_EXTS.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath)
      }
    }
  } catch {
    // skip unreadable dirs
  }
}

export async function scanFolder(folderPath, onProgress) {
  const files = []
  await collectAudioFiles(folderPath, files)

  let count = 0
  for (let i = 0; i < files.length; i++) {
    const filePath = files[i]
    try {
      const metadata = await ffprobePromisified(filePath)
      const tags = metadata.format.tags || {}
      const artist = tags.artist || tags.album_artist || tags.albumartist || 'Unknown Artist'
      const trackNum = tags.track || tags.tracknumber || tags.trkn || '0'
      upsertTrack({
        path: filePath,
        title: tags.title || path.basename(filePath, path.extname(filePath)),
        artist,
        album: tags.album || 'Unknown Album',
        trackNumber: parseInt(trackNum) || 0,
        duration: metadata.format.duration || 0,
        scannedAt: Date.now(),
      })
      count++
    } catch {
      // skip unreadable files
    }
    onProgress?.(i + 1, files.length)
  }

  data.settings.lastScanFolder = folderPath
  saveLibrary()
  return count
}

function ffprobePromisified(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err)
      resolve(metadata)
    })
  })
}

// Permanently removes a track's record from the library (and any playlists it
// belongs to). Does not touch the file on disk; a re-scan will re-add it.
export function deleteTrack(id) {
  const before = data.tracks.length
  data.tracks = data.tracks.filter((t) => t.id !== id)
  for (const pl of data.playlists || []) {
    pl.trackIds = pl.trackIds.filter((tid) => tid !== id)
  }
  if (data.tracks.length !== before) saveLibrary()
  return { removed: before - data.tracks.length }
}

export function getAllTracks() {
  return [...data.tracks].sort((a, b) => {
    const ac = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' })
    if (ac !== 0) return ac
    const bc = a.album.localeCompare(b.album, undefined, { sensitivity: 'base' })
    if (bc !== 0) return bc
    const nc = (a.trackNumber || 999) - (b.trackNumber || 999)
    if (nc !== 0) return nc
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  })
}

export function getSetting(key) {
  return data.settings[key] ?? null
}

// ── Playlist CRUD ─────────────────────────────────────────────────────────────

export function getAllPlaylists() {
  return (data.playlists || []).map((p) => ({
    id: p.id,
    name: p.name,
    trackCount: p.trackIds.length,
    createdAt: p.createdAt,
  }))
}

export function getPlaylistWithTracks(id) {
  const pl = (data.playlists || []).find((p) => p.id === id)
  if (!pl) return null
  const tracks = pl.trackIds
    .map((tid) => data.tracks.find((t) => t.id === tid))
    .filter(Boolean)
  return { id: pl.id, name: pl.name, createdAt: pl.createdAt, tracks }
}

export function createPlaylist(name) {
  const pl = { id: data.nextPlaylistId++, name: name.trim() || 'New Playlist', trackIds: [], createdAt: Date.now() }
  data.playlists.push(pl)
  saveLibrary()
  return { id: pl.id, name: pl.name, trackCount: 0, createdAt: pl.createdAt }
}

export function renamePlaylist(id, name) {
  const pl = (data.playlists || []).find((p) => p.id === id)
  if (!pl) return null
  pl.name = name.trim() || pl.name
  saveLibrary()
  return { id: pl.id, name: pl.name, trackCount: pl.trackIds.length, createdAt: pl.createdAt }
}

export function deletePlaylist(id) {
  data.playlists = (data.playlists || []).filter((p) => p.id !== id)
  saveLibrary()
}

export function addTrackToPlaylist(playlistId, trackId) {
  const pl = (data.playlists || []).find((p) => p.id === playlistId)
  if (!pl) return null
  if (!pl.trackIds.includes(trackId)) {
    pl.trackIds.push(trackId)
    saveLibrary()
  }
  return getPlaylistWithTracks(playlistId)
}

export function removeTrackFromPlaylist(playlistId, trackId) {
  const pl = (data.playlists || []).find((p) => p.id === playlistId)
  if (!pl) return null
  pl.trackIds = pl.trackIds.filter((id) => id !== trackId)
  saveLibrary()
  return getPlaylistWithTracks(playlistId)
}

export function reorderPlaylistTracks(playlistId, trackIds) {
  const pl = (data.playlists || []).find((p) => p.id === playlistId)
  if (!pl) return null
  pl.trackIds = trackIds
  saveLibrary()
  return getPlaylistWithTracks(playlistId)
}
