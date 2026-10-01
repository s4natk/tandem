import type { MembershipRole, Room } from "@collab/shared";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../errors/index.js";
import { prisma } from "../../db/prisma.js";
import { generateRoomCode } from "../../utils/code.js";
import { ensureWorkspaceMember } from "../workspaces/workspaces.service.js";

function toRoom(r: {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  code: string;
  createdAt: Date;
}): Room {
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    name: r.name,
    description: r.description,
    code: r.code,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function createRoom(args: {
  userId: string;
  workspaceId: string;
  name: string;
  description?: string;
}) {
  await ensureWorkspaceMember(args.userId, args.workspaceId);

  return prisma.$transaction(async (tx) => {
    // Retry a couple of times if we hit a code collision.
    let lastErr: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRoomCode();
      try {
        const room = await tx.room.create({
          data: {
            workspaceId: args.workspaceId,
            name: args.name,
            description: args.description,
            code,
          },
        });
        await tx.roomMember.create({
          data: { roomId: room.id, userId: args.userId, role: "OWNER" },
        });
        await tx.column.createMany({
          data: [
            { roomId: room.id, title: "To Do", position: 1024 },
            { roomId: room.id, title: "In Progress", position: 2048 },
            { roomId: room.id, title: "Done", position: 3072 },
          ],
        });
        return toRoom(room);
      } catch (err) {
        lastErr = err;
      }
    }
    throw new ConflictError("Could not generate a unique room code", lastErr);
  });
}

export async function listRoomsForUser(userId: string, workspaceId: string) {
  await ensureWorkspaceMember(userId, workspaceId);
  const memberships = await prisma.roomMember.findMany({
    where: { userId, room: { workspaceId } },
    include: { room: true },
    orderBy: { createdAt: "desc" },
  });
  return memberships.map((m) => ({ ...toRoom(m.room), role: m.role }));
}

export async function getRoomForUser(userId: string, roomId: string) {
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: { room: true },
  });
  if (!member) throw new NotFoundError("Room not found");
  return { ...toRoom(member.room), role: member.role };
}

export async function ensureRoomMember(
  userId: string,
  roomId: string,
): Promise<{ role: MembershipRole }> {
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true },
  });
  if (!member) throw new ForbiddenError("Not a member of this room");
  return { role: member.role };
}

export async function joinRoomByCode(userId: string, code: string) {
  const room = await prisma.room.findUnique({
    where: { code: code.toLowerCase() },
  });
  if (!room) throw new NotFoundError("Room code not found");

  // Workspace membership is required to join a room - this enforces tenancy.
  await ensureWorkspaceMember(userId, room.workspaceId).catch(async () => {
    // Auto-join the workspace as EDITOR when a member shares a code with you.
    await prisma.workspaceMember.create({
      data: { workspaceId: room.workspaceId, userId, role: "EDITOR" },
    });
  });

  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: room.id, userId } },
    update: {},
    create: { roomId: room.id, userId, role: "EDITOR" },
  });

  return toRoom(room);
}

export async function listRoomMembers(userId: string, roomId: string) {
  await ensureRoomMember(userId, roomId);
  const members = await prisma.roomMember.findMany({
    where: { roomId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarColor: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => ({
    id: m.id,
    role: m.role,
    joinedAt: m.createdAt.toISOString(),
    user: m.user,
  }));
}
