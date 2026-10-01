import { beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET ??= "test-access-secret-test-access-secret";
  process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-test-refresh-secret";
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  process.env.REDIS_URL ??= "redis://localhost:6379";
});

/**
 * Unit-tests the board service against a hand-rolled fake Prisma client so
 * we can exercise the optimistic-concurrency / sparse-position rules
 * without a live Postgres. Integration tests cover the SQL layer separately.
 */
describe("board.moveCard", () => {
  it("rejects a move with a stale version (VERSION_CONFLICT)", async () => {
    vi.resetModules();

    const card = {
      id: "card-1",
      columnId: "col-A",
      title: "Card",
      description: null,
      position: 1024,
      version: 7,
      createdById: "u-1",
      assigneeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      column: { roomId: "room-1" },
    };

    const fakePrisma = {
      $transaction: async (fn: (tx: unknown) => unknown) =>
        fn({
          card: {
            findUnique: vi.fn().mockResolvedValue(card),
            update: vi.fn().mockResolvedValue(card),
            findMany: vi.fn().mockResolvedValue([]),
          },
          column: {
            findUnique: vi
              .fn()
              .mockResolvedValue({ id: "col-A", roomId: "room-1" }),
          },
          room: {
            update: vi.fn().mockResolvedValue({ revision: 1 }),
          },
          activity: {
            create: vi.fn().mockResolvedValue({
              id: "a-1",
              roomId: "room-1",
              actorId: "u-1",
              kind: "CARD_MOVED",
              payload: {},
              createdAt: new Date(),
              actor: { name: "U" },
            }),
          },
        }),
    };

    vi.doMock("../src/db/prisma.js", () => ({ prisma: fakePrisma }));
    vi.doMock("../src/modules/rooms/rooms.service.js", () => ({
      ensureRoomMember: vi.fn().mockResolvedValue({ role: "EDITOR" }),
    }));

    const { moveCard } = await import("../src/modules/board/board.service.js");
    const { VersionConflictError } = await import("../src/errors/index.js");

    await expect(
      moveCard({
        userId: "u-1",
        roomId: "room-1",
        input: {
          cardId: "card-1",
          toColumnId: "col-A",
          toPosition: 0,
          version: 6, // stale - actual is 7
        },
      }),
    ).rejects.toBeInstanceOf(VersionConflictError);
  });

  it("computes a midpoint position when moving between two siblings", async () => {
    vi.resetModules();

    const targetCard = {
      id: "card-1",
      columnId: "col-A",
      title: "Card",
      description: null,
      position: 1024,
      version: 3,
      createdById: "u-1",
      assigneeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      column: { roomId: "room-1" },
    };

    const siblings = [
      { id: "sib-1", position: 1024 },
      { id: "sib-2", position: 3072 },
    ];

    let savedPosition = -1;
    const fakePrisma = {
      $transaction: async (fn: (tx: unknown) => unknown) =>
        fn({
          card: {
            findUnique: vi.fn().mockResolvedValue(targetCard),
            findMany: vi.fn().mockResolvedValue(siblings),
            update: vi
              .fn()
              .mockImplementation(async ({ data }: { data: { position: number } }) => {
                savedPosition = data.position;
                return { ...targetCard, position: data.position, version: 4 };
              }),
          },
          column: {
            findUnique: vi
              .fn()
              .mockResolvedValue({ id: "col-B", roomId: "room-1" }),
          },
          room: {
            update: vi.fn().mockResolvedValue({ revision: 9 }),
          },
          activity: {
            create: vi.fn().mockResolvedValue({
              id: "a-1",
              roomId: "room-1",
              actorId: "u-1",
              kind: "CARD_MOVED",
              payload: {},
              createdAt: new Date(),
              actor: { name: "U" },
            }),
          },
        }),
    };

    vi.doMock("../src/db/prisma.js", () => ({ prisma: fakePrisma }));
    vi.doMock("../src/modules/rooms/rooms.service.js", () => ({
      ensureRoomMember: vi.fn().mockResolvedValue({ role: "EDITOR" }),
    }));

    const { moveCard } = await import("../src/modules/board/board.service.js");

    const result = await moveCard({
      userId: "u-1",
      roomId: "room-1",
      input: {
        cardId: "card-1",
        toColumnId: "col-B",
        toPosition: 1, // between sib-1 and sib-2
        version: 3,
      },
    });

    expect(savedPosition).toBe(2048); // midpoint of 1024 and 3072
    expect(result.card.position).toBe(2048);
    expect(result.revision).toBe(9);
  });
});
