/*
  lib/prisma.ts — Shared Prisma client instance.

  Creates a single PrismaClient connected to the database via the pg adapter.
  All route files import `prisma` from here instead of creating their own instance.

  Why a single instance? Creating a new PrismaClient per request would open too
  many database connections and exhaust the connection pool.
*/

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
  ssl: { rejectUnauthorized: false }
})

const prisma = new PrismaClient({ adapter })

export default prisma
