import type { FastifyInstance } from "fastify";
import { loginSchema, refreshSchema, signupSchema } from "@collab/shared";
import { UnauthorizedError } from "../../errors/index.js";
import { requireAuth } from "../../middleware/auth.js";
import * as authService from "./auth.service.js";

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  // ----- Public -----------------------------------------------------------

  app.post("/auth/signup", async (request, reply) => {
    const body = signupSchema.parse(request.body);
    const result = await authService.signup(body, {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });
    return reply.code(201).send(result);
  });

  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body, {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });
    return reply.send(result);
  });

  app.post("/auth/refresh", async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    const result = await authService.refresh(body.refreshToken, {
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    });
    return reply.send(result);
  });

  app.post("/auth/logout", async (request, reply) => {
    const body = (request.body ?? {}) as { refreshToken?: string };
    await authService.logout(body.refreshToken);
    return reply.code(204).send();
  });

  // ----- Authenticated ----------------------------------------------------

  app.get(
    "/auth/me",
    { preHandler: requireAuth },
    async (request, reply) => {
      if (!request.user) throw new UnauthorizedError();
      const user = await authService.getMe(request.user.id);
      return reply.send({ user });
    },
  );
}
