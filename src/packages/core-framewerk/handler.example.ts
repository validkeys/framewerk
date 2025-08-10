import { z } from "zod"
import { defineHandler } from "@framewerk/core"
import { ok, err } from "neverthrow"
import { AbstractError } from "./errors.ts"

/**
 * Example error classes for demonstration.
 * 
 * These show how to create error classes that work with the new handler system.
 * Each error class must:
 * 1. Extend AbstractError
 * 2. Have a unique _tag property
 * 3. Optionally provide httpStatus and getSchema() static methods
 */

export class NotFoundError extends AbstractError {
  readonly _tag = "NOT_FOUND" as const
  static readonly httpStatus = 404
  static readonly errorCode = "NOT_FOUND" as const

  static getSchema() {
    return z.object({
      code: z.literal("NOT_FOUND"),
      message: z.string(),
    })
  }
}

export class ValidationError extends AbstractError {
  readonly _tag = "VALIDATION_ERROR" as const
  static readonly httpStatus = 400
  static readonly errorCode = "VALIDATION_ERROR" as const

  public fields: string[]

  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.fields = []
  }

  static withFields(message: string, fields: string[], cause?: unknown): ValidationError {
    const error = new ValidationError(message, cause)
    error.fields = fields
    return error
  }

  static getSchema() {
    return z.object({
      code: z.literal("VALIDATION_ERROR"),
      message: z.string(),
      fields: z.array(z.string()),
    })
  }
}

// Define your package dependencies
export interface AccountsDependencies {
  accountRepository: {
    listByUser(userId: string): Promise<Array<{ id: string; name: string }>>
  }
  logger: {
    info(message: string, meta?: unknown): void
  }
}

export const ListAccounts = defineHandler(
  "accounts.listAccounts",
  "List accounts for the authenticated user"
)
  .tags("Accounts")
  .auth({ required: true, scopes: ["accounts:read"] })
  .input(z.object({
    userId: z.string().min(1),
  }))
  .output(z.object({
    accounts: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })),
  }))
  // ✨ NEW: Pass error classes directly instead of HandlerError objects
  // TypeScript automatically infers: NotFoundError | ValidationError
  .errors([
    NotFoundError,
    ValidationError,
  ] as const)
  .withDependencies<AccountsDependencies>()
  .resolver((deps) => async (input, ctx) => {
    // input is now properly typed as { userId: string }
    // deps is typed as AccountsDependencies
    deps.logger.info("Listing accounts", { userId: input.userId })

    // ctx is optional - only access properties if context is provided
    if (ctx?.actor) {
      console.log("Request actor:", ctx.actor)
    }
    
    if (!input.userId) {
      // ✨ NEW: Return actual error instances, not plain objects
      return err(ValidationError.withFields(
        "Missing userId",
        ["userId"]
      ))
    }
    
    const accounts = await deps.accountRepository.listByUser(input.userId)
    
    if (accounts.length === 0) {
      // ✨ NEW: Return actual error instances, not plain objects
      return err(new NotFoundError("No accounts found"))
    }
    
    return ok({ accounts })
  })
  .build()