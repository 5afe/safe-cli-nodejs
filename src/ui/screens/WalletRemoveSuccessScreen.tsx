import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header } from '../components/index.js'
import { theme } from '../theme.js'

export interface WalletRemoveSuccessScreenProps {
  /**
   * Name of the removed wallet
   */
  walletName: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * WalletRemoveSuccessScreen displays success message after removing a wallet.
 * This replaces the console.log implementation in commands/wallet/remove.ts
 *
 * Features:
 * - Shows confirmation of wallet removal
 * - Clean, consistent styling
 */
export function WalletRemoveSuccessScreen({
  walletName,
  onExit,
}: WalletRemoveSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Wallet Removed Successfully" icon={theme.icons.success} />

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>
          Wallet "{walletName}" has been removed
        </Text>
      </Box>
    </Box>
  )
}
