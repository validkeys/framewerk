import { z } from "zod"
import { AccountEntitySchema } from "@framewerk/contracts/entities"
import type { Result } from "@framewerk/contracts/result"
import { RedisConnectionError, UncaughtDefectError } from "@framewerk/contracts/errors"

export const $inputSchema = z.object({
  accountType: z.string().optional(),
})
export const $outputSchema = z.object({
  accounts: z.array(AccountEntitySchema),
})

export type Input = z.infer<typeof $inputSchema>
export type Output = z.infer<typeof $outputSchema>

export type Type = (
  input: Input
) => Promise<Result<Output, RedisConnectionError | UncaughtDefectError>>
