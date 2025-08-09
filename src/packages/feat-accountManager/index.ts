import { IAccountManagerService } from "../core-contracts/index.ts"
import { makeListAccountsHandler } from "./handlers/index.ts"
import { AccountManagerCtx } from "./types.ts"

// Define the context for the AccountManager service
export const makeAccountManagerService = (
  ctx: AccountManagerCtx
): IAccountManagerService => {
  return {
    listAccounts: makeListAccountsHandler(ctx),
  }
}
