import * as p from '@clack/prompts'
import type { Address } from 'viem'
import type { SafeAccountStorage } from '../storage/safe-store.js'
import type { ConfigStore } from '../storage/config-store.js'
import type { ChainConfig } from '../types/config.js'
import type { Wallet } from '../types/wallet.js'
import type { SafeAccount } from '../types/safe.js'
import type { StoredTransaction, TransactionStatus } from '../types/transaction.js'
import type { TransactionStore } from '../storage/transaction-store.js'
import { TransactionService } from '../services/transaction-service.js'
import { formatSafeAddress, parseSafeAddress } from './eip3770.js'

/**
 * Prompts user to select a deployed Safe with EIP-3770 formatting.
 * @returns Object with chainId and address, or null if cancelled/no Safes available
 */
export async function selectDeployedSafe(
  safeStorage: SafeAccountStorage,
  configStore: ConfigStore,
  chains: Record<string, ChainConfig>
): Promise<{ chainId: string; address: Address } | null> {
  const safes = safeStorage.getAllSafes().filter((s: SafeAccount) => s.deployed)

  if (safes.length === 0) {
    p.log.error('No deployed Safes found')
    p.cancel('Use "safe account deploy" to deploy a Safe first')
    return null
  }

  const selected = await p.select({
    message: 'Select Safe:',
    options: safes.map((s: SafeAccount) => {
      const chain = configStore.getChain(s.chainId)
      const eip3770 = formatSafeAddress(s.address as Address, s.chainId, chains)
      return {
        value: `${s.chainId}:${s.address}`,
        label: `${s.name} (${eip3770})`,
        hint: chain?.name || s.chainId,
      }
    }),
  })

  if (p.isCancel(selected)) {
    p.cancel('Operation cancelled')
    return null
  }

  const [chainId, address] = (selected as string).split(':')
  return { chainId, address: address as Address }
}

/**
 * Fetches Safe owners and threshold from the blockchain.
 * @returns Object with owners and threshold, or null if fetch fails (with error logged)
 */
export async function fetchSafeOwnersAndThreshold(
  chain: ChainConfig,
  safeAddress: Address
): Promise<{ owners: Address[]; threshold: number } | null> {
  const spinner = p.spinner()
  spinner.start('Fetching Safe information from blockchain...')

  try {
    const txService = new TransactionService(chain)
    const [owners, threshold] = await Promise.all([
      txService.getOwners(safeAddress),
      txService.getThreshold(safeAddress),
    ])
    spinner.stop('Safe information fetched')
    return { owners, threshold }
  } catch (error) {
    spinner.stop('Failed to fetch Safe information')
    p.log.error(
      error instanceof Error ? error.message : 'Failed to fetch Safe data from blockchain'
    )
    p.outro('Failed')
    return null
  }
}

/**
 * Verifies that the active wallet is an owner of the Safe.
 * @returns true if wallet is an owner, false otherwise (with error logged)
 */
export function ensureWalletIsOwner(activeWallet: Wallet, owners: Address[]): boolean {
  const isOwner = owners.some((owner) => owner.toLowerCase() === activeWallet.address.toLowerCase())

  if (!isOwner) {
    p.log.error('Active wallet is not an owner of this Safe')
    p.outro('Failed')
  }

  return isOwner
}

/**
 * Parses an EIP-3770 address string with consistent error handling.
 * @returns Object with chainId and address, or null if parsing fails (with error logged)
 */
export function parseAddressInput(
  account: string,
  chains: Record<string, ChainConfig>
): { chainId: string; address: Address } | null {
  try {
    const parsed = parseSafeAddress(account, chains)
    return { chainId: parsed.chainId, address: parsed.address }
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : 'Invalid account')
    p.cancel('Operation cancelled')
    return null
  }
}

/**
 * Prompts user to select a transaction from a filtered list.
 * @param transactionStore - Transaction storage instance
 * @param safeStorage - Safe storage instance
 * @param configStore - Config storage instance
 * @param statusFilter - Optional array of statuses to filter by
 * @param message - Custom message for the selection prompt
 * @returns Selected transaction hash, or null if cancelled/no transactions
 */
export async function selectTransaction(
  transactionStore: TransactionStore,
  safeStorage: SafeAccountStorage,
  configStore: ConfigStore,
  statusFilter?: TransactionStatus[],
  message: string = 'Select transaction'
): Promise<string | null> {
  let transactions = transactionStore.getAllTransactions()

  // Apply status filter if provided
  if (statusFilter) {
    transactions = transactions.filter((tx: StoredTransaction) => statusFilter.includes(tx.status))
  }

  if (transactions.length === 0) {
    p.log.error('No transactions found')
    p.outro('Nothing to select')
    return null
  }

  const chains = configStore.getAllChains()

  const selected = await p.select({
    message,
    options: transactions.map((tx: StoredTransaction) => {
      const safe = safeStorage.getSafe(tx.chainId, tx.safeAddress)
      const eip3770 = formatSafeAddress(tx.safeAddress as Address, tx.chainId, chains)
      return {
        value: tx.safeTxHash,
        label: `${tx.safeTxHash.slice(0, 10)}... → ${tx.metadata.to}`,
        hint: `Safe: ${safe?.name || eip3770} | Signatures: ${tx.signatures?.length || 0}`,
      }
    }),
  })

  if (p.isCancel(selected)) {
    p.cancel('Operation cancelled')
    return null
  }

  return selected as string
}
