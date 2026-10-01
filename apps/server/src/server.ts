import Fastify, { type FastifyBaseLogger, type FastifyInstance } from "fastify";
import { logger } from "./config/logger.js";
import { registerErrorHandler } from "./middleware/error.js";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerAttachmentRoutes } from "./modules/attachments/attachments.routes.js";
import { registerBoardRoutes } from "./modules/board/board.routes.js";
import { registerRoomRoutes } from "./modules/rooms/rooms.routes.js";
import { registerWorkspaceRoutes } from "./modules/workspaces/workspaces.routes.js";
import { registerCorePlugins } from "./plugins/index.js";

/**
 * Build a fully wired Fastify instance. Exported as a factory so tests can
 * spin up isolated copies via `app.inject(...)` without binding to a port.
 */
export async function buildServer(): Promise<FastifyInstance> {
  // Pino's `Logger` differs nominally from Fastify's `FastifyBaseLogger`
  // (msgPrefix), but is structurally compatible at runtime. The cast lets
  // us reuse the singleton without re-deriving every Fastify generic.
  const app: FastifyInstance = Fastify({
    loggerInstance: logger as unknown as FastifyBaseLogger,
    trustProxy: true,
    disableRequestLogging: false,
    bodyLimit: 1_048_576, // 1 MiB - payloads are small JSON, anything bigger is suspect.
  });

  registerErrorHandler(app);
  await registerCorePlugins(app);

  app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));
  app.get("/ready", async () => ({ status: "ready" }));

  // All API routes share the /api prefix. Auth routes are public; the rest
  // mount their own `preHandler: requireAuth` hook.
  await app.register(
    async (instance) => {
      await instance.register(registerAuthRoutes);
      await instance.register(registerWorkspaceRoutes);
      await instance.register(registerRoomRoutes);
      await instance.register(registerBoardRoutes);
      await instance.register(registerAttachmentRoutes);
    },
    { prefix: "/api" },
  );

  return app;
}
