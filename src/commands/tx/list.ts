import * as p from '@clack/prompts'
import type { Address } from 'viem'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import type { TransactionStatus } from '../../types/transaction.js'

export async function listTransactions(safeAddress?: Address, statusFilter?: TransactionStatus) {
  p.intro('Safe Transactions')

  try {
    const safeStorage = getSafeStorage()
    const transactionStore = getTransactionStore()

    let transactions = transactionStore.getAllTransactions()

    // Filter by Safe address if provided
    if (safeAddress) {
      transactions = transactions.filter(
        (tx) => tx.safeAddress.toLowerCase() === safeAddress.toLowerCase()
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
    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    console.log(`\nFound ${transactions.length} transaction(s):\n`)

    for (const tx of transactions) {
      const safe = safeStorage.getSafe(tx.safeAddress, tx.chainId)
      const safeName = safe?.name || 'Unknown'

      // Status badge
      const statusBadge = {
        pending: '⏳ PENDING',
        signed: '✍️  SIGNED',
        executed: '✅ EXECUTED',
        rejected: '❌ REJECTED',
      }[tx.status]

      console.log(`${statusBadge} ${tx.id}`)
      console.log(`  Safe: ${safeName} (${tx.safeAddress})`)
      console.log(`  Chain: ${tx.chainId}`)
      console.log(`  To: ${tx.metadata.to}`)
      console.log(`  Value: ${tx.metadata.value} wei`)
      console.log(`  Operation: ${tx.metadata.operation === 0 ? 'Call' : 'DelegateCall'}`)
      console.log(`  Signatures: ${tx.signatures.length}${safe ? `/${safe.threshold}` : ''}`)
      console.log(`  Created: ${tx.createdAt.toLocaleString()}`)
      console.log(`  Created by: ${tx.createdBy}`)

      if (tx.safeTxHash) {
        console.log(`  Safe TX Hash: ${tx.safeTxHash}`)
      }

      if (tx.executedAt) {
        console.log(`  Executed: ${tx.executedAt.toLocaleString()}`)
      }

      if (tx.txHash) {
        console.log(`  TX Hash: ${tx.txHash}`)
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

    console.log('Summary:')
    console.log(`  Pending: ${summary.pending}`)
    console.log(`  Signed: ${summary.signed}`)
    console.log(`  Executed: ${summary.executed}`)
    console.log(`  Rejected: ${summary.rejected}`)

    p.outro('Done')
  } catch (error) {
    p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    p.outro('Failed')
  }
}
