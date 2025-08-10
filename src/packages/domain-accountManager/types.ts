import {
  IRedisService,
  IUserManagerService
} from "@framewerk/contracts/index"

export interface AccountManagerDeps {
  Redis: IRedisService
  UserManager: IUserManagerService
}
