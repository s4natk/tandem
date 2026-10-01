import Redis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Two separate connections are required for the Socket.IO Redis adapter
 * (pub + sub). A third is used by application code (presence, rate limits,
 * ephemeral state). They share the same URL and authentication.
 */

function build(name: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // never give up on a single request
    enableReadyCheck: true,
    lazyConnect: false,
    connectionName: name,
  });

  client.on("connect", () => logger.info(`redis:${name} connected`));
  client.on("error", (err) => logger.error({ err }, `redis:${name} error`));
  client.on("end", () => logger.warn(`redis:${name} disconnected`));

  return client;
}

export const redisApp: Redis = build("app");
export const redisPub: Redis = build("pub");
export const redisSub: Redis = build("sub");

export async function disconnectRedis(): Promise<void> {
  await Promise.allSettled([redisApp.quit(), redisPub.quit(), redisSub.quit()]);
}
