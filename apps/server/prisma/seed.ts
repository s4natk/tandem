import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = "demo@collab.dev";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`seed: user ${email} already exists, skipping`);
    return;
  }
  const passwordHash = await argon2.hash("demo-password");
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: "Demo User",
      avatarColor: "#6366f1",
    },
  });
  const ws = await prisma.workspace.create({
    data: { name: "Demo Workspace", ownerId: user.id },
  });
  await prisma.workspaceMember.create({
    data: { workspaceId: ws.id, userId: user.id, role: "OWNER" },
  });
  const room = await prisma.room.create({
    data: {
      name: "Launch Plan",
      description: "Track work for the v1 launch.",
      workspaceId: ws.id,
      code: "demo1234",
    },
  });
  await prisma.roomMember.create({
    data: { roomId: room.id, userId: user.id, role: "OWNER" },
  });
  const [todo, inprog, done] = await Promise.all([
    prisma.column.create({
      data: { roomId: room.id, title: "To Do", position: 1024 },
    }),
    prisma.column.create({
      data: { roomId: room.id, title: "In Progress", position: 2048 },
    }),
    prisma.column.create({
      data: { roomId: room.id, title: "Done", position: 3072 },
    }),
  ]);
  await prisma.card.createMany({
    data: [
      {
        columnId: todo.id,
        title: "Draft README",
        position: 1024,
        createdById: user.id,
      },
      {
        columnId: todo.id,
        title: "Wire up CI",
        position: 2048,
        createdById: user.id,
      },
      {
        columnId: inprog.id,
        title: "Build kanban board UI",
        position: 1024,
        createdById: user.id,
      },
      {
        columnId: done.id,
        title: "Set up project repo",
        position: 1024,
        createdById: user.id,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log(`seed: created demo user ${email} / demo-password (room code: demo1234)`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
