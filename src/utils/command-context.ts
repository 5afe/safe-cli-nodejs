import { getConfigStore, type ConfigStore } from '../storage/config-store.js'
import { getSafeStorage, type SafeAccountStorage } from '../storage/safe-store.js'
import { getWalletStorage, type WalletStorageService } from '../storage/wallet-store.js'
import { getTransactionStore, type TransactionStore } from '../storage/transaction-store.js'
import { getValidationService, type ValidationService } from '../services/validation-service.js'
import type { ChainConfig } from '../types/config.js'

/**
 * Command context containing all common dependencies for commands.
 * This reduces boilerplate and provides a single point for dependency injection.
 */
export interface CommandContext {
  configStore: ConfigStore
  safeStorage: SafeAccountStorage
  walletStorage: WalletStorageService
  transactionStore: TransactionStore
  validator: ValidationService
  chains: Record<string, ChainConfig>
}

/**
 * Initializes all common command dependencies.
 * Use this at the start of command functions to reduce boilerplate.
 *
 * @example
 * ```typescript
 * export async function myCommand() {
 *   const ctx = createCommandContext()
 *
 *   const activeWallet = ensureActiveWallet(ctx.walletStorage)
 *   if (!activeWallet) return
 *
 *   // ... rest of command logic
 * }
 * ```
 */
export function createCommandContext(): CommandContext {
  const configStore = getConfigStore()
  return {
    configStore,
    safeStorage: getSafeStorage(),
    walletStorage: getWalletStorage(),
    transactionStore: getTransactionStore(),
    validator: getValidationService(),
    chains: configStore.getAllChains(),
  }
}
