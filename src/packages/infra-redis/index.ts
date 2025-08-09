import { IRedisService } from "../core-contracts/index.ts"

export const makeRedisService = (): IRedisService => {
  const obj: Record<string, any> = {}
  return {
    get: async (key: string): Promise<string | null> => {
      // Implementation for getting a value from Redis
      return obj[key] || null
    },
    set: async (key: string, value: string, ttl?: number): Promise<void> => {
      // Implementation for setting a value in Redis with optional TTL
      obj[key] = value
    },
  }
}
