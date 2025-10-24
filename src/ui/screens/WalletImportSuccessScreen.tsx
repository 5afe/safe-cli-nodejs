import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'
import { shortenAddress } from '../../utils/ethereum.js'

export interface WalletImportSuccessScreenProps {
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
 * WalletImportSuccessScreen displays success message after importing a wallet.
 * This replaces the console.log implementation in commands/wallet/import.ts
 *
 * Features:
 * - Shows wallet name and address
 * - Displays shortened address for convenience
 * - Clean, consistent styling
 */
export function WalletImportSuccessScreen({
  name,
  address,
  onExit,
}: WalletImportSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Wallet Imported Successfully!" icon={theme.icons.success} />

      {/* Wallet details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Name', value: name },
            { key: 'Address', value: address },
            { key: 'Short', value: shortenAddress(address) },
          ]}
        />
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Wallet is now ready to use</Text>
      </Box>
    </Box>
  )
}
