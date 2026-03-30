/*
  services/poller.ts — Scheduled polling engine.

  On app start, loads all registered endpoints from the database and schedules
  a cron job for each one based on its pollInterval (in minutes).

  Each job:
  1. Hits the endpoint URL with its registered headers
  2. Extracts the shape of the response
  3. Compares with the last snapshot
  4. Creates a DRIFT alert if the shape changed
  5. Saves a new snapshot regardless of whether drift was detected

  New endpoints registered after app start are picked up via startPollingForEndpoint().
*/

import * as cron from 'node-cron'
import axios from 'axios'
import prisma from '../lib/prisma'
import { extractShape, diffShapes, hasDrift, diffContract, hasContractViolation, Shape } from './differ'
import { saveSnapshot, getLatestSnapshot } from './snapshotStore'
import { parseTsInterface } from '../utils/tsInterfaceParser'

// Stores active cron tasks by endpointId so we can cancel them if needed
const activeTasks: Map<string, cron.ScheduledTask> = new Map()

/*
  pollEndpoint — core polling logic for a single endpoint.
  Called by each scheduled cron job.
*/
async function pollEndpoint(endpointId: string): Promise<void> {
  const endpoint = await prisma.endpoint.findUnique({ where: { id: endpointId } })
  if (!endpoint) return

  try {
    // Hit the registered URL with any stored headers
    const response = await axios({
      method: endpoint.method,
      url: endpoint.url,
      headers: (endpoint.headers as Record<string, string>) ?? {}
    })

    // Extract just the shape from the response
    const newShape = extractShape(response.data)

    // Get the last snapshot to compare against
    const lastSnapshot = await getLatestSnapshot(endpointId)

    if (lastSnapshot) {
      const lastShape = lastSnapshot.shape as Shape
      const diff = diffShapes(lastShape, newShape)

      if (hasDrift(diff)) {
        // Shape changed — create a DRIFT alert
        await prisma.alert.create({
          data: {
            endpointId,
            type: 'DRIFT',
            diff: diff as object
          }
        })
        console.log(`[DRIFT DETECTED] Endpoint: ${endpoint.name}`, diff)
      }
    }

    // Contract check — if a TS interface is registered, compare against live shape
    if (endpoint.tsInterface) {
      const interfaceShape = parseTsInterface(endpoint.tsInterface)
      const contractDiff = diffContract(interfaceShape, newShape)

      if (hasContractViolation(contractDiff)) {
        await prisma.alert.create({
          data: {
            endpointId,
            type: 'CONTRACT_VIOLATION',
            diff: contractDiff as object
          }
        })
        console.log(`[CONTRACT VIOLATION] Endpoint: ${endpoint.name}`, contractDiff)
      }
    }

    // Always save the new snapshot
    await saveSnapshot(endpointId, newShape)

    // Update lastCheckedAt on the endpoint
    await prisma.endpoint.update({
      where: { id: endpointId },
      data: { lastCheckedAt: new Date() }
    })

    console.log(`[POLLER] Polled endpoint: ${endpoint.name} at ${new Date().toISOString()}`)

  } catch (err) {
    console.error(`[POLL ERROR] Endpoint: ${endpoint.name}`, err)
  }
}

/*
  startPollingForEndpoint — schedules a cron job for a single endpoint.
  Called on app start for all existing endpoints, and when a new endpoint is registered.
*/
export function startPollingForEndpoint(endpointId: string, pollIntervalMinutes: number): void {
  // Cancel existing task if one already exists for this endpoint
  if (activeTasks.has(endpointId)) {
    activeTasks.get(endpointId)!.stop()
  }

  const cronExpression = `*/${pollIntervalMinutes} * * * *`

  const task = cron.schedule(cronExpression, () => {
    pollEndpoint(endpointId)
  })

  activeTasks.set(endpointId, task)
  console.log(`[POLLER] Scheduled endpoint ${endpointId} every ${pollIntervalMinutes} minutes`)
}

/*
  initPoller — loads all endpoints from DB and starts polling for each.
  Called once when the Express server starts.
*/
export async function initPoller(): Promise<void> {
  const endpoints = await prisma.endpoint.findMany()

  for (const endpoint of endpoints) {
    startPollingForEndpoint(endpoint.id, endpoint.pollInterval)
  }

  console.log(`[POLLER] Initialised — monitoring ${endpoints.length} endpoint(s)`)
}
