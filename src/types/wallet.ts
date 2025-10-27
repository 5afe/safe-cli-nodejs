import { z } from 'zod'

// Base wallet schema shared by all wallet types
const BaseWalletSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  createdAt: z.string(),
  lastUsed: z.string().optional(),
})

// Private key wallet (existing)
export const PrivateKeyWalletSchema = BaseWalletSchema.extend({
  type: z.literal('private-key'),
})

// Ledger hardware wallet
export const LedgerWalletSchema = BaseWalletSchema.extend({
  type: z.literal('ledger'),
  derivationPath: z.string(), // e.g., "44'/60'/0'/0/0"
})

// Union of all wallet types
export const WalletSchema = z.discriminatedUnion('type', [
  PrivateKeyWalletSchema,
  LedgerWalletSchema,
])

export const WalletStoreSchema = z.object({
  wallets: z.record(z.string(), WalletSchema).default({}),
  activeWallet: z.string().nullable().default(null),
})

export type PrivateKeyWallet = z.infer<typeof PrivateKeyWalletSchema>
export type LedgerWallet = z.infer<typeof LedgerWalletSchema>
export type Wallet = z.infer<typeof WalletSchema>
export type WalletStore = z.infer<typeof WalletStoreSchema>

// Private key is stored separately in secure storage (only for private-key wallets)
export interface WalletWithPrivateKey extends PrivateKeyWallet {
  privateKey: string
}
