import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Singleton Prisma client. We keep a module-level reference so hot-reload
 * (tsx --watch) does not exhaust the database connection pool.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [{ emit: "event", level: "warn" }, { emit: "event", level: "error" }]
        : [{ emit: "event", level: "error" }],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

// Forward Prisma log events to pino.
// (Types are loose because Prisma's typed events depend on the `log` setting.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as any).$on("error", (e: unknown) => logger.error({ e }, "prisma error"));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(prisma as any).$on?.("warn", (e: unknown) => logger.warn({ e }, "prisma warn"));

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
