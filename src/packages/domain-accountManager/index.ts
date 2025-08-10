import { IAccountManagerService } from "@framewerk/contracts/index";
import { makeListAccountsHandler } from "./handlers/index.ts"
import { AccountManagerDeps } from "./types.ts"

// Define the context for the AccountManager service
export const makeAccountManagerService = (
  ctx: AccountManagerDeps
): IAccountManagerService => {
  return {
    listAccounts: makeListAccountsHandler(ctx),
  }
}
