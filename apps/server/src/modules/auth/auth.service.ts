import { randomUUID } from "node:crypto";
import type {
  AuthResponse,
  LoginInput,
  PublicUser,
  SignupInput,
} from "@collab/shared";
import { ConflictError, UnauthorizedError } from "../../errors/index.js";
import { pickAvatarColor } from "../../utils/avatar.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  hashRefreshToken,
  parseDurationMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./tokens.js";
import {
  createUser,
  findActiveRefreshToken,
  findUserByEmail,
  findUserById,
  persistRefreshToken,
  revokeRefreshToken,
} from "./auth.repo.js";
import { env } from "../../config/env.js";

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

function toPublicUser(u: {
  id: string;
  email: string;
  name: string;
  avatarColor: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt.toISOString(),
  };
}

async function issueTokens(
  user: { id: string; email: string; name: string },
  meta: RequestMeta,
): Promise<{ accessToken: string; refreshToken: string }> {
  const jti = randomUUID();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const tokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL));

  await persistRefreshToken({
    userId: user.id,
    jti,
    tokenHash,
    expiresAt,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return { accessToken, refreshToken };
}

export async function signup(
  input: SignupInput,
  meta: RequestMeta = {},
): Promise<AuthResponse> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError("An account with this email already exists");
  }
  const passwordHash = await hashPassword(input.password);
  const user = await createUser({
    email: input.email,
    name: input.name,
    passwordHash,
    avatarColor: pickAvatarColor(input.email),
  });

  const tokens = await issueTokens(user, meta);
  return { user: toPublicUser(user), ...tokens };
}

export async function login(
  input: LoginInput,
  meta: RequestMeta = {},
): Promise<AuthResponse> {
  const user = await findUserByEmail(input.email);
  if (!user) throw new UnauthorizedError("Invalid email or password");
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) throw new UnauthorizedError("Invalid email or password");
  const tokens = await issueTokens(user, meta);
  return { user: toPublicUser(user), ...tokens };
}

export async function refresh(
  refreshTokenRaw: string,
  meta: RequestMeta = {},
): Promise<AuthResponse> {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshTokenRaw);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const tokenHash = hashRefreshToken(refreshTokenRaw);
  const persisted = await findActiveRefreshToken({
    jti: decoded.jti,
    tokenHash,
  });
  if (!persisted) {
    throw new UnauthorizedError("Refresh token revoked or expired");
  }

  // Token rotation: revoke the old token whether or not issuing succeeds.
  await revokeRefreshToken(decoded.jti);

  const user = await findUserById(decoded.sub);
  if (!user) throw new UnauthorizedError("User no longer exists");

  const tokens = await issueTokens(user, meta);
  return { user: toPublicUser(user), ...tokens };
}

export async function logout(refreshTokenRaw: string | undefined): Promise<void> {
  if (!refreshTokenRaw) return;
  try {
    const decoded = verifyRefreshToken(refreshTokenRaw);
    await revokeRefreshToken(decoded.jti);
  } catch {
    // Silently succeed on invalid token - logout is idempotent.
  }
}

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await findUserById(userId);
  if (!user) throw new UnauthorizedError("User no longer exists");
  return toPublicUser(user);
}
