import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import type { TransactionStatus } from '../../types/transaction.js'
import { formatSafeAddress } from '../../utils/eip3770.js'

export async function listTransactions(account?: string, statusFilter?: TransactionStatus) {
  p.intro('Safe Transactions')

  try {
    const configStore = getConfigStore()
    const safeStorage = getSafeStorage()
    const transactionStore = getTransactionStore()
    const chains = configStore.getAllChains()

    let transactions = transactionStore.getAllTransactions()

    if (transactions.length === 0) {
      p.log.warning('No transactions found')
      p.outro('No transactions')
      return
    }

    // Determine which Safe to filter by
    let filterSafeAddress: string | null = null
    let filterChainId: string | null = null

    if (account) {
      // Parse EIP-3770 format if provided
      if (account.includes(':')) {
        const parsed = account.split(':')
        const shortName = parsed[0]
        const address = parsed[1]

        // Find chain by shortName
        const chain = Object.values(chains).find(c => c.shortName === shortName)
        if (chain) {
          filterChainId = chain.chainId
          filterSafeAddress = address
        }
      } else {
        filterSafeAddress = account
      }
    } else {
      // Interactive mode: ask user to select a Safe or show all
      const safes = safeStorage.getAllSafes()

      if (safes.length === 0) {
        p.log.warning('No Safes found. Showing all transactions.')
      } else {
        const options = [
          {
            value: 'all',
            label: 'Show all transactions',
            hint: 'All Safes',
          },
          ...safes.map((safe) => {
            const chain = configStore.getChain(safe.chainId)
            const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)
            const txCount = transactions.filter(
              tx => tx.chainId === safe.chainId && tx.safeAddress.toLowerCase() === safe.address.toLowerCase()
            ).length

            return {
              value: `${safe.chainId}:${safe.address}`,
              label: `${safe.name} (${eip3770})`,
              hint: `${chain?.name || safe.chainId} | ${txCount} tx`,
            }
          }),
        ]

        const selected = await p.select({
          message: 'Select Safe to view transactions:',
          options,
        })

        if (p.isCancel(selected)) {
          p.cancel('Operation cancelled')
          return
        }

        if (selected !== 'all') {
          const [chainId, address] = (selected as string).split(':')
          filterChainId = chainId
          filterSafeAddress = address
        }
      }
    }

    // Filter by Safe address if specified
    if (filterSafeAddress) {
      transactions = transactions.filter(
        (tx) => tx.safeAddress.toLowerCase() === filterSafeAddress!.toLowerCase() &&
                (!filterChainId || tx.chainId === filterChainId)
      )
    }

    // Filter by status if provided
    if (statusFilter) {
      transactions = transactions.filter((tx) => tx.status === statusFilter)
    }

    if (transactions.length === 0) {
      p.log.warning('No transactions found')
      p.outro('No transactions')
      return
    }

    // Sort by creation date (newest first)
    transactions.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    console.log(`\nFound ${transactions.length} transaction(s):\n`)

    for (const tx of transactions) {
      const safe = safeStorage.getSafe(tx.chainId, tx.safeAddress)
      const safeName = safe?.name || 'Unknown'
      const eip3770 = formatSafeAddress(tx.safeAddress as Address, tx.chainId, chains)
      const chain = configStore.getChain(tx.chainId)

      // Status badge
      const statusBadge = {
        pending: '⏳ PENDING',
        signed: '✍️  SIGNED',
        executed: '✅ EXECUTED',
        rejected: '❌ REJECTED',
      }[tx.status]

      console.log(`${statusBadge}`)
      console.log(`  ${pc.bold('Safe TX Hash:')} ${tx.safeTxHash}`)
      console.log(`  ${pc.bold('Safe:')} ${safeName} (${eip3770})`)
      console.log(`  ${pc.bold('Chain:')} ${chain?.name || tx.chainId}`)
      console.log(`  ${pc.bold('To:')} ${tx.metadata.to}`)
      console.log(`  ${pc.bold('Value:')} ${tx.metadata.value} wei`)
      console.log(`  ${pc.bold('Operation:')} ${tx.metadata.operation === 0 ? 'Call' : 'DelegateCall'}`)
      console.log(`  ${pc.bold('Signatures:')} ${tx.signatures.length}${safe ? `/${safe.threshold}` : ''}`)
      console.log(`  ${pc.bold('Created:')} ${new Date(tx.createdAt).toLocaleString()}`)
      console.log(`  ${pc.bold('Created by:')} ${tx.createdBy}`)

      if (tx.executedAt) {
        console.log(`  ${pc.bold('Executed:')} ${new Date(tx.executedAt).toLocaleString()}`)
      }

      if (tx.txHash) {
        console.log(`  ${pc.bold('TX Hash:')} ${tx.txHash}`)
      }

      console.log('')
    }

    // Summary
    const summary = {
      pending: transactions.filter((tx) => tx.status === 'pending').length,
      signed: transactions.filter((tx) => tx.status === 'signed').length,
      executed: transactions.filter((tx) => tx.status === 'executed').length,
      rejected: transactions.filter((tx) => tx.status === 'rejected').length,
    }

    console.log(pc.bold('Summary:'))
    console.log(`  ${pc.bold('Pending:')} ${summary.pending}`)
    console.log(`  ${pc.bold('Signed:')} ${summary.signed}`)
    console.log(`  ${pc.bold('Executed:')} ${summary.executed}`)
    console.log(`  ${pc.bold('Rejected:')} ${summary.rejected}`)

    p.outro('Done')
  } catch (error) {
    p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    p.outro('Failed')
  }
}
