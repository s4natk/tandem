/**
 * Domain errors. Keep them transport-agnostic so they can be thrown from
 * services and translated into HTTP responses or Socket.IO acks uniformly.
 */
export class AppError extends Error {
  public override readonly name: string = "AppError";
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  public override readonly name = "ValidationError";
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  public override readonly name = "UnauthorizedError";
  constructor(message = "Authentication required") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  public override readonly name = "ForbiddenError";
  constructor(message = "You do not have permission to perform this action") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  public override readonly name = "NotFoundError";
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ConflictError extends AppError {
  public override readonly name = "ConflictError";
  constructor(message: string, details?: unknown) {
    super("CONFLICT", message, 409, details);
  }
}

export class VersionConflictError extends AppError {
  public override readonly name = "VersionConflictError";
  constructor(message = "Stale write rejected", details?: unknown) {
    super("VERSION_CONFLICT", message, 409, details);
  }
}

export class ServiceUnavailableError extends AppError {
  public override readonly name = "ServiceUnavailableError";
  constructor(message: string) {
    super("SERVICE_UNAVAILABLE", message, 503);
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
