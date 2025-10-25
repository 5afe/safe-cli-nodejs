import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'

export interface WalletUseSuccessScreenProps {
  /**
   * Wallet name
   */
  name: string

  /**
   * Wallet address
   */
  address: Address

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * WalletUseSuccessScreen displays success message after switching active wallet.
 * This replaces the console.log implementation in commands/wallet/use.ts
 *
 * Features:
 * - Shows active wallet name and address
 * - Clean, consistent styling
 */
export function WalletUseSuccessScreen({
  name,
  address,
  onExit,
}: WalletUseSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Active Wallet Changed" icon={theme.icons.success} />

      {/* Wallet details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Name', value: name },
            { key: 'Address', value: address },
          ]}
        />
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Now using wallet: {name}</Text>
      </Box>
    </Box>
  )
}
