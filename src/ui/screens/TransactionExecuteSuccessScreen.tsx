import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'

export interface TransactionExecuteSuccessScreenProps {
  /**
   * Transaction hash on blockchain
   */
  txHash: string

  /**
   * Optional explorer URL
   */
  explorerUrl?: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionExecuteSuccessScreen displays success message after executing a transaction.
 * This replaces the p.outro implementation in commands/tx/execute.ts
 *
 * Features:
 * - Shows blockchain transaction hash
 * - Displays explorer link if available
 * - Clean, consistent styling
 */
export function TransactionExecuteSuccessScreen({
  txHash,
  explorerUrl,
  onExit,
}: TransactionExecuteSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const items: Array<{ key: string; value: string; valueColor?: string }> = [
    { key: 'Tx Hash', value: txHash, valueColor: theme.colors.primary },
  ]

  if (explorerUrl) {
    items.push({ key: 'Explorer', value: explorerUrl, valueColor: theme.colors.info })
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Transaction Executed Successfully!" icon={theme.icons.success} />

      {/* Transaction details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue items={items} />
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Transaction confirmed on-chain</Text>
      </Box>
    </Box>
  )
}
