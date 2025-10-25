import React, { useEffect, useMemo } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { useTransactions, useTransactionsBySafe } from '../hooks/index.js'
import { Header, KeyValue, Spinner } from '../components/index.js'
import { theme } from '../theme.js'
import type { StoredTransaction, TransactionStatus } from '../../types/transaction.js'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { formatSafeAddress } from '../../utils/eip3770.js'

export interface TransactionListScreenProps {
  /**
   * Optional Safe address to filter by
   */
  safeAddress?: string

  /**
   * Optional chain ID to filter by (requires safeAddress)
   */
  chainId?: string

  /**
   * Optional status filter
   */
  statusFilter?: TransactionStatus

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

interface TransactionItemProps {
  transaction: StoredTransaction
}

/**
 * Helper function to get status badge display
 */
function getStatusBadge(status: TransactionStatus): { emoji: string; text: string; color: string } {
  switch (status) {
    case 'pending':
      return { emoji: '⏳', text: 'PENDING', color: theme.colors.warning }
    case 'signed':
      return { emoji: '✍️', text: 'SIGNED', color: theme.colors.info }
    case 'executed':
      return { emoji: '✅', text: 'EXECUTED', color: theme.colors.success }
    case 'rejected':
      return { emoji: '❌', text: 'REJECTED', color: theme.colors.error }
    default:
      return { emoji: '❓', text: 'UNKNOWN', color: theme.colors.dim }
  }
}

/**
 * Individual transaction item component
 */
function TransactionItem({ transaction }: TransactionItemProps): React.ReactElement {
  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const chains = configStore.getAllChains()

  const safe = safeStorage.getSafe(transaction.chainId, transaction.safeAddress)
  const safeName = safe?.name || 'Unknown'
  const eip3770 = formatSafeAddress(transaction.safeAddress as Address, transaction.chainId, chains)
  const chain = configStore.getChain(transaction.chainId)

  const statusBadge = getStatusBadge(transaction.status)

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Status badge */}
      <Box marginBottom={1}>
        <Text color={statusBadge.color}>
          {statusBadge.emoji} {statusBadge.text}
        </Text>
      </Box>

      {/* Transaction details */}
      <Box marginLeft={2}>
        <KeyValue
          items={[
            { key: 'Safe TX Hash', value: transaction.safeTxHash, valueColor: theme.colors.primary },
            { key: 'Safe', value: `${safeName} (${eip3770})` },
            { key: 'Chain', value: chain?.name || transaction.chainId },
            { key: 'To', value: transaction.metadata.to },
            { key: 'Value', value: `${transaction.metadata.value} wei` },
            {
              key: 'Operation',
              value: transaction.metadata.operation === 0 ? 'Call' : 'DelegateCall',
            },
            {
              key: 'Signatures',
              value: `${transaction.signatures.length}${safe ? `/${safe.threshold}` : ''}`,
            },
            { key: 'Created', value: new Date(transaction.createdAt).toLocaleString() },
            { key: 'Created by', value: transaction.createdBy },
            ...(transaction.executedAt
              ? [
                  {
                    key: 'Executed',
                    value: new Date(transaction.executedAt).toLocaleString(),
                  },
                ]
              : []),
            ...(transaction.txHash
              ? [
                  {
                    key: 'TX Hash',
                    value: transaction.txHash,
                    valueColor: theme.colors.primary,
                  },
                ]
              : []),
          ]}
        />
      </Box>
    </Box>
  )
}

/**
 * TransactionListScreen displays a list of Safe transactions.
 * This replaces the imperative console.log implementation in commands/tx/list.ts
 *
 * Features:
 * - Displays all transactions or filtered by Safe and status
 * - Shows detailed transaction information
 * - Displays summary statistics by status
 * - Empty state handling
 * - Sorted by creation date (newest first)
 */
export function TransactionListScreen({
  safeAddress,
  chainId,
  statusFilter,
  onExit,
}: TransactionListScreenProps): React.ReactElement {
  // Use appropriate hook based on filtering
  const allTransactionsResult = useTransactions()
  const filteredTransactionsResult = useTransactionsBySafe(
    (safeAddress || '') as Address,
    chainId
  )

  const { transactions: rawTransactions, loading, error } = safeAddress
    ? filteredTransactionsResult
    : allTransactionsResult

  // Auto-exit after rendering
  useEffect(() => {
    if (!loading && onExit) {
      onExit()
    }
  }, [loading, onExit])

  // Apply status filter and sort
  const transactions = useMemo(() => {
    let result = [...rawTransactions]

    // Filter by status if provided
    if (statusFilter) {
      result = result.filter((tx) => tx.status === statusFilter)
    }

    // Sort by creation date (newest first)
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    return result
  }, [rawTransactions, statusFilter])

  // Calculate summary statistics
  const summary = useMemo(() => {
    return {
      pending: transactions.filter((tx) => tx.status === 'pending').length,
      signed: transactions.filter((tx) => tx.status === 'signed').length,
      executed: transactions.filter((tx) => tx.status === 'executed').length,
      rejected: transactions.filter((tx) => tx.status === 'rejected').length,
    }
  }, [transactions])

  // Loading state
  if (loading) {
    return <Spinner message="Loading transactions..." />
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={theme.colors.error}>Error: {error}</Text>
      </Box>
    )
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header title="Safe Transactions" />
        <Box marginBottom={1}>
          <Text color={theme.colors.warning}>No transactions found</Text>
        </Box>
        <Text color={theme.colors.dim}>
          {safeAddress
            ? 'This Safe has no transactions yet'
            : 'No transactions found. Create one with "safe tx create"'}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Safe Transactions" />

      {/* Transaction count */}
      <Box marginBottom={1}>
        <Text>
          Found <Text bold>{transactions.length}</Text> transaction(s)
        </Text>
      </Box>

      {/* Transaction list */}
      <Box flexDirection="column" marginBottom={1}>
        {transactions.map((tx) => (
          <TransactionItem key={tx.safeTxHash} transaction={tx} />
        ))}
      </Box>

      {/* Summary statistics */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          title="Summary"
          items={[
            { key: 'Pending', value: summary.pending.toString(), valueColor: theme.colors.warning },
            { key: 'Signed', value: summary.signed.toString(), valueColor: theme.colors.info },
            { key: 'Executed', value: summary.executed.toString(), valueColor: theme.colors.success },
            { key: 'Rejected', value: summary.rejected.toString(), valueColor: theme.colors.error },
          ]}
        />
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Transactions displayed successfully</Text>
      </Box>
    </Box>
  )
}
