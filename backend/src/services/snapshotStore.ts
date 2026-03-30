/*
  services/snapshotStore.ts — Saves and retrieves snapshots from the database.

  A snapshot is the extracted shape of an API response at a specific point in time.
  The poller saves a new snapshot on every poll cycle.
  The differ compares the latest snapshot against the previous one to detect drift.
*/

import prisma from '../lib/prisma'
import { Shape } from './differ'

/*
  saveSnapshot — stores a new shape snapshot for a given endpoint
*/
export async function saveSnapshot(endpointId: string, shape: Shape): Promise<void> {
  await prisma.snapshot.create({
    data: {
      endpointId,
      shape: shape as object
    }
  })
}

/*
  getLatestSnapshot — retrieves the most recent snapshot for a given endpoint.
  Returns null if no snapshots exist yet (first poll).
*/
export async function getLatestSnapshot(endpointId: string) {
  return prisma.snapshot.findFirst({
    where: { endpointId },
    orderBy: { takenAt: 'desc' }
  })
}
