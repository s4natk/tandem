import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { UnauthorizedError, NotFoundError } from "../../errors/index.js";
import { requireAuth } from "../../middleware/auth.js";
import { ensureRoomMember } from "../rooms/rooms.service.js";
import {
  createDownloadUrl,
  createUploadUrl,
  isS3Enabled,
} from "./s3.service.js";

const presignSchema = z.object({
  roomId: z.string().min(1),
  cardId: z.string().min(1).optional(),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().positive().max(50 * 1024 * 1024), // 50 MiB cap
});

const confirmSchema = z.object({
  roomId: z.string().min(1),
  cardId: z.string().min(1).optional(),
  key: z.string().min(1),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export async function registerAttachmentRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAuth);

  app.get("/attachments/status", async (_req, reply) => {
    return reply.send({ enabled: isS3Enabled() });
  });

  app.post("/attachments/presign", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const body = presignSchema.parse(request.body);
    await ensureRoomMember(request.user.id, body.roomId);
    const result = await createUploadUrl({
      roomId: body.roomId,
      uploaderId: request.user.id,
      filename: body.filename,
      mimeType: body.mimeType,
    });
    return reply.send(result);
  });

  app.post("/attachments/confirm", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const body = confirmSchema.parse(request.body);
    await ensureRoomMember(request.user.id, body.roomId);
    const created = await prisma.attachment.create({
      data: {
        roomId: body.roomId,
        cardId: body.cardId,
        uploaderId: request.user.id,
        s3Key: body.key,
        filename: body.filename,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
      },
    });
    return reply.code(201).send({ attachment: created });
  });

  app.get("/attachments/:id/download", async (request, reply) => {
    if (!request.user) throw new UnauthorizedError();
    const { id } = request.params as { id: string };
    const att = await prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundError("Attachment not found");
    await ensureRoomMember(request.user.id, att.roomId);
    const url = await createDownloadUrl(att.s3Key);
    return reply.send({ url });
  });
}
