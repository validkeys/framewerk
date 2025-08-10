import {
  IRedisService,
  IUserManagerService
} from "@framewerk/contracts/index"
import { makeListAccountsHandler } from "./handlers/listUsers.ts"

export interface UserManagerDeps {
  Redis: IRedisService
}

export const makeUserManagerService = (
  deps: UserManagerDeps
): IUserManagerService => {
  return {
    listUsers: makeListAccountsHandler(deps),
  }
}
