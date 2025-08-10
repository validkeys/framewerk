import { IRedisService } from "@framewerk/contracts/index";
import { ok, err } from "neverthrow";
import { RedisConnectionError } from "packages/core-framewerk/errors";

export const makeRedisService = (): IRedisService => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: Record<string, any> = {};
  return {
    get: async (key: string) => {
      try {
        // Simulate Redis get
        const value = obj[key] ?? null;
        return ok(value);
      } catch (e) {
        return err(new RedisConnectionError("Failed to get value from Redis", e));
      }
    },
    set: async (key: string, value: string) => {
      try {
        // Simulate Redis set
        obj[key] = value;
        return ok(undefined);
      } catch (e) {
        return err(new RedisConnectionError("Failed to set value in Redis", e));
      }
    },
  };
};
