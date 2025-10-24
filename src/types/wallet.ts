import { z } from 'zod'

export const WalletSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  createdAt: z.string(),
  lastUsed: z.string().optional(),
})

export const WalletStoreSchema = z.object({
  wallets: z.record(z.string(), WalletSchema).default({}),
  activeWallet: z.string().nullable().default(null),
})

export type Wallet = z.infer<typeof WalletSchema>
export type WalletStore = z.infer<typeof WalletStoreSchema>

// Private key is stored separately in secure storage
export interface WalletWithPrivateKey extends Wallet {
  privateKey: string
}
