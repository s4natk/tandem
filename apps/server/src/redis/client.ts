import Redis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * Two separate connections are required for the Socket.IO Redis adapter
 * (pub + sub). A third is used by application code (presence, rate limits,
 * ephemeral state). They share the same URL and authentication.
 */

function build(name: string): Redis {
  // A rediss:// URL turns on TLS with certificate verification.
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
    connectionName: name,
    // Fly's default IPv6 route is reset by Upstash. Force IPv4.
    family: 4,
    connectTimeout: 10_000,
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
