/**
 * # Error System Documentation
 * 
 * This module provides a comprehensive error handling system designed to work with neverthrow
 * and the framewerk handler system. It offers type-safe error definitions with automatic
 * schema generation for API responses.
 * 
 * ## Key Features
 * 
 * ### 1. Structured Error Classes
 * All errors extend `AbstractError` and include:
 * - `_tag`: Unique identifier for the error type (used for exhaustive checking)
 * - `message`: Human-readable error description
 * - `cause`: Optional underlying error that caused this error
 * 
 * ### 2. Handler Integration
 * Each error class provides:
 * - `static handlerError()`: Generates Zod schema and metadata for HTTP handlers
 * - `toHandlerError()`: Converts error instances to handler-compatible format
 * 
 * ### 3. Type Safety
 * - Exhaustive error checking via discriminated unions on `_tag`
 * - Automatic TypeScript inference of error types in handlers
 * - Compile-time validation that all error cases are handled
 * 
 * ## Usage Examples
 * 
 * ### Defining Handler Errors
 * ```typescript
 * const handler = defineHandler("operation", "Description")
 *   .errors([
 *     RedisConnectionError.handlerError(),
 *     ValidationError.handlerError(422), // Custom status code
 *   ] as const)
 *   .resolver(async () => {
 *     // Handler implementation
 *   })
 * ```
 * 
 * ### Returning Errors from Resolvers
 * ```typescript
 * // Early return pattern (recommended)
 * const result = await someOperation()
 * if (result.isErr()) {
 *   return err(result.error.toHandlerError()) // Auto-converts to handler format
 * }
 * 
 * // Or create new error
 * return err(new ValidationError("Invalid input").toHandlerError())
 * ```
 * 
 * ### Error Mapping with Exhaustive Checking
 * ```typescript
 * const mapError = (error: RedisConnectionError | ValidationError) => {
 *   switch (error._tag) {
 *     case "RedisConnectionError":
 *       return { code: error._tag, message: "Database unavailable" }
 *     case "ValidationError":
 *       return { code: error._tag, message: "Invalid request" }
 *     default:
 *       const _exhaustive: never = error // TypeScript will error if cases are missing
 *       throw new Error(`Unhandled error: ${_exhaustive}`)
 *   }
 * }
 * ```
 * 
 * ## How `toHandlerError()` Works
 * 
 * The `toHandlerError()` method bridges the gap between internal error representations
 * and the handler system's requirements:
 * 
 * 1. **Type Preservation**: Uses `this._tag as this['_tag']` to preserve literal types
 * 2. **Schema Compliance**: Returns objects that match the Zod schemas defined in `handlerError()`
 * 3. **Automatic Conversion**: Eliminates manual property mapping in handler resolvers
 * 
 * ```typescript
 * // Internal error instance:
 * const error = new RedisConnectionError("Connection failed")
 * 
 * // Handler-compatible format:
 * error.toHandlerError() // { code: "RedisConnectionError", message: "Connection failed" }
 * ```
 * 
 * This ensures that:
 * - Error instances can be used internally with full error context
 * - Handler responses get clean, consistent error objects
 * - Type safety is maintained throughout the conversion
 */

// Error types
import { z } from "zod";

/**
 * Base class for all application errors.
 * 
 * Provides a consistent interface for error handling with:
 * - Discriminated union support via `_tag`
 * - Cause chaining for error context
 * - Automatic conversion to handler-compatible format
 */
abstract class AbstractError extends Error {
  /** Unique identifier for this error type. Used for exhaustive checking and error discrimination. */
  public abstract readonly _tag: string;
  
  /** Optional underlying error that caused this error. Useful for debugging and error chaining. */
  public cause?: unknown;
  
  /**
   * Converts this error instance to a format compatible with handler error schemas.
   * 
   * This method eliminates the need for manual property mapping in handler resolvers
   * by automatically extracting the `_tag` and `message` properties in the correct format.
   * 
   * @returns Object with `code` (from `_tag`) and `message` properties that matches handler error schemas
   * 
   * @example
   * ```typescript
   * const error = new RedisConnectionError("Connection failed")
   * return err(error.toHandlerError()) // { code: "RedisConnectionError", message: "Connection failed" }
   * ```
   */
  toHandlerError() {
    return {
      code: this._tag as this['_tag'],
      message: this.message,
    } as const;
  }
  
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Helper function to create consistent handler error definitions.
 * 
 * Eliminates boilerplate by generating the error schema object that handlers expect.
 * Each error gets a Zod schema with `code` (literal) and `message` (string) properties.
 * 
 * @param tag - The error tag/code (should match the error class `_tag`)
 * @param defaultStatus - Default HTTP status code for this error type
 * @returns Function that creates handler error definition with optional status override
 * 
 * @example
 * ```typescript
 * static handlerError = createHandlerError("ValidationError", 400)
 * 
 * // Usage:
 * ValidationError.handlerError()     // Uses default 400 status
 * ValidationError.handlerError(422)  // Override to 422 status
 * ```
 */
const createHandlerError = <T extends string>(tag: T, defaultStatus: number) => {
  return (status = defaultStatus) => ({
    code: tag,
    status,
    schema: z.object({
      code: z.literal(tag),
      message: z.string(),
    }),
  } as const);
};

/**
 * Error thrown when a user cannot be found.
 * 
 * Typically used for authentication/authorization failures or when
 * a requested user doesn't exist in the system.
 * 
 * @example
 * ```typescript
 * throw new UserNotFoundError("User with ID 123 not found")
 * // or
 * return err(new UserNotFoundError().toHandlerError())
 * ```
 */
export class UserNotFoundError extends AbstractError {
  readonly _tag = "UserNotFoundError" as const;
  static handlerError = createHandlerError("UserNotFoundError", 404);
  
  constructor(message = "User not found", cause?: unknown) {
    super(message, cause);
  }
}

/**
 * Error thrown when Redis connection or operation fails.
 * 
 * This error indicates infrastructure-level issues with the Redis
 * database connection or operations.
 * 
 * @example
 * ```typescript
 * // In a service method:
 * const result = await redis.get("key")
 * if (result.isErr()) {
 *   return err(result.error.toHandlerError()) // RedisConnectionError -> handler format
 * }
 * ```
 */
export class RedisConnectionError extends AbstractError {
  readonly _tag = "RedisConnectionError" as const;
  static handlerError = createHandlerError("RedisConnectionError", 500);
  
  constructor(message = "Redis connection error", cause?: unknown) {
    super(message, cause);
  }
}

export class ValidationError extends AbstractError {
  readonly _tag = "ValidationError" as const;
  static handlerError = createHandlerError("ValidationError", 400);
  
  constructor(message = "Validation error", cause?: unknown) {
    super(message, cause);
  }
}

export class UncaughtDefectError extends AbstractError {
  readonly _tag = "UncaughtDefectError" as const;
  static handlerError = createHandlerError("UncaughtDefectError", 500);
  
  constructor(message = "Uncaught defect error", cause?: unknown) {
    super(message, cause);
  }
}

// Result type alias using neverthrow

