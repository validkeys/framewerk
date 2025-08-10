import { defineHandler } from "@framewerk/core"
import { err, ok } from "neverthrow"
import { UserEntity } from "../../core-contracts/entities.ts"
import {
  JsonParseError,
  RedisConnectionError,
  UncaughtDefectError,
} from "../../core-framewerk/errors.ts"
import { ListUsersMethod } from "../../core-contracts/userManager/index.ts"
import { parseJson } from "../../core-std/json.ts"
import { IUserManagerCtx } from "../index.ts"

export const listUsersHandler = defineHandler("user", "List users")
  .errors([RedisConnectionError, JsonParseError, UncaughtDefectError] as const)
  .input(ListUsersMethod.$inputSchema)
  .output(ListUsersMethod.$outputSchema)
  .withDependencies<IUserManagerCtx>()
  .resolver((deps) => async (input, ctx) => {
    console.log("[INFO] Listing users input", input)
    console.log("[INFO] List Users Context:", ctx)

    // Get users from Redis
    const redisResult = await deps.Redis.get("users")
    if (redisResult.isErr()) {
      return err(redisResult.error) // ✅ Return original error instance
    }

    // Parse JSON
    const parseResult = parseJson<UserEntity[]>(redisResult.value ?? "[]")
    if (parseResult.isErr()) {
      return err(parseResult.error) // ✅ Return original error instance
    }

    // Return success
    return ok({ users: parseResult.value })
  })
  .build()

export const makeListAccountsHandler = (
  deps: IUserManagerCtx
): ListUsersMethod.Handler => {
  return listUsersHandler(deps).method
}
