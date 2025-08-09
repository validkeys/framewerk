import z from "zod"

export const AccountEntitySchema = z.object({
  id: z.string(),
  name: z.string(),
})

export const UserEntitySchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
})

export type AccountEntity = z.infer<typeof AccountEntitySchema>
export type UserEntity = z.infer<typeof UserEntitySchema>
