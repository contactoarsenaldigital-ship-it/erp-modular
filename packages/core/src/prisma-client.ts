import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 requiere un driver adapter explícito para cualquier base —
// ya no basta con la URL en el datasource. El adapter usa DATABASE_URL
// (Transaction pooler, 6543) porque es el que sirve para el volumen de
// queries normal de la app en runtime; DIRECT_URL (Session pooler, 5432)
// solo lo usa el CLI para migrar, configurado en prisma.config.ts.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Singleton para evitar agotar el pool de conexiones en dev (hot reload
// de Next.js crea una instancia nueva por cada recarga si no se cachea).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
