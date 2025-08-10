import { defineHandler } from "@framewerk/std/handler"
import { err, ok } from "neverthrow"
import { UserEntity } from "../../core-contracts/entities.ts"
import {
  JsonParseError,
  RedisConnectionError
} from "../../core-contracts/errors.ts"
import { ListUsersMethod } from "../../core-contracts/userManager/index.ts"
import { parseJson } from "../../core-std/json.ts"
import { IUserManagerCtx } from "../index.ts"

export const listUsersHandler = defineHandler("user", "List users")
  .errors([
    RedisConnectionError.handlerError(),
    JsonParseError.handlerError(),
  ] as const)
  .input(ListUsersMethod.$inputSchema)
  .output(ListUsersMethod.$outputSchema)
  .withDependencies<IUserManagerCtx>()
  .resolver((deps) => async (input, ctx) => {
    console.log("[INFO] Listing users", input)
    console.log("[INFO] Context:", ctx)

    // Get users from Redis
    const redisResult = await deps.Redis.get("users")
    if (redisResult.isErr()) {
      return err(redisResult.error.toHandlerError())
    }

    // Parse JSON
    const parseResult = parseJson<UserEntity[]>(redisResult.value ?? "[]")
    if (parseResult.isErr()) {
      return err(parseResult.error.toHandlerError())
    }

    // Return success
    return ok({ users: parseResult.value })
  })
  .build()
