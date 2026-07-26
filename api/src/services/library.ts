import type { Library, Track, Playlist, PlaylistWithTracks } from '../types.js'
import { getLibrary, saveLibrary, uploadTrackFile, deleteTrackFile } from './blobStorage.js'
import { ffprobePromisified } from './ffprobe.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

export async function getAllTracks(userId: string, userAccessToken: string): Promise<Track[]> {
  const library = await getLibrary(userId, userAccessToken)
  return sortTracks(library.tracks)
}

function sortTracks(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => {
    const ac = a.artist.localeCompare(b.artist, undefined, { sensitivity: 'base' })
    if (ac !== 0) return ac
    const bc = a.album.localeCompare(b.album, undefined, { sensitivity: 'base' })
    if (bc !== 0) return bc
    const nc = (a.trackNumber || 999) - (b.trackNumber || 999)
    if (nc !== 0) return nc
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  })
}

export async function scanFolder(
  userId: string,
  userAccessToken: string,
  files: { filename: string; data: Buffer }[],
  onProgress?: (current: number, total: number) => void
): Promise<{ count: number; tracks: Track[] }> {
  const library = await getLibrary(userId, userAccessToken)
  let count = 0
  const tempDir = os.tmpdir()

  for (let i = 0; i < files.length; i++) {
    const { filename, data } = files[i]

    try {
      const tempFilePath = path.join(tempDir, `eurydice_${Date.now()}_${filename}`)
      fs.writeFileSync(tempFilePath, data)

      const metadata = await ffprobePromisified(tempFilePath)
      const trackId = library.nextId++

      const blobPath = await uploadTrackFile(userId, trackId, filename, data, userAccessToken)

      const track: Track = {
        id: trackId,
        path: blobPath,
        title: metadata.title || filename.replace(/\.[^/.]+$/, ''),
        artist: metadata.artist,
        album: metadata.album,
        trackNumber: metadata.trackNumber,
        duration: metadata.duration,
        scannedAt: Date.now(),
      }

      const existingIdx = library.tracks.findIndex((t) => t.path === blobPath)
      if (existingIdx >= 0) {
        library.tracks[existingIdx] = { ...library.tracks[existingIdx], ...track }
      } else {
        library.tracks.push(track)
      }

      count++

      fs.unlinkSync(tempFilePath)
    } catch (error) {
      console.error(`Error processing ${filename}:`, error)
    }

    onProgress?.(i + 1, files.length)
  }

  await saveLibrary(userId, library, userAccessToken)

  return { count, tracks: sortTracks(library.tracks) }
}

export async function deleteTrack(userId: string, userAccessToken: string, trackId: number): Promise<{ removed: number }> {
  const library = await getLibrary(userId, userAccessToken)
  const track = library.tracks.find((t) => t.id === trackId)

  if (!track) {
    return { removed: 0 }
  }

  try {
    await deleteTrackFile(userId, track.path, userAccessToken)
  } catch (error) {
    console.error('Error deleting track file:', error)
  }

  library.tracks = library.tracks.filter((t) => t.id !== trackId)

  for (const playlist of library.playlists || []) {
    playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId)
  }

  await saveLibrary(userId, library, userAccessToken)

  return { removed: 1 }
}

export async function getSetting(userId: string, userAccessToken: string, key: string): Promise<unknown> {
  const library = await getLibrary(userId, userAccessToken)
  return library.settings[key] ?? null
}

export async function setSetting(
  userId: string,
  userAccessToken: string,
  key: string,
  value: unknown
): Promise<{ key: string; value: unknown }> {
  const library = await getLibrary(userId, userAccessToken)
  library.settings[key] = value
  await saveLibrary(userId, library, userAccessToken)
  return { key, value }
}

export async function getAllPlaylists(
  userId: string,
  userAccessToken: string
): Promise<{ id: number; name: string; trackCount: number; createdAt: number }[]> {
  const library = await getLibrary(userId, userAccessToken)
  return library.playlists.map((p) => ({
    id: p.id,
    name: p.name,
    trackCount: p.trackIds.length,
    createdAt: p.createdAt,
  }))
}

