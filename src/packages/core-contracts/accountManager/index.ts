export * from "./handlers/index.ts"

import { Type as ListAccountsHandler } from "./handlers/listAccounts.ts"

export interface IAccountManagerService {
  listAccounts: ListAccountsHandler
}
