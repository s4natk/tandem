import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../errors/index.js";
import { verifyAccessToken } from "../modules/auth/tokens.js";

/**
 * Decodes a Bearer access token from the Authorization header and attaches
 * the resolved user to `request.user`. Throws UnauthorizedError on failure
 * (translated to a 401 by the global error handler).
 */
export async function requireAuth(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or malformed Authorization header");
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    const payload = verifyAccessToken(token);
    request.user = { id: payload.sub, email: payload.email, name: payload.name };
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}
