# Shared types between API and Electron

export interface Track {
  id: number
  path: string
  title: string
  artist: string
  album: string
  trackNumber: number
  duration: number
  scannedAt: number
}

export interface Playlist {
  id: number
  name: string
  trackIds: number[]
  createdAt: number
}

export interface PlaylistWithTracks extends Playlist {
  tracks: Track[]
}

export interface Library {
  tracks: Track[]
  playlists: Playlist[]
  settings: Record<string, unknown>
  nextId: number
  nextPlaylistId: number
}

export interface ScanResult {
  count: number
  tracks: Track[]
}

export interface AudioUrlResponse {
  url: string
  expiresAt: number
}