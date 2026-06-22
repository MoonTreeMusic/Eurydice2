import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { config } from './config/index.js'
import { authMiddleware } from './middleware/auth.js'
import libraryRoutes from './routes/library.js'
import playlistRoutes from './routes/playlists.js'
import audioRoutes from './routes/audio.js'

const app = express()

app.use(helmet())
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '500mb' }))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.env })
})

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

app.use('/api/library', authMiddleware, libraryRoutes)
app.use('/api/playlists', authMiddleware, playlistRoutes)
app.use('/api/audio', authMiddleware, audioRoutes)

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    statusCode: 500,
  })
})

app.listen(config.port, () => {
  console.log(`Eurydice API running on port ${config.port} (${config.env})`)
})

export default app