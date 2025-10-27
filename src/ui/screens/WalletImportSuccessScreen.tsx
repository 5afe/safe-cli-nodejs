import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'
import { shortenAddress } from '../../utils/ethereum.js'
import { getBalance, formatBalance } from '../../utils/balance.js'
import type { ChainConfig } from '../../types/config.js'

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
   * Chain to check balance on
   */
  chain: ChainConfig

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
 * - Fetches and displays balance
 * - Clean, consistent styling
 */
export function WalletImportSuccessScreen({
  name,
  address,
  chain,
  onExit,
}: WalletImportSuccessScreenProps): React.ReactElement {
  const [balance, setBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch balance on mount
  useEffect(() => {
    getBalance(address, chain)
      .then((bal) => {
        setBalance(bal)
        setLoading(false)
      })
      .catch(() => {
        setBalance(null)
        setLoading(false)
      })
  }, [address, chain])

  // Auto-exit after balance is loaded
  useEffect(() => {
    if (!loading && onExit) {
      onExit()
    }
  }, [loading, onExit])

  const items = [
    { key: 'Name', value: name },
    { key: 'Address', value: address },
    { key: 'Short', value: shortenAddress(address) },
  ]

  // Add balance if loaded
  if (!loading && balance !== null) {
    items.push({
      key: 'Balance',
      value: formatBalance(balance, chain.currency),
    })
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Wallet Imported Successfully!" icon={theme.icons.success} />

      {/* Wallet details */}
      <Box flexDirection="column" marginBottom={1}>
        {loading ? (
          <Box>
            <Text color={theme.colors.dim}>Fetching balance...</Text>
          </Box>
        ) : (
          <KeyValue items={items} />
        )}
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Wallet is now ready to use</Text>
      </Box>
    </Box>
  )
}
