import type { Server as HttpServer } from "node:http";
import { Server as IOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import {
  SocketErrorCodes,
  SocketEvents,
  type ActivityAppendedEvent,
  type Ack,
  type BoardCardDeletedEvent,
  type BoardCardEvent,
  type BoardColumnDeletedEvent,
  type BoardColumnEvent,
  type CardCreatePayload,
  type CardDeletePayload,
  type CardMovePayload,
  type CardUpdatePayload,
  type ColumnCreatePayload,
  type ColumnDeletePayload,
  type ColumnUpdatePayload,
  type PresenceActiveCardEvent,
  type PresenceActiveCardPayload,
  type PresenceJoinedEvent,
  type PresenceLeftEvent,
  type PresenceListEvent,
  type PresenceTypingEvent,
  type PresenceTypingPayload,
  type PresenceUser,
  type RoomErrorEvent,
  type RoomJoinPayload,
  type RoomLeavePayload,
  type RoomSnapshotEvent,
  createCardSchema,
  createColumnSchema,
  moveCardSchema,
  updateCardSchema,
  updateColumnSchema,
} from "@collab/shared";
import { env, corsOrigins } from "../config/env.js";
import { logger } from "../config/logger.js";
import { redisPub, redisSub } from "../redis/client.js";
import { toErrorPayload } from "../middleware/error.js";
import { UnauthorizedError } from "../errors/index.js";
import { verifyAccessToken } from "../modules/auth/tokens.js";
import { findUserById } from "../modules/auth/auth.repo.js";
import * as boardService from "../modules/board/board.service.js";
import { listActivity } from "../modules/activity/activity.service.js";
import { ensureRoomMember } from "../modules/rooms/rooms.service.js";
import { presenceStore } from "./presence.js";
import type { AuthedSocket } from "./types.js";

const SOCKET_ROOM_PREFIX = "room:";
const socketRoomId = (roomId: string) => `${SOCKET_ROOM_PREFIX}${roomId}`;

/**
 * Build a Socket.IO server bound to the given HTTP server.
 *
 * - Auth: every connection must present a valid access token (Authorization
 *   header during the handshake, or `auth.token`). We do *not* trust the
 *   client-supplied identity for anything else.
 * - Scaling: when SOCKET_IO_REDIS_ADAPTER is enabled the adapter forwards
 *   broadcasts across all backend instances (e.g. ECS tasks).
 * - Tenancy: every event verifies that the connected user is a member of
 *   the target room - the gateway never relies on the client to tell it
 *   which rooms it can talk to.
 */
export function attachSocketGateway(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: { origin: corsOrigins, credentials: true },
    // Sane defaults for proxies/load balancers. ALB idle timeout > pingTimeout.
    pingInterval: 25_000,
    pingTimeout: 20_000,
    transports: ["websocket", "polling"],
  });

  if (env.SOCKET_IO_REDIS_ADAPTER) {
    io.adapter(createAdapter(redisPub, redisSub));
    logger.info("socket.io: redis adapter enabled");
  }

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ??
        extractBearer(socket.handshake.headers["authorization"]);
      if (!token) return next(new UnauthorizedError("Missing auth token"));
      const payload = verifyAccessToken(token);

      const user = await findUserById(payload.sub);
      if (!user) return next(new UnauthorizedError("User no longer exists"));

      const data: AuthedSocket["data"] = {
        userId: user.id,
        email: user.email,
        name: user.name,
        avatarColor: user.avatarColor,
      };
      // socket.data is typed as Record<string, never> generically; cast for assignment
      Object.assign(socket.data as object, data);
      return next();
    } catch (err) {
      logger.warn({ err }, "ws auth failed");
      return next(new UnauthorizedError("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const s = socket as AuthedSocket;
    registerSocket(io, s);
  });

  return io;
}

function extractBearer(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  const v = Array.isArray(value) ? value[0] : value;
  if (!v) return undefined;
  if (v.startsWith("Bearer ")) return v.slice("Bearer ".length).trim();
  return v.trim();
}

