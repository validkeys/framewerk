import { AccountManagerDeps } from "@framewerk/accountManager/types"
import { ListAccountsMethod } from "@framewerk/contracts/accountManager/index.js"
import { parseJson } from "@framewerk/std/json.js"
import { ok, err } from "neverthrow"

import { AccountEntity } from "@framewerk/contracts/entities"
import {
  JsonParseError,
  RedisConnectionError,
  UncaughtDefectError,
} from "@framewerk/core" // ✅ Fixed import path
import { defineHandler } from "@framewerk/core" // ✅ Fixed import path

const handler = defineHandler("accounts.list", "List accounts")
  .input(ListAccountsMethod.$inputSchema.strict())
  .output(ListAccountsMethod.$outputSchema)
  .errors([RedisConnectionError, JsonParseError, UncaughtDefectError] as const)
  .withDependencies<AccountManagerDeps>()
  .resolver((deps) => async (_input, ctx) => {
    console.log("[INFO] Listing accounts", _input)

    // Get accounts from Redis
    const redisResult = await deps.Redis.get("accounts")
    if (redisResult.isErr()) {
      return err(redisResult.error) // ✅ Return original error instance
    }

    // Parse JSON
    const parseResult = parseJson<AccountEntity[]>(redisResult.value ?? "[]")
    if (parseResult.isErr()) {
      const defectError = new UncaughtDefectError(
        `Failed to parse accounts: ${parseResult.error.message}`,
        parseResult.error
      )
      return err(defectError) // ✅ Return original error instance
    }

    const user = await deps.UserManager.listUsers({}, ctx)
    if (user.isErr()) {
      return err(user.error) // ✅ Return original error instance
    }

    console.log("[INFO] User data:", user.value)

    // Return success
    return ok({ accounts: parseResult.value })
  })
  .build()

export const makeListAccountsHandler = (
  deps: AccountManagerDeps
): ListAccountsMethod.Handler => {
  return handler(deps).method // ✅ This should work correctly
}
