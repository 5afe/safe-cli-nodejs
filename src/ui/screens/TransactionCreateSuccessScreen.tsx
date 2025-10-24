import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'

export interface TransactionCreateSuccessScreenProps {
  /**
   * Safe transaction hash
   */
  safeTxHash: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionCreateSuccessScreen displays success message after creating a transaction.
 * This replaces the console.log implementation in commands/tx/create.ts
 *
 * Features:
 * - Shows transaction hash
 * - Displays next step for signing
 * - Clean, consistent styling
 */
export function TransactionCreateSuccessScreen({
  safeTxHash,
  onExit,
}: TransactionCreateSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Transaction Created Successfully!" icon={theme.icons.success} />

      {/* Transaction details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[{ key: 'Safe TX Hash', value: safeTxHash, valueColor: theme.colors.primary }]}
        />
      </Box>

      {/* Next step */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            To sign this transaction, run:
          </Text>
        </Box>

        <Box marginLeft={2}>
          <Text color={theme.colors.primary}>safe tx sign {safeTxHash}</Text>
        </Box>
      </Box>
    </Box>
  )
}
