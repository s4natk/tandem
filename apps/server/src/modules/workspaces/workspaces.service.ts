import type { Workspace } from "@collab/shared";
import { ForbiddenError, NotFoundError } from "../../errors/index.js";
import { prisma } from "../../db/prisma.js";

function toWorkspace(w: {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
}): Workspace {
  return {
    id: w.id,
    name: w.name,
    ownerId: w.ownerId,
    createdAt: w.createdAt.toISOString(),
  };
}

export async function createWorkspace(userId: string, name: string) {
  return prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: { name, ownerId: userId },
    });
    await tx.workspaceMember.create({
      data: { workspaceId: ws.id, userId, role: "OWNER" },
    });
    return toWorkspace(ws);
  });
}

export async function listWorkspacesForUser(userId: string) {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    ...toWorkspace(m.workspace),
    role: m.role,
  }));
}

export async function getWorkspaceForUser(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
  if (!member) throw new NotFoundError("Workspace not found");
  return { ...toWorkspace(member.workspace), role: member.role };
}

export async function ensureWorkspaceMember(userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) throw new ForbiddenError("Not a member of this workspace");
  return member;
}
