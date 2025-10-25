import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'

export interface TransactionSignSuccessScreenProps {
  /**
   * Safe transaction hash
   */
  safeTxHash: string

  /**
   * Current number of signatures
   */
  currentSignatures: number

  /**
   * Required threshold
   */
  requiredSignatures: number

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionSignSuccessScreen displays success message after signing a transaction.
 * This replaces the console.log implementation in commands/tx/sign.ts
 *
 * Features:
 * - Shows signature count progress
 * - Displays execution command when ready
 * - Clean, consistent styling
 */
export function TransactionSignSuccessScreen({
  safeTxHash,
  currentSignatures,
  requiredSignatures,
  onExit,
}: TransactionSignSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const isReady = currentSignatures >= requiredSignatures
  const remainingSignatures = requiredSignatures - currentSignatures

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header
        title={`Signature Added (${currentSignatures}/${requiredSignatures} required)`}
        icon={theme.icons.success}
      />

      {isReady ? (
        // Transaction is ready to execute
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text bold color={theme.colors.success}>
              Transaction is ready to execute!
            </Text>
          </Box>

          <Box marginBottom={1}>
            <Text bold>To execute this transaction, run:</Text>
          </Box>

          <Box marginLeft={2}>
            <Text color={theme.colors.primary}>safe tx execute {safeTxHash}</Text>
          </Box>
        </Box>
      ) : (
        // Need more signatures
        <Box flexDirection="column" marginBottom={1}>
          <KeyValue
            items={[
              {
                key: 'Signatures Collected',
                value: `${currentSignatures}/${requiredSignatures}`,
                valueColor: theme.colors.primary,
              },
              {
                key: 'Still Needed',
                value: `${remainingSignatures} more`,
                valueColor: theme.colors.warning,
              },
            ]}
          />
        </Box>
      )}
    </Box>
  )
}
