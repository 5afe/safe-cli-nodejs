import { z } from 'zod'

export const SafeAccountConfigSchema = z.object({
  owners: z.array(z.string()),
  threshold: z.number(),
  saltNonce: z.string().optional(),
})

export const SafeAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  chainId: z.string(),
  version: z.string(),
  owners: z.array(z.string()),
  threshold: z.number(),
  deployed: z.boolean(),
  predictedConfig: SafeAccountConfigSchema.optional(),
  createdAt: z.string(),
  lastUsed: z.string().optional(),
})

export const SafeStoreSchema = z.object({
  safes: z.record(z.string(), SafeAccountSchema).default({}),
  activeSafe: z.string().nullable().default(null),
})

export type SafeAccountConfig = z.infer<typeof SafeAccountConfigSchema>
export type SafeAccount = z.infer<typeof SafeAccountSchema>
export type SafeStore = z.infer<typeof SafeStoreSchema>
