import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError, isAppError } from "../errors/index.js";

export function registerErrorHandler(
  server: import("fastify").FastifyInstance,
): void {
  server.setErrorHandler((err, request, reply) => {
    handleError(err as unknown, request, reply);
  });
}

function handleError(
  err: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (err instanceof ZodError) {
    request.log.warn({ err: err.flatten() }, "validation error");
    void reply.code(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  if (isAppError(err)) {
    const log = err.statusCode >= 500 ? request.log.error : request.log.warn;
    log.call(request.log, { err }, err.code);
    void reply.code(err.statusCode).send({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Fastify schema validation errors come in with a `validation` array.
  const maybeFastifyErr = err as FastifyError | undefined;
  if (
    maybeFastifyErr &&
    typeof maybeFastifyErr.statusCode === "number" &&
    maybeFastifyErr.statusCode < 500
  ) {
    request.log.warn({ err }, "fastify client error");
    void reply.code(maybeFastifyErr.statusCode).send({
      error: {
        code: maybeFastifyErr.code ?? "BAD_REQUEST",
        message: maybeFastifyErr.message,
      },
    });
    return;
  }

  request.log.error({ err }, "unhandled error");
  void reply.code(500).send({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}

/** Helper for translating thrown errors into a uniform shape outside HTTP. */
export function toErrorPayload(err: unknown): {
  code: string;
  message: string;
  details?: unknown;
} {
  if (err instanceof ZodError) {
    return {
      code: "VALIDATION_ERROR",
      message: "Invalid payload",
      details: err.flatten().fieldErrors,
    };
  }
  if (isAppError(err)) {
    return {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    };
  }
  return { code: "INTERNAL_ERROR", message: "Internal server error" };
}

/** Re-exported so other modules can keep their imports tidy. */
export { AppError };
