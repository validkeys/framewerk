import { UserEntity } from "./entities.ts"


export interface IUserManagerService {
  listUsers(): Promise<UserEntity[]>
}

export interface IRedisService {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttl?: number): Promise<void>
}

export * from "./accountManager/index.ts"