export async function getPlaylistWithTracks(
  userId: string,
  userAccessToken: string,
  playlistId: number
): Promise<PlaylistWithTracks | null> {
  const library = await getLibrary(userId, userAccessToken)
  const playlist = library.playlists.find((p) => p.id === playlistId)

  if (!playlist) {
    return null
  }

  const tracks = playlist.trackIds
    .map((tid) => library.tracks.find((t) => t.id === tid))
    .filter((t): t is Track => t !== undefined)

  return { ...playlist, tracks }
}

export async function createPlaylist(
  userId: string,
  userAccessToken: string,
  name: string
): Promise<{ id: number; name: string; trackCount: number; createdAt: number }> {
  const library = await getLibrary(userId, userAccessToken)

  const playlist: Playlist = {
    id: library.nextPlaylistId++,
    name: name.trim() || 'New Playlist',
    trackIds: [],
    createdAt: Date.now(),
  }

  library.playlists.push(playlist)
  await saveLibrary(userId, library, userAccessToken)

  return {
    id: playlist.id,
    name: playlist.name,
    trackCount: 0,
    createdAt: playlist.createdAt,
  }
}

export async function renamePlaylist(
  userId: string,
  userAccessToken: string,
  playlistId: number,
  name: string
): Promise<PlaylistWithTracks | null> {
  const library = await getLibrary(userId, userAccessToken)
  const playlist = library.playlists.find((p) => p.id === playlistId)

  if (!playlist) {
    return null
  }

  playlist.name = name.trim() || playlist.name
  await saveLibrary(userId, library, userAccessToken)

  const tracks = playlist.trackIds
    .map((tid) => library.tracks.find((t) => t.id === tid))
    .filter((t): t is Track => t !== undefined)

  return { ...playlist, tracks }
}

export async function deletePlaylist(userId: string, userAccessToken: string, playlistId: number): Promise<void> {
  const library = await getLibrary(userId, userAccessToken)
  library.playlists = library.playlists.filter((p) => p.id !== playlistId)
  await saveLibrary(userId, library, userAccessToken)
}

export async function addTrackToPlaylist(
  userId: string,
  userAccessToken: string,
  playlistId: number,
  trackId: number
): Promise<PlaylistWithTracks | null> {
  const library = await getLibrary(userId, userAccessToken)
  const playlist = library.playlists.find((p) => p.id === playlistId)

  if (!playlist) {
    return null
  }

  if (!playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId)
    await saveLibrary(userId, library, userAccessToken)
  }

  const tracks = playlist.trackIds
    .map((tid) => library.tracks.find((t) => t.id === tid))
    .filter((t): t is Track => t !== undefined)

  return { ...playlist, tracks }
}

export async function removeTrackFromPlaylist(
  userId: string,
  userAccessToken: string,
  playlistId: number,
  trackId: number
): Promise<PlaylistWithTracks | null> {
  const library = await getLibrary(userId, userAccessToken)
  const playlist = library.playlists.find((p) => p.id === playlistId)

  if (!playlist) {
    return null
  }

  playlist.trackIds = playlist.trackIds.filter((id) => id !== trackId)
  await saveLibrary(userId, library, userAccessToken)

  const tracks = playlist.trackIds
    .map((tid) => library.tracks.find((t) => t.id === tid))
    .filter((t): t is Track => t !== undefined)

  return { ...playlist, tracks }
}

export async function reorderPlaylistTracks(
  userId: string,
  userAccessToken: string,
  playlistId: number,
  trackIds: number[]
): Promise<PlaylistWithTracks | null> {
  const library = await getLibrary(userId, userAccessToken)
  const playlist = library.playlists.find((p) => p.id === playlistId)

  if (!playlist) {
    return null
  }

  playlist.trackIds = trackIds
  await saveLibrary(userId, library, userAccessToken)

  const tracks = playlist.trackIds
    .map((tid) => library.tracks.find((t) => t.id === tid))
    .filter((t): t is Track => t !== undefined)

  return { ...playlist, tracks }
}

export async function getTrackById(
  userId: string,
  userAccessToken: string,
  trackId: number
): Promise<Track | null> {
  const library = await getLibrary(userId, userAccessToken)
  return library.tracks.find((t) => t.id === trackId) || null
}
