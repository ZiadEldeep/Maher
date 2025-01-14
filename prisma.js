const { PrismaClient } = require('@prisma/client');

// Use globalThis for compatibility across environments (handles hot-reloading)
const globalForPrisma = globalThis;

// Ensure the Prisma Client is a singleton during development
const prisma =
  globalForPrisma.prisma ?? // Check if an instance already exists in global
  new PrismaClient({
    log: ['query', 'info', 'warn', 'error'], // Enable logging for debugging
  });

// In development mode, persist Prisma client across hot-reloads to avoid multiple instances
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
// Export the Prisma client instance
module.exports = { prisma };
