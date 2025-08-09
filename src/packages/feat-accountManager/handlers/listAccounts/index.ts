import { ListAccountsMethod } from "../../../core-contracts/accountManager/index.ts"
import { AccountManagerCtx } from "../../types.ts"

export const makeListAccountsHandler =
  (ctx: AccountManagerCtx): ListAccountsMethod.Type =>
  async (_input) => {
    console.log("[INFO] Listing accounts", _input)
    const accounts = await ctx.Redis.get("accounts")
    return {
      accounts: JSON.parse(accounts || "[]"),
    }
  }
