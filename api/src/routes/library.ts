import { Router, Request, Response } from 'express'
import {
  getAllTracks,
  scanFolder,
  deleteTrack,
  getSetting,
  setSetting,
} from '../services/library.js'

const router = Router()

router.get('/tracks', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const tracks = await getAllTracks(userId)
    res.json({ tracks })
  } catch (error) {
    console.error('Error getting tracks:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to get tracks',
      statusCode: 500,
    })
  }
})

router.post('/scan', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const { files } = req.body

    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'files array is required',
        statusCode: 400,
      })
      return
    }

    const validatedFiles = files.map((f: { filename: string; data: string }) => ({
      filename: f.filename,
      data: Buffer.from(f.data, 'base64'),
    }))

    const result = await scanFolder(userId, validatedFiles)
    res.json(result)
  } catch (error) {
    console.error('Error scanning folder:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to scan folder',
      statusCode: 500,
    })
  }
})

router.delete('/tracks/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const trackId = parseInt(String(req.params.id), 10)

    if (isNaN(trackId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid track ID',
        statusCode: 400,
      })
      return
    }

    const result = await deleteTrack(userId, trackId)
    res.json(result)
  } catch (error) {
    console.error('Error deleting track:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to delete track',
      statusCode: 500,
    })
  }
})

router.get('/settings/:key', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const key = String(req.params.key)
    const value = await getSetting(userId, key)
    res.json({ key, value })
  } catch (error) {
    console.error('Error getting setting:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to get setting',
      statusCode: 500,
    })
  }
})

router.put('/settings/:key', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const key = String(req.params.key)
    const { value } = req.body

    const result = await setSetting(userId, key, value)
    res.json(result)
  } catch (error) {
    console.error('Error setting setting:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to set setting',
      statusCode: 500,
    })
  }
})

export default router