import { z } from "zod"
import { defineHandler } from "./handler.ts"
import { ok, err } from "neverthrow"

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
  .errors([
    {
      code: "NOT_FOUND",
      status: 404,
      schema: z.object({
        code: z.literal("NOT_FOUND"),
        message: z.string(),
      }),
    },
    {
      code: "VALIDATION_ERROR",
      status: 400,
      schema: z.object({
        code: z.literal("VALIDATION_ERROR"),
        message: z.string(),
        fields: z.array(z.string()),
      }),
    },
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
      return err({
        code: "VALIDATION_ERROR",
        message: "Missing userId",
        fields: ["userId"],
      })
    }
    
    const accounts = await deps.accountRepository.listByUser(input.userId)
    
    if (accounts.length === 0) {
      return err({
        code: "NOT_FOUND",
        message: "No accounts found",
      })
    }
    
    return ok({ accounts })
  })
  .build()