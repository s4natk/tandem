import type { FastifyInstance } from "fastify";
import {
  createRoomSchema,
  joinRoomByCodeSchema,
  updateRoomMemberRoleSchema,
} from "@collab/shared";
import { UnauthorizedError } from "../../errors/index.js";
import { requireAuth } from "../../middleware/auth.js";
import * as rooms from "./rooms.service.js";

export async function registerRoomRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.post("/rooms", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const body = createRoomSchema.parse(request.body);
    const room = await rooms.createRoom({
      userId: request.user.id,
      workspaceId: body.workspaceId,
      name: body.name,
      description: body.description,
    });
    return reply.code(201).send({ room });
  });

  app.get("/workspaces/:workspaceId/rooms", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const { workspaceId } = request.params as { workspaceId: string };
    const list = await rooms.listRoomsForUser(request.user.id, workspaceId);
    return reply.send({ rooms: list });
  });

  app.get("/rooms/:id", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const room = await rooms.getRoomForUser(request.user.id, id);
    return reply.send({ room });
  });

  app.get("/rooms/:id/members", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const members = await rooms.listRoomMembers(request.user.id, id);
    return reply.send({ members });
  });

  app.patch("/rooms/:id/members/:userId", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const { id, userId } = request.params as { id: string; userId: string };
    const body = updateRoomMemberRoleSchema.parse(request.body);
    const member = await rooms.updateRoomMemberRole({
      actorId: request.user.id,
      roomId: id,
      targetUserId: userId,
      role: body.role,
    });
    return reply.send({ member });
  });

  app.post("/rooms/join", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const body = joinRoomByCodeSchema.parse(request.body);
    const room = await rooms.joinRoomByCode(request.user.id, body.code);
    return reply.send({ room });
  });
}
