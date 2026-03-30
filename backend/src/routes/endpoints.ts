/*
  routes/endpoints.ts — CRUD routes for registered endpoints.

  All routes are protected by authMiddleware — req.userId is always available.
  Users can only create, read, update, and delete their own endpoints.

  GET    /endpoints       → list all endpoints for the logged-in user
  POST   /endpoints       → register a new endpoint to monitor
  PUT    /endpoints/:id   → update an existing endpoint
  DELETE /endpoints/:id   → remove an endpoint
*/

import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// Apply authMiddleware to ALL routes in this file
router.use(authMiddleware)

// GET /endpoints — fetch all endpoints belonging to the logged-in user
router.get('/', async (req: Request, res: Response) => {
  const endpoints = await prisma.endpoint.findMany({
    where: { userId: req.userId }
  })
  res.json(endpoints)
})

// POST /endpoints — register a new endpoint to monitor
router.post('/', async (req: Request, res: Response) => {
  const { name, url, method, headers, tsInterface, webhookUrl, notifyEmail, pollInterval } = req.body

  if (!name || !url) {
    res.status(400).json({ error: 'name and url are required' })
    return
  }

  const endpoint = await prisma.endpoint.create({
    data: {
      userId: req.userId as string,
      name,
      url,
      method: method ?? 'GET',
      headers: headers ?? null,
      tsInterface: tsInterface ?? null,
      webhookUrl: webhookUrl ?? null,
      notifyEmail: notifyEmail ?? true,
      pollInterval: pollInterval ?? 60
    }
  })

  res.status(201).json(endpoint)
})

// PUT /endpoints/:id — update an existing endpoint
router.put('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string

  const existing = await prisma.endpoint.findUnique({ where: { id } })

  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: 'Endpoint not found' })
    return
  }

  const updated = await prisma.endpoint.update({
    where: { id },
    data: req.body
  })

  res.json(updated)
})

// DELETE /endpoints/:id — remove an endpoint
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string

  const existing = await prisma.endpoint.findUnique({ where: { id } })

  if (!existing || existing.userId !== req.userId) {
    res.status(404).json({ error: 'Endpoint not found' })
    return
  }

  await prisma.endpoint.delete({ where: { id } })
  res.json({ message: 'Endpoint deleted' })
})

export default router
