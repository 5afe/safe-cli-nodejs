import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { useWallets } from '../hooks/index.js'
import { Header, List, Spinner, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'
import { shortenAddress } from '../../utils/ethereum.js'
import { getBalances, formatBalance } from '../../utils/balance.js'
import { getConfigStore } from '../../storage/config-store.js'

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
  const [balances, setBalances] = useState<Map<Address, string>>(new Map())
  const [balancesLoading, setBalancesLoading] = useState(true)

  // Fetch balances for all wallets
  useEffect(() => {
    if (!loading && wallets.length > 0) {
      const configStore = getConfigStore()
      const defaultChain = configStore.getDefaultChain()
      const addresses = wallets.map((w) => w.address as Address)

      getBalances(addresses, defaultChain)
        .then((balanceMap) => {
          setBalances(balanceMap)
          setBalancesLoading(false)
        })
        .catch(() => {
          setBalancesLoading(false)
        })
    } else if (!loading) {
      setBalancesLoading(false)
    }
  }, [wallets, loading])

  // Auto-exit after rendering and balances loaded
  useEffect(() => {
    if (!loading && !balancesLoading && onExit) {
      onExit()
    }
  }, [loading, balancesLoading, onExit])

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
        <Box flexDirection="column">
          <Text color={theme.colors.info}>
            Use "safe wallet import" to import a wallet from private key
          </Text>
          <Text color={theme.colors.info}>
            Use "safe wallet import-ledger" to import a Ledger hardware wallet
          </Text>
        </Box>
      </Box>
    )
  }

  // Wallet list
  const configStore = getConfigStore()
  const defaultChain = configStore.getDefaultChain()

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Wallets" />

      {balancesLoading && !loading ? (
        <Box marginBottom={1}>
          <Text color={theme.colors.dim}>Fetching balances...</Text>
        </Box>
      ) : null}

      <Box marginBottom={1}>
        <List
          items={wallets}
          activeId={activeWallet?.id}
          getId={(wallet) => wallet.id}
          renderItem={(wallet, _index, isActive) => {
            const items = [
              {
                key: 'Type',
                value: wallet.type === 'ledger' ? '🔐 Ledger' : '🔑 Private Key',
              },
              { key: 'Address', value: wallet.address },
              { key: 'Short', value: shortenAddress(wallet.address) },
            ]

            // Add balance if loaded
            if (!balancesLoading) {
              const balance = balances.get(wallet.address as Address)
              if (balance !== undefined) {
                items.push({
                  key: 'Balance',
                  value: formatBalance(balance, defaultChain.currency),
                })
              }
            }

            // Add derivation path for Ledger wallets
            if (wallet.type === 'ledger') {
              items.push({
                key: 'Path',
                value: wallet.derivationPath,
              })
            }

            if (wallet.lastUsed) {
              items.push({
                key: 'Last used',
                value: new Date(wallet.lastUsed).toLocaleString(),
              })
            }

            return (
              <Box flexDirection="column">
                <Text bold={isActive} color={isActive ? theme.colors.success : undefined}>
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
            <Text color={theme.colors.dim}>Active wallet: {activeWallet.name}</Text>
          </Box>
        )}
        <Box>
          <Text color={theme.colors.success}>Total: {wallets.length} wallet(s)</Text>
        </Box>
        {!balancesLoading && (
          <Box marginTop={1}>
            <Text color={theme.colors.dim}>Balances shown on {defaultChain.name}</Text>
          </Box>
        )}
      </Box>
    </Box>
  )
}
