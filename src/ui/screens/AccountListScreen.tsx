import React, { useState, useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { useSafes } from '../hooks/index.js'
import { Header, List, KeyValue, Spinner } from '../components/index.js'
import { theme } from '../theme.js'
import { getConfigStore } from '../../storage/config-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import type { SafeAccount } from '../../types/safe.js'

interface SafeLiveData {
  owners?: Address[]
  threshold?: number
  error?: boolean
}

export interface AccountListScreenProps {
  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * AccountListScreen displays all Safe accounts with live on-chain data.
 * This replaces the imperative console.log implementation in commands/account/list.ts
 *
 * Features:
 * - Shows all Safe accounts with chain info
 * - Displays deployment status
 * - Fetches live owner/threshold data for deployed Safes
 * - Real-time updates as data loads (reactive!)
 * - Empty state for no Safes
 */
export function AccountListScreen({ onExit }: AccountListScreenProps): React.ReactElement {
  const { safes, loading, error } = useSafes()
  const [liveData, setLiveData] = useState<Map<string, SafeLiveData>>(new Map())
  const [fetchingLive, setFetchingLive] = useState(false)

  // Fetch live data for deployed Safes
  useEffect(() => {
    if (loading || !safes.length) return

    const deployedSafes = safes.filter((s) => s.deployed)
    if (deployedSafes.length === 0) return

    setFetchingLive(true)

    // Fetch live data in parallel
    Promise.all(
      deployedSafes.map(async (safe) => {
        const configStore = getConfigStore()
        const chain = configStore.getChain(safe.chainId)

        if (!chain) {
          return { address: safe.address, data: { error: true } }
        }

        try {
          const txService = new TransactionService(chain)
          const [owners, threshold] = await Promise.all([
            txService.getOwners(safe.address as Address),
            txService.getThreshold(safe.address as Address),
          ])

          return {
            address: safe.address,
            data: { owners, threshold },
          }
        } catch {
          return { address: safe.address, data: { error: true } }
        }
      })
    ).then((results) => {
      const newLiveData = new Map<string, SafeLiveData>()
      results.forEach(({ address, data }) => {
        newLiveData.set(address, data)
      })
      setLiveData(newLiveData)
      setFetchingLive(false)

      // Auto-exit after live data is loaded
      if (onExit) {
        onExit()
      }
    })
  }, [loading, safes, onExit])

  // Loading state
  if (loading) {
    return <Spinner message="Loading Safe accounts..." />
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
  if (safes.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header title="Safe Accounts" />
        <Box marginBottom={1}>
          <Text color={theme.colors.dim}>No Safe accounts found</Text>
        </Box>
        <Box>
          <Text color={theme.colors.info}>
            Use "safe account create" or "safe account open" to add a Safe
          </Text>
        </Box>
      </Box>
    )
  }

  const configStore = getConfigStore()
  const chains = configStore.getAllChains()

  // Safe list with live data
  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Safe Accounts" />

      {fetchingLive && (
        <Box marginBottom={1}>
          <Spinner message={`Fetching live data for ${safes.filter((s) => s.deployed).length} deployed Safe(s)...`} />
        </Box>
      )}

      <Box marginBottom={1}>
        <List
          items={safes}
          showMarkers={false}
          renderItem={(safe: SafeAccount) => {
            const chain = configStore.getChain(safe.chainId)
            const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)
            const status = safe.deployed ? 'deployed' : 'not deployed'
            const statusColor = safe.deployed ? theme.colors.success : theme.colors.warning

            // Get owner info
            let ownersValue: string
            if (safe.deployed) {
              const data = liveData.get(safe.address)
              if (fetchingLive && !data) {
                ownersValue = 'Loading...'
              } else if (data?.error) {
                ownersValue = 'Error fetching'
              } else if (data) {
                ownersValue = `${data.threshold} / ${data.owners?.length || 0}`
              } else {
                ownersValue = 'Loading...'
              }
            } else if (safe.predictedConfig) {
              ownersValue = `${safe.predictedConfig.threshold} / ${safe.predictedConfig.owners.length}`
            } else {
              ownersValue = 'Unknown'
            }

            return (
              <Box flexDirection="column">
                <Text bold color={theme.colors.primary}>
                  {safe.name}
                </Text>
                <Box marginLeft={2}>
                  <KeyValue
                    items={[
                      { key: 'Address', value: eip3770, valueColor: theme.colors.primary },
                      { key: 'Chain', value: chain?.name || safe.chainId },
                      { key: 'Owners', value: ownersValue },
                      { key: 'Status', value: status, valueColor: statusColor },
                    ]}
                  />
                </Box>
              </Box>
            )
          }}
        />
      </Box>

      {/* Footer */}
      <Box>
        <Text color={theme.colors.success}>
          Total: {safes.length} Safe(s)
        </Text>
      </Box>
    </Box>
  )
}
