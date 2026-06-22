import { Router, Request, Response } from 'express'
import {
  getAllPlaylists,
  getPlaylistWithTracks,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
} from '../services/library.js'

const router = Router()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const playlists = await getAllPlaylists(userId)
    res.json({ playlists })
  } catch (error) {
    console.error('Error getting playlists:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to get playlists',
      statusCode: 500,
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const { name } = req.body

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        error: 'BadRequest',
        message: 'name is required',
        statusCode: 400,
      })
      return
    }

    const playlist = await createPlaylist(userId, name)
    res.status(201).json(playlist)
  } catch (error) {
    console.error('Error creating playlist:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create playlist',
      statusCode: 500,
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const playlistId = parseInt(String(req.params.id), 10)

    if (isNaN(playlistId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid playlist ID',
        statusCode: 400,
      })
      return
    }

    const playlist = await getPlaylistWithTracks(userId, playlistId)

    if (!playlist) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Playlist not found',
        statusCode: 404,
      })
      return
    }

    res.json(playlist)
  } catch (error) {
    console.error('Error getting playlist:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to get playlist',
      statusCode: 500,
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const playlistId = parseInt(String(req.params.id), 10)
    const { name } = req.body

    if (isNaN(playlistId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid playlist ID',
        statusCode: 400,
      })
      return
    }

    if (!name || typeof name !== 'string') {
      res.status(400).json({
        error: 'BadRequest',
        message: 'name is required',
        statusCode: 400,
      })
      return
    }

    const playlist = await renamePlaylist(userId, playlistId, name)

    if (!playlist) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Playlist not found',
        statusCode: 404,
      })
      return
    }

    res.json(playlist)
  } catch (error) {
    console.error('Error renaming playlist:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to rename playlist',
      statusCode: 500,
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const playlistId = parseInt(String(req.params.id), 10)

    if (isNaN(playlistId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid playlist ID',
        statusCode: 400,
      })
      return
    }

    await deletePlaylist(userId, playlistId)
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting playlist:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to delete playlist',
      statusCode: 500,
    })
  }
})

router.post('/:id/tracks', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const playlistId = parseInt(String(req.params.id), 10)
    const { trackId } = req.body

    if (isNaN(playlistId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid playlist ID',
        statusCode: 400,
      })
      return
    }

    if (typeof trackId !== 'number') {
      res.status(400).json({
        error: 'BadRequest',
        message: 'trackId is required',
        statusCode: 400,
      })
      return
    }

    const playlist = await addTrackToPlaylist(userId, playlistId, trackId)

    if (!playlist) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Playlist not found',
        statusCode: 404,
      })
      return
    }

    res.json(playlist)
  } catch (error) {
    console.error('Error adding track to playlist:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to add track to playlist',
      statusCode: 500,
    })
  }
})

router.delete('/:id/tracks/:trackId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const playlistId = parseInt(String(req.params.id), 10)
    const trackId = parseInt(String(req.params.trackId), 10)

    if (isNaN(playlistId) || isNaN(trackId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid playlist or track ID',
        statusCode: 400,
      })
      return
    }

    const playlist = await removeTrackFromPlaylist(userId, playlistId, trackId)

    if (!playlist) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Playlist not found',
        statusCode: 404,
      })
      return
    }

    res.json(playlist)
  } catch (error) {
    console.error('Error removing track from playlist:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to remove track from playlist',
      statusCode: 500,
    })
  }
})

router.put('/:id/tracks', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.oid
    const playlistId = parseInt(String(req.params.id), 10)
    const { trackIds } = req.body

    if (isNaN(playlistId)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid playlist ID',
        statusCode: 400,
      })
      return
    }

    if (!Array.isArray(trackIds)) {
      res.status(400).json({
        error: 'BadRequest',
        message: 'trackIds array is required',
        statusCode: 400,
      })
      return
    }

    const playlist = await reorderPlaylistTracks(userId, playlistId, trackIds)

    if (!playlist) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Playlist not found',
        statusCode: 404,
      })
      return
    }

    res.json(playlist)
  } catch (error) {
    console.error('Error reordering playlist tracks:', error)
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to reorder playlist tracks',
      statusCode: 500,
    })
  }
})

export default router