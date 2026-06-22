import ffmpeg from 'fluent-ffmpeg'
import { config } from '../config/index.js'

export interface FfprobeMetadata {
  title: string
  artist: string
  album: string
  trackNumber: number
  duration: number
}

export function ffprobePromisified(filePath: string): Promise<FfprobeMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }

      const tags = metadata.format.tags || {}
      const artist =
        (tags.artist as string) ||
        (tags.album_artist as string) ||
        (tags.albumartist as string) ||
        'Unknown Artist'
      const trackNumRaw = (tags.track as string) || (tags.tracknumber as string) || (tags.trkn as string) || '0'
      const trackNum = parseInt(trackNumRaw, 10) || 0

      resolve({
        title: (tags.title as string) || '',
        artist,
        album: (tags.album as string) || 'Unknown Album',
        trackNumber: trackNum,
        duration: metadata.format.duration || 0,
      })
    })
  })
}