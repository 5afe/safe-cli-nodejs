import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { getConfigStore } from '../../storage/config-store.js'

export interface AccountCreateSuccessScreenProps {
  /**
   * Name of the created Safe
   */
  name: string

  /**
   * Predicted address of the Safe
   */
  address: Address

  /**
   * Chain ID where the Safe will be deployed
   */
  chainId: string

  /**
   * Chain name
   */
  chainName: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * AccountCreateSuccessScreen displays the success message after creating a Safe.
 * This replaces part of the console.log implementation in commands/account/create.ts
 *
 * Features:
 * - Shows success message with Safe details
 * - Displays name, address (EIP-3770), chain, and status
 * - Shows informative message about deployment
 * - Provides next steps with command examples
 */
export function AccountCreateSuccessScreen({
  name,
  address,
  chainId,
  chainName,
  onExit,
}: AccountCreateSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const configStore = getConfigStore()
  const chains = configStore.getAllChains()
  const eip3770 = formatSafeAddress(address, chainId, chains)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Safe Created Successfully!" icon={theme.icons.success} />

      {/* Safe details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Name', value: name, valueColor: theme.colors.primary },
            { key: 'Address', value: eip3770, valueColor: theme.colors.primary },
            { key: 'Chain', value: chainName },
            {
              key: 'Status',
              value: 'Not deployed',
              valueColor: theme.colors.warning,
            },
          ]}
        />
      </Box>

      {/* Info message */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.colors.dim}>
          This Safe has been predicted but not yet deployed to the blockchain.
        </Text>
      </Box>

      {/* Next steps */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Next steps:
          </Text>
        </Box>

        {/* Deploy command */}
        <Box flexDirection="column" marginBottom={1}>
          <Box marginLeft={2}>
            <Text>Deploy the Safe:</Text>
          </Box>
          <Box marginLeft={4}>
            <Text color={theme.colors.primary}>safe account deploy {eip3770}</Text>
          </Box>
        </Box>

        {/* View info command */}
        <Box flexDirection="column">
          <Box marginLeft={2}>
            <Text>View Safe info:</Text>
          </Box>
          <Box marginLeft={4}>
            <Text color={theme.colors.primary}>safe account info {eip3770}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
