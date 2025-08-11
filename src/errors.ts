/**
 * # Error System Documentation
 *
 * This module provides a comprehensive error handling system designed to work with neverthrow
 * and the framewerk handler system. It offers type-safe error definitions with automatic
 * schema generation for API responses.
 *
 * ## Key Features
 *
 * ### 1. Effect-TS Inspired Tagged Errors
 * All errors implement the `TaggedError` interface with:
 * - `_tag`: Unique literal type identifier for exhaustive checking
 * - Type-safe error discrimination via discriminated unions
 * - Automatic type inference for error tags
 *
 * ### 2. Multiple Creation Patterns
 * Choose the pattern that fits your needs:
 * - `FramewerkError.tagged("ErrorName")`: Class extension with factory
 * - `TaggedError("ErrorName")`: Direct factory function
 * - Legacy `AbstractError`: Backward compatibility (deprecated)
 *
 * ### 3. Handler Integration
 * Each error class provides:
 * - `static handlerError()`: Generates Zod schema and metadata for HTTP handlers
 * - `toHandlerError()`: Converts error instances to handler-compatible format
 *
 * ### 4. Type Safety & Exhaustive Checking
 * - Exhaustive error checking via discriminated unions on `_tag`
 * - Automatic TypeScript inference of error types in handlers
 * - Compile-time validation that all error cases are handled
 *
 * ## Usage Examples
 *
 * ### Creating Tagged Errors (Recommended)
 * ```typescript
 * // Pattern 1: Class extension with tagged factory
 * class UserNotFoundError extends FramewerkError.tagged("UserNotFoundError") {
 *   static readonly httpStatus = 404
 *   constructor(userId?: string) {
 *     super(userId ? `User ${userId} not found` : "User not found")
 *   }
 * }
 *
 * // Pattern 2: Direct factory function
 * export const NetworkError = TaggedError("NetworkError")
 * ```
 *
 * ### Defining Handler Errors
 * ```typescript
 * const handler = defineHandler("operation", "Description")
 *   .errors([
 *     UserNotFoundError.handlerError(),
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
 * return err(new UserNotFoundError("user-123").toHandlerError())
 * ```
 *
 * ### Exhaustive Error Handling
 * ```typescript
 * type HandlerErrors = UserNotFoundError | ValidationError | DatabaseError
 *
 * const mapError = (error: HandlerErrors) => {
 *   switch (error._tag) {
 *     case "UserNotFoundError":
 *       return { code: error._tag, message: "User not found" }
 *     case "ValidationError":
 *       return { code: error._tag, message: "Invalid request" }
 *     case "DatabaseError":
 *       return { code: error._tag, message: "Server error" }
 *     default:
 *       const _exhaustive: never = error // TypeScript will error if cases are missing
 *       throw new Error(`Unhandled error: ${_exhaustive}`)
 *   }
 * }
 * ```
 *
 * ## Migration from AbstractError
 *
 * ### Before (AbstractError - Deprecated)
 * ```typescript
 * class UserNotFoundError extends AbstractError {
 *   readonly _tag = "UserNotFoundError" as const
 *   static readonly errorCode = "UserNotFoundError"
 *   static readonly httpStatus = 404
 *   static handlerError = createHandlerError("UserNotFoundError", 404)
 * }
 * ```
 *
 * ### After (FramewerkError.tagged - Recommended)
 * ```typescript
 * class UserNotFoundError extends FramewerkError.tagged("UserNotFoundError") {
 *   static readonly httpStatus = 404
 *   constructor(userId?: string) {
 *     super(userId ? `User ${userId} not found` : "User not found")
 *   }
 * }
 * ```
 *
 * ## Benefits of the New System
 *
 * 1. **Less Boilerplate**: No need to manually define `_tag`, `errorCode`, or `handlerError`
 * 2. **Better Type Safety**: Automatic literal type inference for `_tag`
 * 3. **Effect-TS Compatibility**: Similar patterns to Effect-TS error handling
 * 4. **Exhaustive Checking**: TypeScript ensures all error cases are handled
 * 5. **Consistent API**: Both creation patterns provide the same interface
 */

