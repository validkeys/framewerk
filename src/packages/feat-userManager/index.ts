import { IRedisService, IUserManagerService } from "../core-contracts/index.ts"

export interface IUserManagerCtx {
  Redis: IRedisService
}

export const makeUserManagerService = (
  ctx: IUserManagerCtx
): IUserManagerService => {
  return {
    async listUsers() {
      // Implementation for listing users
      const users = await ctx.Redis.get("users")
      return JSON.parse(users || "[]")
    },
  }
}
