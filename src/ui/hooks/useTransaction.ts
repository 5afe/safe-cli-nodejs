import { useState, useEffect } from 'react'
import type { Address } from 'viem'
import { getTransactionStore } from '../../storage/transaction-store.js'
import type { StoredTransaction } from '../../types/transaction.js'
import { TransactionStatus } from '../../types/transaction.js'

/**
 * Hook for accessing all transactions in Ink components.
 * Provides the complete list of stored transactions.
 *
 * @example
 * ```tsx
 * function TransactionListScreen() {
 *   const { transactions, loading, error } = useTransactions()
 *
 *   if (loading) return <Spinner message="Loading transactions..." />
 *   if (error) return <Text color="red">{error}</Text>
 *
 *   return (
 *     <List
 *       items={transactions}
 *       renderItem={(tx) => <TransactionItem transaction={tx} />}
 *     />
 *   )
 * }
 * ```
 */
export function useTransactions() {
  const [transactions, setTransactions] = useState<StoredTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const txStore = getTransactionStore()
      const allTxs = txStore.getAllTransactions()

      setTransactions(allTxs)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
      setLoading(false)
    }
  }, [])

  return { transactions, loading, error }
}

/**
 * Hook for accessing a specific transaction by Safe transaction hash.
 *
 * @param safeTxHash - The Safe transaction hash
 *
 * @example
 * ```tsx
 * function TransactionDetails({ safeTxHash }) {
 *   const { transaction, loading, error } = useTransaction(safeTxHash)
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Text color="red">{error}</Text>
 *   if (!transaction) return <Text>Transaction not found</Text>
 *
 *   return (
 *     <Box flexDirection="column">
 *       <Header title="Transaction Details" />
 *       <KeyValue
 *         items={[
 *           { key: 'Safe Tx Hash', value: transaction.safeTxHash },
 *           { key: 'Status', value: transaction.status },
 *           { key: 'Signatures', value: transaction.signatures.length },
 *         ]}
 *       />
 *     </Box>
 *   )
 * }
 * ```
 */
export function useTransaction(safeTxHash: string) {
  const [transaction, setTransaction] = useState<StoredTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const txStore = getTransactionStore()
      const foundTx = txStore.getTransaction(safeTxHash)

      setTransaction(foundTx || null)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction')
      setLoading(false)
    }
  }, [safeTxHash])

  return { transaction, loading, error }
}

/**
 * Hook for accessing transactions for a specific Safe account.
 * Optionally filter by chain ID.
 *
 * @param safeAddress - The Safe account address
 * @param chainId - Optional chain ID to filter by
 *
 * @example
 * ```tsx
 * function SafeTransactionsScreen({ safeAddress, chainId }) {
 *   const { transactions, loading, error } = useTransactionsBySafe(safeAddress, chainId)
 *
 *   if (loading) return <Spinner message="Loading transactions..." />
 *
 *   return (
 *     <Box flexDirection="column">
 *       <Header title={`Transactions for ${safeAddress}`} />
 *       <List
 *         items={transactions}
 *         renderItem={(tx) => (
 *           <Box>
 *             <Text>{tx.safeTxHash.slice(0, 10)}...</Text>
 *             <Text color="dim">Status: {tx.status}</Text>
 *           </Box>
 *         )}
 *         emptyMessage="No transactions found"
 *       />
 *     </Box>
 *   )
 * }
 * ```
 */
export function useTransactionsBySafe(safeAddress: Address, chainId?: string) {
  const [transactions, setTransactions] = useState<StoredTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const txStore = getTransactionStore()
      const safeTxs = txStore.getTransactionsBySafe(safeAddress, chainId)

      setTransactions(safeTxs)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
      setLoading(false)
    }
  }, [safeAddress, chainId])

  return { transactions, loading, error }
}

/**
 * Hook for accessing transactions filtered by status.
 * Useful for showing pending, signed, or executed transactions.
 *
 * @param status - The transaction status to filter by
 *
 * @example
 * ```tsx
 * function PendingTransactionsScreen() {
 *   const { transactions, loading } = useTransactionsByStatus(TransactionStatus.PENDING)
 *
 *   return (
 *     <Box flexDirection="column">
 *       <Header title="Pending Transactions" />
 *       <List
 *         items={transactions}
 *         renderItem={(tx) => <TransactionItem transaction={tx} />}
 *         emptyMessage="No pending transactions"
 *       />
 *     </Box>
 *   )
 * }
 * ```
 */
export function useTransactionsByStatus(status: TransactionStatus) {
  const [transactions, setTransactions] = useState<StoredTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const txStore = getTransactionStore()
      const allTxs = txStore.getAllTransactions()
      const filteredTxs = allTxs.filter((tx) => tx.status === status)

      setTransactions(filteredTxs)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
      setLoading(false)
    }
  }, [status])

  return { transactions, loading, error }
}

/**
 * Hook for getting transaction statistics.
 * Returns counts by status and other useful metrics.
 *
 * @example
 * ```tsx
 * function TransactionStatsScreen() {
 *   const { stats, loading } = useTransactionStats()
 *
 *   if (loading) return <Spinner />
 *
 *   return (
 *     <KeyValue
 *       title="Transaction Statistics"
 *       items={[
 *         { key: 'Total', value: stats.total },
 *         { key: 'Pending', value: stats.pending },
 *         { key: 'Signed', value: stats.signed },
 *         { key: 'Executed', value: stats.executed },
 *       ]}
 *     />
 *   )
 * }
 * ```
 */
export function useTransactionStats() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    signed: 0,
    executed: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const txStore = getTransactionStore()
      const allTxs = txStore.getAllTransactions()

      const newStats = {
        total: allTxs.length,
        pending: allTxs.filter((tx) => tx.status === TransactionStatus.PENDING).length,
        signed: allTxs.filter((tx) => tx.status === TransactionStatus.SIGNED).length,
        executed: allTxs.filter((tx) => tx.status === TransactionStatus.EXECUTED).length,
        rejected: allTxs.filter((tx) => tx.status === TransactionStatus.REJECTED).length,
      }

      setStats(newStats)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transaction stats')
      setLoading(false)
    }
  }, [])

  return { stats, loading, error }
}
