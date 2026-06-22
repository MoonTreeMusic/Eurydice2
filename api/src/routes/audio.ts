import { Router, Request, Response } from 'express'
import { getTrackById } from '../services/library.js'
import { getSignedTrackUrl } from '../services/blobStorage.js'

const router = Router()

router.get('/:trackId/url', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const trackId = parseInt(String(req.params.trackId), 10)

    if (isNaN(trackId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid track ID',
        statusCode: 400,
      })
      return
    }

    const track = await getTrackById(userId, trackId)

    if (!track) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Track not found',
        statusCode: 404,
      })
      return
    }

    const expiresInSeconds = 3600
    const { url, expiresAt } = await getSignedTrackUrl(userId, track.path, expiresInSeconds)

    res.json({ url, expiresAt })
  } catch (error) {
    console.error('Error getting audio URL:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to get audio URL',
      statusCode: 500,
    })
  }
})

export default router