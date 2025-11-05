import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 *
 * This ensures we don't create multiple Prisma instances in development
 * which can exhaust database connections.
 *
 * In production, we create a single instance.
 * In development, we reuse a global instance to survive hot reloads.
 */

let prisma: PrismaClient;

declare global {
  var __db__: PrismaClient;
}

// Prevent multiple instances during development hot reloads
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
  prisma.$connect();
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient({
      log: ["query", "error", "warn"],
    });
    global.__db__.$connect();
  }
  prisma = global.__db__;
}

/**
 * Helper function to safely disconnect
 * Useful in serverless environments or during cleanup
 */
export async function disconnectDB() {
  await prisma.$disconnect();
}

export default prisma;
