import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { getConfigStore } from '../../storage/config-store.js'

export interface AccountDeploySuccessScreenProps {
  /**
   * Deployed address of the Safe
   */
  address: Address

  /**
   * Chain ID where the Safe was deployed
   */
  chainId: string

  /**
   * Chain name
   */
  chainName: string

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
 * AccountDeploySuccessScreen displays the success message after deploying a Safe.
 * This replaces the console.log implementation in commands/account/deploy.ts
 *
 * Features:
 * - Shows success message with deployment details
 * - Displays address (EIP-3770), chain, and explorer link
 * - Clean, consistent styling
 */
export function AccountDeploySuccessScreen({
  address,
  chainId,
  chainName,
  explorerUrl,
  onExit,
}: AccountDeploySuccessScreenProps): React.ReactElement {
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
      <Header title="Safe Deployed Successfully!" icon={theme.icons.success} />

      {/* Deployment details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Address', value: eip3770, valueColor: theme.colors.primary },
            { key: 'Chain', value: chainName },
            ...(explorerUrl
              ? [{ key: 'Explorer', value: explorerUrl, valueColor: theme.colors.info }]
              : []),
          ]}
        />
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Safe is now ready to use!</Text>
      </Box>
    </Box>
  )
}
