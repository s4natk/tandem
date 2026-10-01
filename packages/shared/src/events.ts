import type {
  BoardCard,
  BoardColumn,
  BoardSnapshot,
  PresenceUser,
  Activity,
  CreateCardInput,
  UpdateCardInput,
  MoveCardInput,
  CreateColumnInput,
  UpdateColumnInput,
} from "./types.js";

/**
 * Centralized Socket.IO event contract.
 *
 * Naming convention:
 *   - "room:*"   namespace events about a specific room session
 *   - "board:*"  collaborative state mutations
 *   - "presence:*" online users + active card indicators
 *   - "activity:*" append-only feed
 *
 * Direction:
 *   - C2S = Client -> Server
 *   - S2C = Server -> Client (broadcast to the room)
 *
 * Acknowledgements:
 *   - Mutating C2S events use Socket.IO acks ((err?, data?) => void) so the
 *     client can detect rejected updates (e.g. version conflicts).
 */

export const SocketEvents = {
  // Lifecycle
  RoomJoin: "room:join",
  RoomLeave: "room:leave",
  RoomSnapshot: "room:snapshot",
  RoomError: "room:error",

  // Presence
  PresenceList: "presence:list",
  PresenceJoined: "presence:joined",
  PresenceLeft: "presence:left",
  PresenceActiveCard: "presence:active_card",
  PresenceTyping: "presence:typing",

  // Board mutations (client -> server)
  BoardColumnCreate: "board:column:create",
  BoardColumnUpdate: "board:column:update",
  BoardColumnDelete: "board:column:delete",
  BoardCardCreate: "board:card:create",
  BoardCardUpdate: "board:card:update",
  BoardCardMove: "board:card:move",
  BoardCardDelete: "board:card:delete",

  // Board broadcasts (server -> all clients in room)
  BoardColumnCreated: "board:column:created",
  BoardColumnUpdated: "board:column:updated",
  BoardColumnDeleted: "board:column:deleted",
  BoardCardCreated: "board:card:created",
  BoardCardUpdated: "board:card:updated",
  BoardCardMoved: "board:card:moved",
  BoardCardDeleted: "board:card:deleted",

  // Activity feed
  ActivityAppended: "activity:appended",
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];

// ---------------------------------------------------------------------------
// Payloads
// ---------------------------------------------------------------------------

export interface RoomJoinPayload {
  roomId: string;
}

export interface RoomLeavePayload {
  roomId: string;
}

export interface PresenceActiveCardPayload {
  roomId: string;
  cardId: string | null;
}

export interface PresenceTypingPayload {
  roomId: string;
  cardId: string;
  typing: boolean;
}

export interface ColumnCreatePayload extends CreateColumnInput {
  roomId: string;
}

export interface ColumnUpdatePayload extends UpdateColumnInput {
  roomId: string;
  columnId: string;
}

export interface ColumnDeletePayload {
  roomId: string;
  columnId: string;
}

export interface CardCreatePayload extends CreateCardInput {
  roomId: string;
}

export interface CardUpdatePayload extends UpdateCardInput {
  roomId: string;
  cardId: string;
}

export interface CardMovePayload extends MoveCardInput {
  roomId: string;
}

export interface CardDeletePayload {
  roomId: string;
  cardId: string;
}

// ---------------------------------------------------------------------------
// Broadcasts (server -> clients)
// ---------------------------------------------------------------------------

export interface RoomSnapshotEvent {
  snapshot: BoardSnapshot;
  presence: PresenceUser[];
  recentActivity: Activity[];
}

export interface RoomErrorEvent {
  code: string;
  message: string;
  // If a mutation was rejected, server may include the latest authoritative
  // state for the affected entity so the client can reconcile without refetching.
  conflict?: {
    cardId?: string;
    card?: BoardCard;
  };
}

export interface PresenceListEvent {
  roomId: string;
  users: PresenceUser[];
}

export interface PresenceJoinedEvent {
  roomId: string;
  user: PresenceUser;
}

export interface PresenceLeftEvent {
  roomId: string;
  userId: string;
  socketId: string;
}

export interface PresenceActiveCardEvent {
  roomId: string;
  userId: string;
  cardId: string | null;
}

export interface PresenceTypingEvent {
  roomId: string;
  userId: string;
  cardId: string;
  typing: boolean;
}

export interface BoardColumnEvent {
  roomId: string;
  column: BoardColumn;
}

export interface BoardColumnDeletedEvent {
  roomId: string;
  columnId: string;
}

export interface BoardCardEvent {
  roomId: string;
  card: BoardCard;
}

export interface BoardCardDeletedEvent {
  roomId: string;
  cardId: string;
}

export interface ActivityAppendedEvent {
  roomId: string;
  activity: Activity;
}

/**
 * Generic ack signature used by mutating client->server events.
 * On error, `error.code` will be one of the well-known codes (see below).
 */
export type Ack<T = void> = (
  response:
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string; conflict?: unknown } }
) => void;

export const SocketErrorCodes = {
  Unauthorized: "UNAUTHORIZED",
  Forbidden: "FORBIDDEN",
  NotFound: "NOT_FOUND",
  Validation: "VALIDATION_ERROR",
  Conflict: "VERSION_CONFLICT",
  Internal: "INTERNAL_ERROR",
} as const;
export type SocketErrorCode =
  (typeof SocketErrorCodes)[keyof typeof SocketErrorCodes];