function registerSocket(io: IOServer, socket: AuthedSocket): void {
  const { userId, name, avatarColor } = socket.data;
  const log = logger.child({ sid: socket.id, uid: userId });
  log.info("ws connected");

  // Tracks rooms this socket is in so we can clean presence on disconnect
  // without depending on the (loose) Socket.IO room membership.
  const joinedRooms = new Set<string>();

  // ----- Room lifecycle ---------------------------------------------------

  socket.on(
    SocketEvents.RoomJoin,
    async (payload: RoomJoinPayload, ack?: Ack<RoomSnapshotEvent>) => {
      try {
        if (!payload?.roomId) throw new UnauthorizedError("roomId required");
        await ensureRoomMember(userId, payload.roomId);

        await socket.join(socketRoomId(payload.roomId));
        joinedRooms.add(payload.roomId);

        const presenceUser: PresenceUser = {
          userId,
          name,
          avatarColor,
          socketId: socket.id,
          joinedAt: new Date().toISOString(),
          activeCardId: null,
        };
        const presenceList = await presenceStore.add(payload.roomId, presenceUser);
        const snapshot = await boardService.getBoardSnapshot(userId, payload.roomId);
        const recentActivity = await listActivity(payload.roomId, 30);

        const joinedEvent: PresenceJoinedEvent = {
          roomId: payload.roomId,
          user: presenceUser,
        };
        // Broadcast presence join to everyone else in the room.
        socket
          .to(socketRoomId(payload.roomId))
          .emit(SocketEvents.PresenceJoined, joinedEvent);

        const response: RoomSnapshotEvent = {
          snapshot,
          presence: presenceList,
          recentActivity,
        };
        // Also send the joiner an explicit snapshot so the listener wiring is
        // identical whether or not the client used the ack callback.
        socket.emit(SocketEvents.RoomSnapshot, response);
        ack?.({ ok: true, data: response });
      } catch (err) {
        const payload = toErrorPayload(err);
        const errorEvent: RoomErrorEvent = {
          code: payload.code,
          message: payload.message,
        };
        socket.emit(SocketEvents.RoomError, errorEvent);
        ack?.({ ok: false, error: payload });
      }
    },
  );

  socket.on(SocketEvents.RoomLeave, async (payload: RoomLeavePayload) => {
    if (!payload?.roomId) return;
    await leaveRoom(io, socket, payload.roomId);
    joinedRooms.delete(payload.roomId);
  });

  // ----- Presence ---------------------------------------------------------

  socket.on(
    SocketEvents.PresenceActiveCard,
    async (payload: PresenceActiveCardPayload) => {
      if (!payload?.roomId || !joinedRooms.has(payload.roomId)) return;
      const updated = await presenceStore.updateActiveCard(
        payload.roomId,
        socket.id,
        payload.cardId,
      );
      if (!updated) return;
      const event: PresenceActiveCardEvent = {
        roomId: payload.roomId,
        userId,
        cardId: payload.cardId,
      };
      socket
        .to(socketRoomId(payload.roomId))
        .emit(SocketEvents.PresenceActiveCard, event);
    },
  );

  socket.on(SocketEvents.PresenceTyping, (payload: PresenceTypingPayload) => {
    if (!payload?.roomId || !joinedRooms.has(payload.roomId)) return;
    const event: PresenceTypingEvent = {
      roomId: payload.roomId,
      userId,
      cardId: payload.cardId,
      typing: payload.typing,
    };
    socket
      .to(socketRoomId(payload.roomId))
      .emit(SocketEvents.PresenceTyping, event);
  });

  // ----- Board mutations --------------------------------------------------

  socket.on(
    SocketEvents.BoardColumnCreate,
    async (payload: ColumnCreatePayload, ack?: Ack<BoardColumnEvent>) =>
      handleMutation(socket, ack, async () => {
        const input = createColumnSchema.parse(payload);
        const result = await boardService.createColumn({
          userId,
          roomId: payload.roomId,
          input,
        });
        const event: BoardColumnEvent = {
          roomId: payload.roomId,
          column: result.column,
        };
        io.to(socketRoomId(payload.roomId)).emit(
          SocketEvents.BoardColumnCreated,
          event,
        );
        broadcastActivity(io, payload.roomId, result.activity);
        return event;
      }),
  );

  socket.on(
    SocketEvents.BoardColumnUpdate,
    async (payload: ColumnUpdatePayload, ack?: Ack<BoardColumnEvent>) =>
      handleMutation(socket, ack, async () => {
        const input = updateColumnSchema.parse(payload);
        const result = await boardService.updateColumn({
          userId,
          roomId: payload.roomId,
          columnId: payload.columnId,
          input,
        });
        const event: BoardColumnEvent = {
          roomId: payload.roomId,
          column: result.column,
        };
        io.to(socketRoomId(payload.roomId)).emit(
          SocketEvents.BoardColumnUpdated,
          event,
        );
        broadcastActivity(io, payload.roomId, result.activity);
        return event;
      }),
  );

  socket.on(
    SocketEvents.BoardColumnDelete,
    async (payload: ColumnDeletePayload, ack?: Ack<BoardColumnDeletedEvent>) =>
      handleMutation(socket, ack, async () => {
        const result = await boardService.deleteColumn({
          userId,
          roomId: payload.roomId,
          columnId: payload.columnId,
        });
        const event: BoardColumnDeletedEvent = {
          roomId: payload.roomId,
          columnId: payload.columnId,
        };
        io.to(socketRoomId(payload.roomId)).emit(
          SocketEvents.BoardColumnDeleted,
          event,
        );
        broadcastActivity(io, payload.roomId, result.activity);
        return event;
      }),
  );

  socket.on(
    SocketEvents.BoardCardCreate,
    async (payload: CardCreatePayload, ack?: Ack<BoardCardEvent>) =>
      handleMutation(socket, ack, async () => {
        const input = createCardSchema.parse(payload);
        const result = await boardService.createCard({
          userId,
          roomId: payload.roomId,
          input,
        });
        const event: BoardCardEvent = {
          roomId: payload.roomId,
          card: result.card,
        };
        io.to(socketRoomId(payload.roomId)).emit(
          SocketEvents.BoardCardCreated,
          event,
        );
        broadcastActivity(io, payload.roomId, result.activity);
        return event;
      }),
  );

  socket.on(
    SocketEvents.BoardCardUpdate,
    async (payload: CardUpdatePayload, ack?: Ack<BoardCardEvent>) =>
      handleMutation(socket, ack, async () => {
        const input = updateCardSchema.parse(payload);
        const result = await boardService.updateCard({
          userId,
          roomId: payload.roomId,
          cardId: payload.cardId,
          input,
        });
        const event: BoardCardEvent = {
          roomId: payload.roomId,
          card: result.card,
        };
        io.to(socketRoomId(payload.roomId)).emit(
          SocketEvents.BoardCardUpdated,
          event,
        );
        broadcastActivity(io, payload.roomId, result.activity);
        return event;
      }),
  );

  socket.on(
    SocketEvents.BoardCardMove,
    async (payload: CardMovePayload, ack?: Ack<BoardCardEvent>) =>
      handleMutation(socket, ack, async () => {
        const input = moveCardSchema.parse(payload);
        const result = await boardService.moveCard({
          userId,
          roomId: payload.roomId,
          input,
        });
        const event: BoardCardEvent = {
          roomId: payload.roomId,
          card: result.card,
        };
        io.to(socketRoomId(payload.roomId)).emit(
          SocketEvents.BoardCardMoved,
          event,
        );
        broadcastActivity(io, payload.roomId, result.activity);
        return event;
      }),
  );

  socket.on(
    SocketEvents.BoardCardDelete,
    async (payload: CardDeletePayload, ack?: Ack<BoardCardDeletedEvent>) =>
      handleMutation(socket, ack, async () => {
        const result = await boardService.deleteCard({
          userId,
          roomId: payload.roomId,
          cardId: payload.cardId,
        });
        const event: BoardCardDeletedEvent = {
          roomId: payload.roomId,
          cardId: payload.cardId,
        };
        io.to(socketRoomId(payload.roomId)).emit(
          SocketEvents.BoardCardDeleted,
          event,
        );
        broadcastActivity(io, payload.roomId, result.activity);
        return event;
      }),
  );

  // ----- Cleanup ----------------------------------------------------------

  socket.on("disconnect", async (reason) => {
    log.info({ reason }, "ws disconnected");
    for (const roomId of joinedRooms) {
      await leaveRoom(io, socket, roomId).catch((err) =>
        log.warn({ err }, "leave on disconnect failed"),
      );
    }
  });
}

