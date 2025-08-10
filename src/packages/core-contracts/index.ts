import { RedisConnectionError } from "../core-framewerk/errors.ts"
import { Result } from "./result.ts"


export interface IRedisService {
  get(key: string): Promise<Result<string | null, RedisConnectionError>>
  set(
    key: string,
    value: string,
    ttl?: number
  ): Promise<Result<void, RedisConnectionError>>
}

export * from "./accountManager/index.ts"
export * from "./userManager/index.ts"