import { z } from "zod"

/**
 * Tagged error interface inspired by Effect-TS for type-safe error handling.
 * 
 * This interface ensures all errors have a `_tag` property that can be used
 * for exhaustive error checking and discriminated unions.
 */
export interface TaggedError {
  readonly _tag: string
}

/**
 * Base class for all framewerk errors using the TaggedError pattern.
 * 
 * Inspired by Effect-TS, this provides:
 * - Automatic `_tag` inference from the class name
 * - Type-safe error discrimination
 * - Exhaustive error handling support
 * - Handler integration with automatic schema generation
 */
export abstract class FramewerkError extends Error implements TaggedError {
  /** 
   * Unique identifier for this error type. 
   * Automatically inferred from the class name for type safety.
   */
  public abstract readonly _tag: string

  /** Optional underlying error that caused this error */
  public cause?: unknown

  /** HTTP status code for this error type */
  static readonly httpStatus: number = 500

  /**
   * Creates a new tagged error class with automatic _tag inference.
   * 
   * This factory function ensures the _tag is correctly typed as a literal
   * and provides better ergonomics similar to Effect-TS.
   * 
   * @example
   * ```typescript
   * class UserNotFoundError extends FramewerkError.tagged("UserNotFoundError") {
   *   static readonly httpStatus = 404
   *   
   *   constructor(userId?: string) {
   *     super(userId ? `User ${userId} not found` : "User not found")
   *   }
   * }
   * ```
   */
  static tagged<T extends string>(tag: T) {
    abstract class TaggedFramewerkError extends FramewerkError {
      readonly _tag = tag as T
      static readonly errorCode = tag
      
      /**
       * Creates handler error definition with Zod schema
       */
      static handlerError(status?: number) {
        const httpStatus = status ?? (this as typeof TaggedFramewerkError).httpStatus ?? 500
        return {
          code: tag,
          status: httpStatus,
          schema: z.object({
            code: z.literal(tag),
            message: z.string(),
          }),
        } as const
      }
    }
    
    return TaggedFramewerkError
  }

  /**
   * Converts this error instance to handler-compatible format
   */
  toHandlerError() {
    return {
      code: this._tag as this["_tag"],
      message: this.message,
    } as const
  }

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = this.constructor.name
    this.cause = cause
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Factory function for creating tagged errors (alternative approach).
 * 
 * This provides an even more Effect-TS-like experience where you can
 * create tagged errors without extending a class.
 * 
 * @example
 * ```typescript
 * export const NetworkError = TaggedError("NetworkError")
 * export const TimeoutError = TaggedError("TimeoutError")
 * 
 * // Usage:
 * throw new NetworkError("Connection failed")
 * ```
 */
export const TaggedError = <T extends string>(tag: T) => {
  return class extends FramewerkError {
    readonly _tag = tag as T
    static readonly errorCode = tag
    
    static handlerError(status?: number) {
      const httpStatus = status ?? this.httpStatus ?? 500
      return {
        code: tag,
        status: httpStatus,
        schema: z.object({
          code: z.literal(tag),
          message: z.string(),
        }),
      } as const
    }

    constructor(message: string, cause?: unknown) {
      super(message, cause)
      this.name = tag
    }
  }
}

/**
 * @deprecated Use FramewerkError.tagged() or TaggedError() instead
 * 
 * Legacy AbstractError class for backward compatibility.
 * Will be removed in v2.0.0
 */
export abstract class AbstractError extends FramewerkError {
  /** @deprecated Use FramewerkError.tagged() instead */
  static readonly errorCode: string

  /** @deprecated Use handlerError() method instead */
  static getSchema() {
    const errorCode = (this as typeof AbstractError & { errorCode: string })
      .errorCode
    return z.object({
      code: z.literal(errorCode),
      message: z.string(),
    })
  }

