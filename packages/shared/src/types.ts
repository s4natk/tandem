import type { z } from "zod";
import type {
  publicUserSchema,
  authResponseSchema,
  workspaceSchema,
  roomSchema,
  columnSchema,
  cardSchema,
  boardSnapshotSchema,
  activitySchema,
  activityKindSchema,
  createColumnSchema,
  updateColumnSchema,
  createCardSchema,
  updateCardSchema,
  moveCardSchema,
  signupSchema,
  loginSchema,
} from "./schemas.js";

export type PublicUser = z.infer<typeof publicUserSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type Room = z.infer<typeof roomSchema>;
export type BoardColumn = z.infer<typeof columnSchema>;
export type BoardCard = z.infer<typeof cardSchema>;
export type BoardSnapshot = z.infer<typeof boardSnapshotSchema>;
export type Activity = z.infer<typeof activitySchema>;
export type ActivityKind = z.infer<typeof activityKindSchema>;

export type CreateColumnInput = z.infer<typeof createColumnSchema>;
export type UpdateColumnInput = z.infer<typeof updateColumnSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface PresenceUser {
  userId: string;
  name: string;
  avatarColor: string;
  socketId: string;
  joinedAt: string;
  // Last reported cursor position over a card (for "active card" indicator).
  activeCardId?: string | null;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
