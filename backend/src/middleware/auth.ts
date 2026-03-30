/*
  middleware/auth.ts — JWT authentication middleware.

  Protects routes by verifying the Bearer token in the Authorization header.
  If valid, attaches the userId to req so downstream route handlers can use it.
  If invalid or missing, responds with 401 Unauthorized immediately.

  Usage: app.use('/some-route', authMiddleware, routeHandler)
*/

import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Extend Express's Request type to include userId
// This is TypeScript telling the compiler: "req.userId will exist after this middleware runs"
declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string }
    req.userId = payload.userId
    next() // token is valid — pass control to the route handler
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
