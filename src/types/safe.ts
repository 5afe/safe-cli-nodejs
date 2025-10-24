import { z } from 'zod'

export const SafeAccountConfigSchema = z.object({
  owners: z.array(z.string()),
  threshold: z.number(),
  saltNonce: z.string().optional(),
})

export const SafeAccountSchema = z.object({
  name: z.string(),
  address: z.string(),
  chainId: z.string(),
  deployed: z.boolean(),
  predictedConfig: SafeAccountConfigSchema.optional(),
  createdAt: z.string(),
  // For deployed Safes, store the current on-chain state
  owners: z.array(z.string()).optional(),
  threshold: z.number().optional(),
})

export const SafeStoreSchema = z.object({
  // Keyed by "chainId:address" for uniqueness
  safes: z.record(z.string(), SafeAccountSchema).default({}),
})

export type SafeAccountConfig = z.infer<typeof SafeAccountConfigSchema>
export type SafeAccount = z.infer<typeof SafeAccountSchema>
export type SafeStore = z.infer<typeof SafeStoreSchema>
