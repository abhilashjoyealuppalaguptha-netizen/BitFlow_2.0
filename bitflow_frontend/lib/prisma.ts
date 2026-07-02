import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const isRender = Boolean(
  process.env.RENDER ||
  process.env.RENDER_EXTERNAL_URL ||
  process.env.RENDER_SERVICE_ID
);
const isThrowawaySqlite =
  !databaseUrl ||
  databaseUrl === "file:./dev.db" ||
  databaseUrl === "file:./prisma/dev.db";
const isBuildStep =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

if (process.env.NODE_ENV === "production" && isRender && isThrowawaySqlite && !isBuildStep) {
  throw new Error(
    "DATABASE_URL must point to a persistent Render disk, for example file:/var/data/bitflow.db"
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
