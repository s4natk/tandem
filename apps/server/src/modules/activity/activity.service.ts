import type { Activity, ActivityKind } from "@collab/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

export interface AppendActivityInput {
  roomId: string;
  actorId: string;
  kind: ActivityKind;
  payload: Record<string, unknown>;
}

function toActivity(row: {
  id: string;
  roomId: string;
  actorId: string;
  kind: string;
  payload: unknown;
  createdAt: Date;
  actor: { name: string };
}): Activity {
  return {
    id: row.id,
    roomId: row.roomId,
    actorId: row.actorId,
    actorName: row.actor.name,
    kind: row.kind as ActivityKind,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function appendActivity(
  input: AppendActivityInput,
  client: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<Activity> {
  const row = await client.activity.create({
    data: {
      roomId: input.roomId,
      actorId: input.actorId,
      kind: input.kind,
      payload: input.payload as Prisma.InputJsonValue,
    },
    include: { actor: { select: { name: true } } },
  });
  return toActivity(row);
}

export async function listActivity(roomId: string, limit = 50): Promise<Activity[]> {
  const rows = await prisma.activity.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
    include: { actor: { select: { name: true } } },
  });
  return rows.reverse().map(toActivity);
}
