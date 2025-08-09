import {
  IRedisService,
  IUserManagerService
} from "../core-contracts/index.ts"

export interface AccountManagerCtx {
  Redis: IRedisService
  UserManager: IUserManagerService
}
