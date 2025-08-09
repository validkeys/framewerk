import { IRedisService, IUserManagerService } from "../core-contracts/index.ts"

// Define the context for the AccountManager service
export interface AccountManagerCtx {
  Redis: IRedisService
  UserManager: IUserManagerService
}

export const makeAccountManagerService = (ctx: AccountManagerCtx) => {
  return {
    async listAccounts() {
      // Implementation for listing accounts
      const accounts = await ctx.Redis.get("accounts")
      return JSON.parse(accounts || "[]")
    },
    async getUserDetails(userId: string) {
      // Implementation for getting user details
      const user = await ctx.UserManager.listUsers()
      return user.find((u) => u.id === userId)
    },
  }
}
