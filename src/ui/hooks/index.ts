/**
 * Custom React hooks for Safe CLI UI state management.
 *
 * Hooks provide reactive access to application state for Ink components.
 * All hooks follow a consistent pattern with loading, error, and data states.
 */

// Wallet hooks
export { useWallets, useWallet } from './useWallet.js'

// Safe account hooks
export { useSafes, useSafe, useSafesByChain, useSafeExists } from './useSafe.js'

// Configuration hooks
export {
  useConfig,
  useChains,
  useChain,
  useDefaults,
  usePreferences,
  useChainExists,
} from './useConfig.js'

// Transaction hooks
export {
  useTransactions,
  useTransaction,
  useTransactionsBySafe,
  useTransactionsByStatus,
  useTransactionStats,
} from './useTransaction.js'
