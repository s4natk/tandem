import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { corsOrigins } from "../config/env.js";
import { redisApp } from "../redis/client.js";

export async function registerCorePlugins(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    // CORS handles cross-origin policy; helmet should not block our frontend.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  await app.register(sensible);

  await app.register(rateLimit, {
    max: 600,
    timeWindow: "1 minute",
    redis: redisApp,
    nameSpace: "rl:",
    // Rate limit per IP, allow authenticated users a higher ceiling.
    keyGenerator: (req) => {
      const userId = (req.user as { id?: string } | undefined)?.id;
      return userId ? `u:${userId}` : `ip:${req.ip}`;
    },
  });
}
