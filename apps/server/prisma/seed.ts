import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { generateRoomCode } from "../src/utils/code.js";

/**
 * Local development seed. Creates one user with a starter workspace and board.
 *
 *   SEED_PASSWORD=choose-a-password npm run prisma:seed -w @collab/server
 *
 * The password is never stored in the repo, and the script will not run
 * against a production database.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed a production database.");
  }

  const email = (process.env.SEED_EMAIL ?? "you@tandem.local").toLowerCase();
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Set SEED_PASSWORD (at least 8 characters) to create the seed user.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`seed: ${email} already exists, skipping`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash(password),
      name: process.env.SEED_NAME ?? "Tandem Rider",
      avatarColor: "#7262fb",
    },
  });
  const workspace = await prisma.workspace.create({
    data: { name: "My Workspace", ownerId: user.id },
  });
  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
  });
  const room = await prisma.room.create({
    data: {
      name: "Launch Plan",
      description: "Track work for the v1 launch.",
      workspaceId: workspace.id,
      code: generateRoomCode(),
    },
  });
  await prisma.roomMember.create({
    data: { roomId: room.id, userId: user.id, role: "OWNER" },
  });
  await prisma.activity.create({
    data: {
      roomId: room.id,
      actorId: user.id,
      kind: "ROOM_CREATED",
      payload: { title: room.name },
    },
  });
  const [todo, inProgress, done] = await Promise.all([
    prisma.column.create({ data: { roomId: room.id, title: "To Do", position: 1024 } }),
    prisma.column.create({ data: { roomId: room.id, title: "In Progress", position: 2048 } }),
    prisma.column.create({ data: { roomId: room.id, title: "Done", position: 3072 } }),
  ]);
  await prisma.card.createMany({
    data: [
      { columnId: todo.id, title: "Draft README", position: 1024, createdById: user.id },
      { columnId: todo.id, title: "Wire up CI", position: 2048, createdById: user.id },
      { columnId: inProgress.id, title: "Build kanban board UI", position: 1024, createdById: user.id },
      { columnId: done.id, title: "Set up project repo", position: 1024, createdById: user.id },
    ],
  });

  // eslint-disable-next-line no-console
  console.log(`seed: created ${email} with room code ${room.code}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
