import type { FastifyInstance } from "fastify";
import { UnauthorizedError } from "../../errors/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { listActivity } from "../activity/activity.service.js";
import * as board from "./board.service.js";

/**
 * REST endpoints for fetching board state. Mutations are exposed primarily
 * over the Socket.IO gateway so that every change is naturally broadcast to
 * everyone in the room. The REST routes here are read-only and exist so the
 * board can be hydrated before the websocket connects.
 */
export async function registerBoardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/rooms/:roomId/board", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const { roomId } = request.params as { roomId: string };
    const snapshot = await board.getBoardSnapshot(request.user.id, roomId);
    return reply.send({ snapshot });
  });

  app.get("/rooms/:roomId/activity", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const { roomId } = request.params as { roomId: string };
    const { limit } = request.query as { limit?: string };
    const activities = await listActivity(
      roomId,
      limit ? Number(limit) : 50,
    );
    return reply.send({ activity: activities });
  });
}
