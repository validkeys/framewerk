import { z } from "zod"
import { AccountEntitySchema } from "../../entities.ts"
import type { Result } from "../../result.ts"
import { RedisConnectionError, UncaughtDefectError } from "../../errors.ts"

export const $inputSchema = z.any()
export const $outputSchema = z.object({
  accounts: z.array(AccountEntitySchema),
})

export type Input = z.infer<typeof $inputSchema>
export type Output = z.infer<typeof $outputSchema>

export type Type = (
  input: Input
) => Promise<Result<Output, RedisConnectionError | UncaughtDefectError>>
