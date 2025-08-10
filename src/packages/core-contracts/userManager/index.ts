import { ListUsersMethod } from "./handlers/index.ts"

export * from "./handlers/index.ts"
export interface IUserManagerService {
  listUsers: ListUsersMethod.Handler
}