async function leaveRoom(
  io: IOServer,
  socket: AuthedSocket,
  roomId: string,
): Promise<void> {
  const removed = await presenceStore.remove(roomId, socket.id);
  await socket.leave(socketRoomId(roomId));
  if (removed) {
    const event: PresenceLeftEvent = {
      roomId,
      userId: removed.userId,
      socketId: removed.socketId,
    };
    io.to(socketRoomId(roomId)).emit(SocketEvents.PresenceLeft, event);
    // Refresh canonical presence list for any client that wants it.
    const list: PresenceListEvent = {
      roomId,
      users: await presenceStore.list(roomId),
    };
    io.to(socketRoomId(roomId)).emit(SocketEvents.PresenceList, list);
  }
}

async function handleMutation<T>(
  socket: AuthedSocket,
  ack: Ack<T> | undefined,
  work: () => Promise<T>,
): Promise<void> {
  try {
    const data = await work();
    ack?.({ ok: true, data });
  } catch (err) {
    const payload = toErrorPayload(err);
    socket.emit(SocketEvents.RoomError, {
      code: payload.code,
      message: payload.message,
      // Detail-level conflict info for the client to reconcile.
      ...(payload.details && payload.code === SocketErrorCodes.Conflict
        ? { conflict: payload.details }
        : {}),
    } satisfies RoomErrorEvent);
    ack?.({ ok: false, error: payload });
  }
}

function broadcastActivity(
  io: IOServer,
  roomId: string,
  activity: ActivityAppendedEvent["activity"],
): void {
  const event: ActivityAppendedEvent = { roomId, activity };
  io.to(socketRoomId(roomId)).emit(SocketEvents.ActivityAppended, event);
}
