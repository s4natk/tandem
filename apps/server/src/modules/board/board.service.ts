import type {
  Activity,
  BoardCard,
  BoardColumn,
  BoardSnapshot,
  CreateCardInput,
  CreateColumnInput,
  MoveCardInput,
  UpdateCardInput,
  UpdateColumnInput,
} from "@collab/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  NotFoundError,
  ValidationError,
  VersionConflictError,
} from "../../errors/index.js";
import {
  positionBetween,
  positionForAppend,
} from "../../utils/position.js";
import { appendActivity } from "../activity/activity.service.js";
import { ensureRoomEditor, ensureRoomMember } from "../rooms/rooms.service.js";

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function toColumn(c: {
  id: string;
  roomId: string;
  title: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): BoardColumn {
  return {
    id: c.id,
    roomId: c.roomId,
    title: c.title,
    position: c.position,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function toCard(c: {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  position: number;
  version: number;
  createdById: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BoardCard {
  return {
    id: c.id,
    columnId: c.columnId,
    title: c.title,
    description: c.description,
    position: c.position,
    version: c.version,
    createdBy: c.createdById,
    assigneeId: c.assigneeId,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export async function getBoardSnapshot(
  userId: string,
  roomId: string,
): Promise<BoardSnapshot> {
  await ensureRoomMember(userId, roomId);

  const [room, columns, cards] = await Promise.all([
    prisma.room.findUnique({ where: { id: roomId }, select: { revision: true } }),
    prisma.column.findMany({
      where: { roomId },
      orderBy: { position: "asc" },
    }),
    prisma.card.findMany({
      where: { column: { roomId } },
      orderBy: { position: "asc" },
    }),
  ]);
  if (!room) throw new NotFoundError("Room not found");

  return {
    roomId,
    columns: columns.map(toColumn),
    cards: cards.map(toCard),
    revision: room.revision,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function bumpRoomRevision(
  tx: Prisma.TransactionClient,
  roomId: string,
): Promise<number> {
  const updated = await tx.room.update({
    where: { id: roomId },
    data: { revision: { increment: 1 } },
    select: { revision: true },
  });
  return updated.revision;
}

async function ensureColumnInRoom(
  tx: Prisma.TransactionClient,
  roomId: string,
  columnId: string,
) {
  const col = await tx.column.findUnique({ where: { id: columnId } });
  if (!col || col.roomId !== roomId) {
    throw new NotFoundError("Column not found in this room");
  }
  return col;
}

async function ensureCardInRoom(
  tx: Prisma.TransactionClient,
  roomId: string,
  cardId: string,
) {
  const card = await tx.card.findUnique({
    where: { id: cardId },
    include: { column: { select: { roomId: true } } },
  });
  if (!card || card.column.roomId !== roomId) {
    throw new NotFoundError("Card not found in this room");
  }
  return card;
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

export async function createColumn(args: {
  userId: string;
  roomId: string;
  input: CreateColumnInput;
}): Promise<{ column: BoardColumn; activity: Activity; revision: number }> {
  await ensureRoomEditor(args.userId, args.roomId);

  return prisma.$transaction(async (tx) => {
    const last = await tx.column.findFirst({
      where: { roomId: args.roomId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position =
      args.input.position ?? positionForAppend(last?.position ?? null);
    const column = await tx.column.create({
      data: { roomId: args.roomId, title: args.input.title, position },
    });
    const revision = await bumpRoomRevision(tx, args.roomId);
    const activity = await appendActivity(
      {
        roomId: args.roomId,
        actorId: args.userId,
        kind: "COLUMN_CREATED",
        payload: { columnId: column.id, title: column.title },
      },
      tx,
    );
    return { column: toColumn(column), activity, revision };
  });
}

export async function updateColumn(args: {
  userId: string;
  roomId: string;
  columnId: string;
  input: UpdateColumnInput;
}): Promise<{ column: BoardColumn; activity: Activity; revision: number }> {
  await ensureRoomEditor(args.userId, args.roomId);

  return prisma.$transaction(async (tx) => {
    const existing = await ensureColumnInRoom(tx, args.roomId, args.columnId);
    const column = await tx.column.update({
      where: { id: args.columnId },
      data: {
        title: args.input.title ?? existing.title,
        position: args.input.position ?? existing.position,
      },
    });
    const revision = await bumpRoomRevision(tx, args.roomId);
    const activity = await appendActivity(
      {
        roomId: args.roomId,
        actorId: args.userId,
        kind: "COLUMN_UPDATED",
        payload: { columnId: column.id, title: column.title },
      },
      tx,
    );
    return { column: toColumn(column), activity, revision };
  });
}

export async function deleteColumn(args: {
  userId: string;
  roomId: string;
  columnId: string;
}): Promise<{ activity: Activity; revision: number }> {
  await ensureRoomEditor(args.userId, args.roomId);

  return prisma.$transaction(async (tx) => {
    const existing = await ensureColumnInRoom(tx, args.roomId, args.columnId);
    await tx.column.delete({ where: { id: args.columnId } });
    const revision = await bumpRoomRevision(tx, args.roomId);
    const activity = await appendActivity(
      {
        roomId: args.roomId,
        actorId: args.userId,
        kind: "COLUMN_DELETED",
        payload: { columnId: args.columnId, title: existing.title },
      },
      tx,
    );
    return { activity, revision };
  });
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export async function createCard(args: {
  userId: string;
  roomId: string;
  input: CreateCardInput;
}): Promise<{ card: BoardCard; activity: Activity; revision: number }> {
  await ensureRoomEditor(args.userId, args.roomId);

  return prisma.$transaction(async (tx) => {
    await ensureColumnInRoom(tx, args.roomId, args.input.columnId);

    const last = await tx.card.findFirst({
      where: { columnId: args.input.columnId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position =
      args.input.position ?? positionForAppend(last?.position ?? null);

    const card = await tx.card.create({
      data: {
        columnId: args.input.columnId,
        title: args.input.title,
        description: args.input.description,
        position,
        createdById: args.userId,
      },
    });

    const revision = await bumpRoomRevision(tx, args.roomId);
    const activity = await appendActivity(
      {
        roomId: args.roomId,
        actorId: args.userId,
        kind: "CARD_CREATED",
        payload: { cardId: card.id, title: card.title, columnId: card.columnId },
      },
      tx,
    );
    return { card: toCard(card), activity, revision };
  });
}

export async function updateCard(args: {
  userId: string;
  roomId: string;
  cardId: string;
  input: UpdateCardInput;
}): Promise<{ card: BoardCard; activity: Activity; revision: number }> {
  await ensureRoomEditor(args.userId, args.roomId);

  return prisma.$transaction(async (tx) => {
    const existing = await ensureCardInRoom(tx, args.roomId, args.cardId);

    if (existing.version !== args.input.version) {
      throw new VersionConflictError("Stale card update rejected", {
        cardId: existing.id,
        card: toCard(existing),
      });
    }

    const card = await tx.card.update({
      where: { id: args.cardId },
      data: {
        title: args.input.title ?? existing.title,
        description:
          args.input.description === undefined
            ? existing.description
            : args.input.description,
        assigneeId:
          args.input.assigneeId === undefined
            ? existing.assigneeId
            : args.input.assigneeId,
        version: { increment: 1 },
      },
    });

    const revision = await bumpRoomRevision(tx, args.roomId);
    const activity = await appendActivity(
      {
        roomId: args.roomId,
        actorId: args.userId,
        kind: "CARD_UPDATED",
        payload: { cardId: card.id, title: card.title },
      },
      tx,
    );
    return { card: toCard(card), activity, revision };
  });
}

export async function moveCard(args: {
  userId: string;
  roomId: string;
  input: MoveCardInput;
}): Promise<{ card: BoardCard; activity: Activity; revision: number }> {
  await ensureRoomEditor(args.userId, args.roomId);

  return prisma.$transaction(async (tx) => {
    const existing = await ensureCardInRoom(tx, args.roomId, args.input.cardId);
    if (existing.version !== args.input.version) {
      throw new VersionConflictError("Stale card move rejected", {
        cardId: existing.id,
        card: toCard(existing),
      });
    }
    const destColumn = await ensureColumnInRoom(
      tx,
      args.roomId,
      args.input.toColumnId,
    );

    // Compute the target position based on `toPosition` interpreted as the
    // target index in the destination column (after removing this card if
    // it's in the same column).
    const siblings = await tx.card.findMany({
      where: { columnId: destColumn.id, NOT: { id: existing.id } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });

    const clamped = Math.max(0, Math.min(args.input.toPosition, siblings.length));
    const prev = clamped > 0 ? siblings[clamped - 1]?.position ?? null : null;
    const next = clamped < siblings.length ? siblings[clamped]?.position ?? null : null;

    if (prev == null && next == null && siblings.length > 0) {
      // Defensive: shouldn't happen because of clamping, but keep schema sane.
      throw new ValidationError("Invalid target position");
    }

    const newPosition = positionBetween(prev, next);

    const card = await tx.card.update({
      where: { id: existing.id },
      data: {
        columnId: destColumn.id,
        position: newPosition,
        version: { increment: 1 },
      },
    });

    const revision = await bumpRoomRevision(tx, args.roomId);
    const activity = await appendActivity(
      {
        roomId: args.roomId,
        actorId: args.userId,
        kind: "CARD_MOVED",
        payload: {
          cardId: card.id,
          title: card.title,
          fromColumnId: existing.columnId,
          toColumnId: destColumn.id,
        },
      },
      tx,
    );
    return { card: toCard(card), activity, revision };
  });
}

export async function deleteCard(args: {
  userId: string;
  roomId: string;
  cardId: string;
}): Promise<{ activity: Activity; revision: number }> {
  await ensureRoomEditor(args.userId, args.roomId);

  return prisma.$transaction(async (tx) => {
    const existing = await ensureCardInRoom(tx, args.roomId, args.cardId);
    await tx.card.delete({ where: { id: args.cardId } });
    const revision = await bumpRoomRevision(tx, args.roomId);
    const activity = await appendActivity(
      {
        roomId: args.roomId,
        actorId: args.userId,
        kind: "CARD_DELETED",
        payload: { cardId: existing.id, title: existing.title },
      },
      tx,
    );
    return { activity, revision };
  });
}
