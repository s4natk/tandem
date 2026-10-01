import type { FastifyInstance } from "fastify";
import { createWorkspaceSchema } from "@collab/shared";
import { UnauthorizedError } from "../../errors/index.js";
import { requireAuth } from "../../middleware/auth.js";
import * as workspaces from "./workspaces.service.js";

export async function registerWorkspaceRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.post("/workspaces", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const body = createWorkspaceSchema.parse(request.body);
    const ws = await workspaces.createWorkspace(request.user.id, body.name);
    return reply.code(201).send({ workspace: ws });
  });

  app.get("/workspaces", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const list = await workspaces.listWorkspacesForUser(request.user.id);
    return reply.send({ workspaces: list });
  });

  app.get("/workspaces/:id", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const ws = await workspaces.getWorkspaceForUser(request.user.id, id);
    return reply.send({ workspace: ws });
  });
}
