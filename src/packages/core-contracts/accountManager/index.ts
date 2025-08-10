export * from "./handlers/index.ts"

import { Handler as ListAccountsHandler } from "./handlers/listAccounts.ts"

export interface IAccountManagerService {
  listAccounts: ListAccountsHandler
}
