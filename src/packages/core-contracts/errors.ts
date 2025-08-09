// Error types
abstract class AbstractError extends Error {
  public abstract readonly _tag: string;
  public cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserNotFoundError extends AbstractError {
  readonly _tag = "UserNotFoundError" as const;
  constructor(message = "User not found", cause?: unknown) {
    super(message, cause);
  }
}

export class RedisConnectionError extends AbstractError {
  readonly _tag = "RedisConnectionError" as const;
  constructor(message = "Redis connection error", cause?: unknown) {
    super(message, cause);
  }
}

export class ValidationError extends AbstractError {
  readonly _tag = "ValidationError" as const;
  constructor(message = "Validation error", cause?: unknown) {
    super(message, cause);
  }
}

export class UncaughtDefectError extends AbstractError {
  readonly _tag = "UncaughtDefectError" as const;
  constructor(message = "Uncaught defect error", cause?: unknown) {
    super(message, cause);
  }
}

// Result type alias using neverthrow

