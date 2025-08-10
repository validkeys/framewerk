import { AccountManagerCtx } from "@framewerk/accountManager/types"
import { ListAccountsMethod } from "@framewerk/contracts/accountManager/index.js"
import { parseJson } from "@framewerk/std/json.js"

import { AccountEntity } from "@framewerk/contracts/entities"
import { defineHandler } from "@framewerk/std/handler"
import { z } from "zod"

// export const makeListAccountsHandler =
//   (ctx: AccountManagerCtx): ListAccountsMethod.Type =>
//   async (_input) => {
//     console.log("[INFO] Listing accounts", _input)

//     return (await ctx.Redis.get("accounts"))
//       .andThen((value) =>
//         parseJson<AccountEntity[]>(value ?? "[]").mapErr(
//           (parseError) => new UncaughtDefectError("Failed to parse accounts", parseError),
//         ),
//       )
//       .map((accounts) => ({ accounts }))
//   }

const handler = defineHandler("accounts.list", "List accounts")
  .input(ListAccountsMethod.$inputSchema)
  .output(ListAccountsMethod.$outputSchema)
  .errors([
    {
      code: "REDIS_CONNECTION_ERROR",
      status: 500,
      schema: z.object({
        code: z.literal("REDIS_CONNECTION_ERROR"),
        message: z.string(),
      }),
    },
    {
      code: "UNCAUGHT_DEFECT_ERROR", 
      status: 500,
      schema: z.object({
        code: z.literal("UNCAUGHT_DEFECT_ERROR"),
        message: z.string(),
      }),
    },
  ] as const)
  .withDependencies<AccountManagerCtx>()
  .resolver((deps) => async (_input) => {
    console.log("[INFO] Listing accounts", _input)

    return (await deps.Redis.get("accounts"))
      .mapErr((redisError) => ({
        code: "REDIS_CONNECTION_ERROR" as const,
        message: redisError.message,
      }))
      .andThen((value) =>
        parseJson<AccountEntity[]>(value ?? "[]").mapErr(
          (parseError) => ({
            code: "UNCAUGHT_DEFECT_ERROR" as const,
            message: `Failed to parse accounts: ${parseError.message}`,
          })
        )
      )
      .map((accounts) => ({ accounts }))
  })
  .build()

export const makeListAccountsHandler = (ctx: AccountManagerCtx) => {
  return handler(ctx)
}
