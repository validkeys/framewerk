import { IRedisService } from "../core-contracts/index.ts"

export interface IUserManagerCtx {
  Redis: IRedisService
}

export const makeUserManagerService = (ctx: IUserManagerCtx) => {
  return {
    async listUsers() {
      // Implementation for listing users
      const users = await ctx.Redis.get("users")
      return JSON.parse(users || "[]")
    },
    async getUserById(userId: string) {
      // Implementation for getting a user by ID
      const users = await ctx.Redis.get("users")
      const userList = JSON.parse(users || "[]")
      return userList.find((user: { id: string }) => user.id === userId)
    },
  }
}
