import { IRedisService, IUserManagerService } from "@framewerk/contracts/index"
import { UserEntity } from "@framewerk/contracts/entities"
import { parseJson } from "@framewerk/std/json"
import { UncaughtDefectError } from "@framewerk/contracts/errors"
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
