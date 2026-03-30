/*
  routes/alerts.ts — Read and manage alerts for the logged-in user.

  GET  /alerts          → fetch all alerts across all of the user's endpoints
  GET  /alerts/:id      → fetch a single alert
  PUT  /alerts/:id/seen → mark an alert as seen

  Alerts are created by the poller, not by the user directly.
  All routes are protected by authMiddleware.
*/

import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

router.use(authMiddleware)

// GET /alerts — fetch all alerts for the logged-in user
router.get('/', async (req: Request, res: Response) => {
  const alerts = await prisma.alert.findMany({
    where: {
      endpoint: { userId: req.userId }
    },
    include: {
      endpoint: { select: { name: true, url: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  res.json(alerts)
})

// GET /alerts/:id — fetch a single alert
router.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string

  const alert = await prisma.alert.findUnique({
    where: { id },
    include: {
      endpoint: { select: { name: true, url: true, userId: true } }
    }
  })

  if (!alert || alert.endpoint.userId !== req.userId) {
    res.status(404).json({ error: 'Alert not found' })
    return
  }

  res.json(alert)
})

// PUT /alerts/:id/seen — mark an alert as seen
router.put('/:id/seen', async (req: Request, res: Response) => {
  const id = req.params.id as string

  const alert = await prisma.alert.findUnique({
    where: { id },
    include: { endpoint: { select: { name: true, url: true, userId: true } } }
  })

  if (!alert || alert.endpoint.userId !== req.userId) {
    res.status(404).json({ error: 'Alert not found' })
    return
  }

  const updated = await prisma.alert.update({
    where: { id },
    data: { seen: true }
  })

  res.json(updated)
})

export default router
