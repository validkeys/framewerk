import { IRedisService, IUserManagerService } from "../core-contracts/index.ts"
import { UserEntity } from "../core-contracts/entities.ts"
import { parseJson } from "../core-std/json.ts"
import { UncaughtDefectError } from "../core-contracts/errors.ts"
import { err } from "neverthrow"

export interface IUserManagerCtx {
  Redis: IRedisService
}

export const makeUserManagerService = (
  ctx: IUserManagerCtx
): IUserManagerService => {
  return {
    async listUsers() {
      const result = await ctx.Redis.get("users")

      if (result.isErr()) {
        return err(result.error)
      }

      const parsed = parseJson<UserEntity[]>(result.value ?? "[]")

      if (parsed.isErr()) {
        return err(
          new UncaughtDefectError("Failed to parse users JSON", parsed.error)
        )
      }

      return parsed
    },
  }
}
