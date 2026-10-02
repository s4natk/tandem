import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const idSchema = z.string().min(1);
export const cuidSchema = z.string().min(20).max(40);
export const isoDateSchema = z.string().datetime();
export const emailSchema = z.string().email().max(255);
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(80),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const publicUserSchema = z.object({
  id: idSchema,
  email: emailSchema,
  name: z.string(),
  avatarColor: z.string(),
  createdAt: isoDateSchema,
});

export const authResponseSchema = z.object({
  user: publicUserSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

// ---------------------------------------------------------------------------
// Workspaces / Rooms
// ---------------------------------------------------------------------------

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
});

export const workspaceSchema = z.object({
  id: idSchema,
  name: z.string(),
  ownerId: idSchema,
  createdAt: isoDateSchema,
});

export const createRoomSchema = z.object({
  workspaceId: idSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});

export const joinRoomByCodeSchema = z.object({
  code: z.string().min(6).max(12),
});

export const roomSchema = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  code: z.string(),
  createdAt: isoDateSchema,
});

export const membershipRoleSchema = z.enum(["OWNER", "EDITOR", "VIEWER"]);
export type MembershipRole = z.infer<typeof membershipRoleSchema>;

export const updateRoomMemberRoleSchema = z.object({
  role: membershipRoleSchema,
});

// ---------------------------------------------------------------------------
// Board state (columns + cards)
// ---------------------------------------------------------------------------

export const columnSchema = z.object({
  id: idSchema,
  roomId: idSchema,
  title: z.string(),
  position: z.number(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const cardSchema = z.object({
  id: idSchema,
  columnId: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  version: z.number().int().nonnegative(),
  createdBy: idSchema,
  assigneeId: idSchema.nullable(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const boardSnapshotSchema = z.object({
  roomId: idSchema,
  columns: z.array(columnSchema),
  cards: z.array(cardSchema),
  // Monotonic per-room counter used for ordering & loose conflict detection.
  revision: z.number().int().nonnegative(),
});

// ---------------------------------------------------------------------------
// Mutation payloads (REST + WS share these)
// ---------------------------------------------------------------------------

export const createColumnSchema = z.object({
  title: z.string().min(1).max(80),
  position: z.number().optional(),
});

export const updateColumnSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  position: z.number().optional(),
});

export const createCardSchema = z.object({
  columnId: idSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  position: z.number().optional(),
});

export const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  assigneeId: idSchema.nullable().optional(),
  // Optimistic concurrency token; client must echo the version it last saw.
  version: z.number().int().nonnegative(),
});

export const moveCardSchema = z.object({
  cardId: idSchema,
  toColumnId: idSchema,
  toPosition: z.number(),
  version: z.number().int().nonnegative(),
});

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export const activityKindSchema = z.enum([
  "ROOM_CREATED",
  "MEMBER_JOINED",
  "COLUMN_CREATED",
  "COLUMN_UPDATED",
  "COLUMN_DELETED",
  "CARD_CREATED",
  "CARD_UPDATED",
  "CARD_MOVED",
  "CARD_DELETED",
]);

export const activitySchema = z.object({
  id: idSchema,
  roomId: idSchema,
  actorId: idSchema,
  actorName: z.string(),
  kind: activityKindSchema,
  payload: z.record(z.unknown()),
  createdAt: isoDateSchema,
});
