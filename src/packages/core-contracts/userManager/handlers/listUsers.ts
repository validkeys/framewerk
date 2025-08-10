import { UserEntitySchema } from "@framewerk/contracts/entities"
import type { Result } from "@framewerk/contracts/result"
import {
  HandlerMethod,
  JsonParseError,
  RedisConnectionError,
  UncaughtDefectError,
} from "@framewerk/core"
import { z } from "zod"

export const $inputSchema = z.object({
  email: z.string().optional(),
})
export const $outputSchema = z.object({
  users: z.array(UserEntitySchema),
})

export type Input = z.infer<typeof $inputSchema>
export type Output = z.infer<typeof $outputSchema>

export type Type = (
  input: Input
) => Promise<Result<Output, RedisConnectionError | UncaughtDefectError>>

export type Handler = HandlerMethod<
  Input,
  Output,
  RedisConnectionError | UncaughtDefectError | JsonParseError
>
