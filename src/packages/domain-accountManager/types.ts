import {
  IRedisService,
  IUserManagerService
} from "@framewerk/contracts/index"

export interface AccountManagerCtx {
  Redis: IRedisService
  UserManager: IUserManagerService
}
