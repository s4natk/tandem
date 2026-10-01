import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { disconnectPrisma } from "./db/prisma.js";
import { disconnectRedis } from "./redis/client.js";
import { buildServer } from "./server.js";
import { attachSocketGateway } from "./ws/gateway.js";

async function main(): Promise<void> {
  const app = await buildServer();
  const io = attachSocketGateway(app.server);

  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(`server listening on http://${env.HOST}:${env.PORT}`);

  const shutdown = async (signal: string): Promise<void> => {
    logger.warn({ signal }, "shutting down");
    try {
      await io.close();
      await app.close();
      await disconnectPrisma();
      await disconnectRedis();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) =>
    logger.error({ reason }, "unhandled rejection"),
  );
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception");
    void shutdown("uncaughtException");
  });
}

void main().catch((err) => {
  logger.fatal({ err }, "fatal startup error");
  process.exit(1);
});
