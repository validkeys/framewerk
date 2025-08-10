import { AccountManagerCtx } from "@framewerk/accountManager/types"
import { ListAccountsMethod } from "@framewerk/contracts/accountManager/index.js"
import { parseJson } from "@framewerk/std/json.js"
import { ok, err } from "neverthrow"

import { AccountEntity } from "@framewerk/contracts/entities"
import { RedisConnectionError, UncaughtDefectError } from "@framewerk/contracts/errors"
import { defineHandler } from "@framewerk/std/handler"


const handler = defineHandler("accounts.list", "List accounts")
  .input(ListAccountsMethod.$inputSchema)
  .output(ListAccountsMethod.$outputSchema)
  .errors([
    RedisConnectionError.handlerError(),
    UncaughtDefectError.handlerError(),
  ] as const)
  .withDependencies<AccountManagerCtx>()
  .resolver((deps) => async (_input) => {
    console.log("[INFO] Listing accounts", _input)

    // Get accounts from Redis
    const redisResult = await deps.Redis.get("accounts")
    if (redisResult.isErr()) {
      return err(redisResult.error.toHandlerError())
    }

    // Parse JSON
    const parseResult = parseJson<AccountEntity[]>(redisResult.value ?? "[]")
    if (parseResult.isErr()) {
      const defectError = new UncaughtDefectError(
        `Failed to parse accounts: ${parseResult.error.message}`, 
        parseResult.error
      )
      return err(defectError.toHandlerError())
    }

    // Return success
    return ok({ accounts: parseResult.value })
  })
  .build()

export const makeListAccountsHandler = (deps: AccountManagerCtx) => {
  return handler(deps).method
}
