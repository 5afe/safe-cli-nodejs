import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header } from '../components/index.js'
import { theme } from '../theme.js'

export interface TransactionPullResult {
  /**
   * Transaction hash (safeTxHash)
   */
  safeTxHash: string

  /**
   * Status: 'imported', 'updated', or 'skipped'
   */
  status: 'imported' | 'updated' | 'skipped'

  /**
   * Number of signatures (for imported) or new signatures (for updated)
   */
  signatureCount: number
}

export interface TransactionPullSuccessScreenProps {
  /**
   * Safe address in EIP-3770 format
   */
  safeEip3770: string

  /**
   * List of transaction results
   */
  transactions: TransactionPullResult[]

  /**
   * Number of imported transactions
   */
  imported: number

  /**
   * Number of updated transactions
   */
  updated: number

  /**
   * Number of skipped transactions
   */
  skipped: number

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionPullSuccessScreen displays results after pulling transactions from Safe API.
 * This replaces the console.log implementation in commands/tx/pull.ts
 *
 * Features:
 * - Lists each transaction with its status (imported/updated/skipped)
 * - Shows signature counts
 * - Displays summary statistics
 * - Color-coded status indicators
 */
export function TransactionPullSuccessScreen({
  safeEip3770,
  transactions,
  imported,
  updated,
  skipped,
  onExit,
}: TransactionPullSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const getStatusIcon = (status: TransactionPullResult['status']) => {
    switch (status) {
      case 'imported':
        return { icon: '✓', color: theme.colors.success }
      case 'updated':
        return { icon: '↻', color: theme.colors.info }
      case 'skipped':
        return { icon: '−', color: theme.colors.dim }
    }
  }

  const getStatusText = (result: TransactionPullResult) => {
    const hash = result.safeTxHash.slice(0, 10) + '...'
    switch (result.status) {
      case 'imported':
        return `Imported ${hash} (${result.signatureCount} signatures)`
      case 'updated':
        return `Updated ${hash} (+${result.signatureCount} signatures)`
      case 'skipped':
        return `Skipped ${hash} (already up to date)`
    }
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Pull Complete" icon={theme.icons.success} />

      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.colors.dim}>Safe: </Text>
        <Text color={theme.colors.primary}>{safeEip3770}</Text>
      </Box>

      {/* Transaction list */}
      {transactions.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Pending transactions:
          </Text>
          <Box flexDirection="column" marginLeft={2} marginTop={1}>
            {transactions.map((result, index) => {
              const statusInfo = getStatusIcon(result.status)
              return (
                <Box key={index}>
                  <Text color={statusInfo.color}>{statusInfo.icon} </Text>
                  <Text color={result.status === 'skipped' ? theme.colors.dim : undefined}>
                    {getStatusText(result)}
                  </Text>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}

      {/* Summary */}
      <Box flexDirection="column">
        <Text bold color={theme.colors.primary}>
          Summary:
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text color={theme.colors.success}>Imported: {imported}</Text>
          <Text color={theme.colors.info}>Updated: {updated}</Text>
          <Text color={theme.colors.dim}>Skipped: {skipped}</Text>
        </Box>
      </Box>
    </Box>
  )
}
