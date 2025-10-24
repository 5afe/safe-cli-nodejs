import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { getConfigStore } from '../../storage/config-store.js'

export interface ThresholdChangeSuccessScreenProps {
  /**
   * Safe transaction hash
   */
  safeTxHash: string

  /**
   * Safe address
   */
  safeAddress: Address

  /**
   * Chain ID
   */
  chainId: string

  /**
   * Previous threshold value
   */
  oldThreshold: number

  /**
   * New threshold value
   */
  newThreshold: number

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * ThresholdChangeSuccessScreen displays success message after creating a threshold change transaction.
 * This replaces the console.log implementation in commands/account/change-threshold.ts
 *
 * Features:
 * - Shows transaction hash and Safe details
 * - Displays old and new threshold values
 * - Shows next steps for signing and executing
 * - Clean, consistent styling
 */
export function ThresholdChangeSuccessScreen({
  safeTxHash,
  safeAddress,
  chainId,
  oldThreshold,
  newThreshold,
  onExit,
}: ThresholdChangeSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const configStore = getConfigStore()
  const chains = configStore.getAllChains()
  const eip3770 = formatSafeAddress(safeAddress, chainId, chains)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Change Threshold Transaction Created" icon={theme.icons.success} />

      {/* Transaction details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Safe TX Hash', value: safeTxHash, valueColor: theme.colors.primary },
            { key: 'Safe', value: eip3770 },
            { key: 'Old Threshold', value: oldThreshold.toString() },
            { key: 'New Threshold', value: newThreshold.toString(), valueColor: theme.colors.success },
          ]}
        />
      </Box>

      {/* Next steps */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Next steps:
          </Text>
        </Box>

        {/* Step 1: Sign */}
        <Box flexDirection="column" marginBottom={1}>
          <Box marginLeft={2}>
            <Text>
              1. Get {oldThreshold} signature(s):
            </Text>
          </Box>
          <Box marginLeft={5}>
            <Text color={theme.colors.primary}>safe tx sign {safeTxHash}</Text>
          </Box>
        </Box>

        {/* Step 2: Execute */}
        <Box flexDirection="column">
          <Box marginLeft={2}>
            <Text>2. Execute the transaction:</Text>
          </Box>
          <Box marginLeft={5}>
            <Text color={theme.colors.primary}>safe tx execute {safeTxHash}</Text>
          </Box>
        </Box>
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Threshold change transaction ready</Text>
      </Box>
    </Box>
  )
}
