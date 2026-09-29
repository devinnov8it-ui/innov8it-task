import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DATABASE_URL is required to access the database.");

  const poolerUrl = new URL(connectionString);
  poolerUrl.searchParams.delete("sslmode");
  const adapter = new PrismaPg({
    connectionString: poolerUrl.toString(),
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 10000,
  });
  const client = new PrismaClient({ adapter });
  globalForPrisma.prisma = client;
  return client;
}
