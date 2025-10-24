import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { getConfigStore } from '../../storage/config-store.js'

export interface OwnerAddSuccessScreenProps {
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
   * Required threshold for execution
   */
  threshold: number

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * OwnerAddSuccessScreen displays success message after creating an owner addition transaction.
 * This replaces the console.log implementation in commands/account/add-owner.ts
 *
 * Features:
 * - Shows transaction hash and Safe details
 * - Displays next steps for signing and executing
 * - Clean, consistent styling
 */
export function OwnerAddSuccessScreen({
  safeTxHash,
  safeAddress,
  chainId,
  threshold,
  onExit,
}: OwnerAddSuccessScreenProps): React.ReactElement {
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
      <Header title="Add Owner Transaction Created" icon={theme.icons.success} />

      {/* Transaction details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Safe TX Hash', value: safeTxHash, valueColor: theme.colors.primary },
            { key: 'Safe', value: eip3770 },
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
              1. Get {threshold} signature(s):
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
    </Box>
  )
}
