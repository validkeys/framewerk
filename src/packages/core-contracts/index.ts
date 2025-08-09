import { UserEntity } from "./entities.ts"
import { Result } from "./result.ts"
import { RedisConnectionError, UncaughtDefectError } from "./errors.ts"

export interface IUserManagerService {
  listUsers(): Promise<Result<UserEntity[], RedisConnectionError | UncaughtDefectError>>
}

export interface IRedisService {
  get(key: string): Promise<Result<string | null, RedisConnectionError>>
  set(
    key: string,
    value: string,
    ttl?: number
  ): Promise<Result<void, RedisConnectionError>>
}

export * from "./accountManager/index.ts"
