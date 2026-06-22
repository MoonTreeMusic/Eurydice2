import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'
import { config } from '../config/index.js'

interface AzureADTokenPayload {
  oid: string
  sub: string
  upn?: string
  email?: string
  name?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AzureADTokenPayload
    }
  }
}

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${config.auth.tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 86400000,
})

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err)
      return
    }
    const signingKey = key?.getPublicKey()
    callback(null, signingKey)
  })
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  console.log('Auth middleware:', { path: req.path, hasAuth: !!authHeader })

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
      statusCode: 401,
    })
    return
  }

  const token = authHeader.substring(7)
  console.log('Token starts with:', token.substring(0, 50) + '...')

  console.log('Validating with audience:', config.auth.audience, 'issuer:', config.auth.issuer)

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: config.auth.audience,
      issuer: config.auth.issuer,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        console.error('JWT validation error:', err.message)
        console.error('JWT validation error details:', err.name)
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token: ' + err.message,
          statusCode: 401,
        })
        return
      }

      const payload = decoded as AzureADTokenPayload
      req.user = {
        oid: payload.oid || payload.sub,
        sub: payload.sub,
        upn: payload.upn,
        email: payload.email,
        name: payload.name,
      }

      console.log('Auth successful for user:', req.user.oid)
      next()
    }
  )
}