  /** @deprecated Use handlerError() method instead */
  static getHttpStatus(): number {
    return (this as typeof AbstractError & { httpStatus: number }).httpStatus
  }
}

/**
 * Helper type for creating error unions from multiple error classes
 */
export type ErrorUnion<T extends readonly (new (...args: never[]) => FramewerkError)[]> = 
  T extends readonly (new (...args: never[]) => infer U)[] ? U : never

/**
 * Helper type to extract the _tag from an error class
 */
export type ErrorTag<T extends FramewerkError> = T["_tag"]

/**
 * Helper type to create a union of error tags
 */
export type ErrorTags<T extends readonly FramewerkError[]> = T[number]["_tag"]

// ============================================================================
// Example Error Classes - Demonstrating both patterns
// ============================================================================

/**
 * Pattern 1: Using FramewerkError.tagged() factory (Recommended)
 */

/**
 * Error thrown when a user cannot be found.
 * Common in authentication/authorization and user lookup operations.
 */
export class UserNotFoundError extends FramewerkError.tagged("UserNotFoundError") {
  static readonly httpStatus = 404
  
  constructor(userId?: string) {
    super(userId ? `User ${userId} not found` : "User not found")
  }
}

/**
 * Error thrown when input validation fails.
 * Used for request validation, form validation, etc.
 */
export class ValidationError extends FramewerkError.tagged("ValidationError") {
  static readonly httpStatus = 400
  
  constructor(field: string, reason?: string) {
    super(reason ? `Validation failed for ${field}: ${reason}` : `Validation failed for ${field}`)
  }
}

/**
 * Error thrown when database operations fail.
 * Covers connection issues, query failures, transaction problems.
 */
export class DatabaseError extends FramewerkError.tagged("DatabaseError") {
  static readonly httpStatus = 500
  
  constructor(operation: string, cause?: unknown) {
    super(`Database operation failed: ${operation}`, cause)
  }
}

/**
 * Error thrown when authentication fails.
 * Used for login failures, token validation, etc.
 */
export class AuthenticationError extends FramewerkError.tagged("AuthenticationError") {
  static readonly httpStatus = 401
  
  constructor(reason?: string) {
    super(reason ? `Authentication failed: ${reason}` : "Authentication failed")
  }
}

/**
 * Pattern 2: Using TaggedError factory function
 */

/**
 * Redis connection error using factory pattern
 */
export const RedisConnectionError = TaggedError("RedisConnectionError")

/**
 * Network timeout error using factory pattern  
 */
export const NetworkTimeoutError = TaggedError("NetworkTimeoutError")

/**
 * Rate limit exceeded error using factory pattern
 */
export const RateLimitError = TaggedError("RateLimitError")

// ============================================================================
// Migration Examples & Type Demonstrations
// ============================================================================

/**
 * Example: Type-safe error union for exhaustive handling
 */
export type CommonHandlerErrors = UserNotFoundError | ValidationError | DatabaseError | AuthenticationError

/**
 * Example: Exhaustive error mapper with compile-time checking
 */
export const mapHandlerError = (error: CommonHandlerErrors) => {
  switch (error._tag) {
    case "UserNotFoundError":
      return { code: error._tag, message: "User not found", status: 404 }
    case "ValidationError":
      return { code: error._tag, message: "Invalid input", status: 400 }
    case "DatabaseError":
      return { code: error._tag, message: "Server error", status: 500 }
    case "AuthenticationError":
      return { code: error._tag, message: "Unauthorized", status: 401 }
    default:
      // TypeScript will error if any cases are missing
      const _exhaustive: never = error
      throw new Error(`Unhandled error: ${_exhaustive}`)
  }
}

/**
 * @deprecated Use FramewerkError.tagged() or TaggedError() instead
 * 
 * Helper function to create consistent handler error definitions.
 * This is kept for backward compatibility but will be removed in v2.0.0
 */
export const createHandlerError = <T extends string>(
  tag: T,
  defaultStatus: number
) => {
  return (status = defaultStatus) =>
    ({
      code: tag,
      status,
      schema: z.object({
        code: z.literal(tag),
        message: z.string(),
      }),
    } as const)
}
