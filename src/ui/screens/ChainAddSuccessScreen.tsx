import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'

export interface ChainAddSuccessScreenProps {
  /**
   * Chain name
   */
  chainName: string

  /**
   * Chain ID
   */
  chainId: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * ChainAddSuccessScreen displays success message after adding a chain.
 * This replaces the p.outro implementation in commands/config/chains.ts
 *
 * Features:
 * - Shows added chain details
 * - Clean, consistent styling
 */
export function ChainAddSuccessScreen({
  chainName,
  chainId,
  onExit,
}: ChainAddSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Chain Added Successfully!" icon={theme.icons.success} />

      {/* Chain details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Name', value: chainName },
            { key: 'Chain ID', value: chainId },
          ]}
        />
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Chain configuration saved</Text>
      </Box>
    </Box>
  )
}
