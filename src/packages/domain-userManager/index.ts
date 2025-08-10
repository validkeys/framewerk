import {
  IRedisService,
  IUserManagerService
} from "@framewerk/contracts/index"
import { makeListAccountsHandler } from "./handlers/listUsers.ts"

export interface IUserManagerCtx {
  Redis: IRedisService
}

export const makeUserManagerService = (
  ctx: IUserManagerCtx
): IUserManagerService => {
  return {
    listUsers: makeListAccountsHandler(ctx),
  }
}
