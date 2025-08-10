import { z } from "zod"
import { UserEntitySchema } from "@framewerk/contracts/entities"
import type { Result } from "@framewerk/contracts/result"
import {
  RedisConnectionError,
  UncaughtDefectError,
} from "@framewerk/contracts/errors"

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
