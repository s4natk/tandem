import type { Prisma, User } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  name: string;
  avatarColor: string;
}): Promise<User> {
  return prisma.user.create({
    data: { ...data, email: data.email.toLowerCase() },
  });
}

export async function persistRefreshToken(args: {
  userId: string;
  jti: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      id: args.jti,
      userId: args.userId,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      userAgent: args.userAgent,
      ip: args.ip,
    },
  });
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { id: jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function findActiveRefreshToken(args: {
  jti: string;
  tokenHash: string;
}) {
  return prisma.refreshToken.findFirst({
    where: {
      id: args.jti,
      tokenHash: args.tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export const userSelectPublic: Prisma.UserSelect = {
  id: true,
  email: true,
  name: true,
  avatarColor: true,
  createdAt: true,
};
