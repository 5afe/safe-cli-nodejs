import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { useWallets } from '../hooks/index.js'
import { Header, List, Spinner, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'
import { shortenAddress } from '../../utils/ethereum.js'

export interface WalletListScreenProps {
  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * WalletListScreen displays all imported wallets with their details.
 * This replaces the imperative console.log implementation in commands/wallet/list.ts
 *
 * Features:
 * - Shows all wallets with active state indicators
 * - Displays full address and shortened address
 * - Shows last used timestamp
 * - Empty state for no wallets
 */
export function WalletListScreen({ onExit }: WalletListScreenProps): React.ReactElement {
  const { wallets, activeWallet, loading, error } = useWallets()

  // Auto-exit after rendering
  useEffect(() => {
    if (!loading && onExit) {
      onExit()
    }
  }, [loading, onExit])

  // Loading state
  if (loading) {
    return <Spinner message="Loading wallets..." />
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={theme.colors.error}>Error: {error}</Text>
      </Box>
    )
  }

  // Empty state
  if (wallets.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header title="Wallets" />
        <Box marginBottom={1}>
          <Text color={theme.colors.dim}>No wallets found</Text>
        </Box>
        <Box>
          <Text color={theme.colors.info}>
            Use "safe wallet import" to import a wallet
          </Text>
        </Box>
      </Box>
    )
  }

  // Wallet list
  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Wallets" />

      <Box marginBottom={1}>
        <List
          items={wallets}
          activeId={activeWallet?.id}
          getId={(wallet) => wallet.id}
          renderItem={(wallet, _index, isActive) => {
            const items = [
              { key: 'Address', value: wallet.address },
              { key: 'Short', value: shortenAddress(wallet.address) },
            ]

            if (wallet.lastUsed) {
              items.push({
                key: 'Last used',
                value: new Date(wallet.lastUsed).toLocaleString(),
              })
            }

            return (
              <Box flexDirection="column">
                <Text
                  bold={isActive}
                  color={isActive ? theme.colors.success : undefined}
                >
                  {wallet.name}
                </Text>
                <Box marginLeft={2}>
                  <KeyValue items={items} />
                </Box>
              </Box>
            )
          }}
        />
      </Box>

      {/* Footer */}
      <Box flexDirection="column">
        {activeWallet && (
          <Box marginBottom={1}>
            <Text color={theme.colors.dim}>
              Active wallet: {activeWallet.name}
            </Text>
          </Box>
        )}
        <Box>
          <Text color={theme.colors.success}>
            Total: {wallets.length} wallet(s)
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
