import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { type Address } from 'viem'
import { useSafe, useChain } from '../hooks/index.js'
import { Header, KeyValue, Spinner } from '../components/index.js'
import { theme } from '../theme.js'
import { SafeService } from '../../services/safe-service.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { getConfigStore } from '../../storage/config-store.js'

export interface AccountInfoScreenProps {
  /**
   * Chain ID of the Safe
   */
  chainId: string

  /**
   * Address of the Safe
   */
  address: Address

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

interface LiveData {
  version: string
  nonce: bigint
  balance?: bigint
  owners: Address[]
  threshold: number
}

/**
 * AccountInfoScreen displays detailed information about a Safe account.
 * This replaces the imperative console.log implementation in commands/account/info.ts
 *
 * Features:
 * - Shows basic Safe information (name, address, chain, status)
 * - Fetches and displays live on-chain data for deployed Safes
 * - Shows predicted configuration for undeployed Safes
 * - Displays explorer link
 * - Animated loading states
 */
export function AccountInfoScreen({
  chainId,
  address,
  onExit,
}: AccountInfoScreenProps): React.ReactElement {
  const { safe, loading: safeLoading, error: safeError } = useSafe(chainId, address)
  const { chain, loading: chainLoading, error: chainError } = useChain(chainId)
  const [liveData, setLiveData] = useState<LiveData | null>(null)
  const [fetchingLive, setFetchingLive] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)

  // Fetch live on-chain data for deployed Safes
  useEffect(() => {
    if (!safe || !chain || !safe.deployed) {
      if (!safeLoading && !chainLoading && onExit) {
        onExit()
      }
      return
    }

    setFetchingLive(true)

    const safeService = new SafeService(chain)
    safeService
      .getSafeInfo(address)
      .then((info) => {
        setLiveData({
          version: info.version,
          nonce: info.nonce,
          balance: info.balance,
          owners: info.owners,
          threshold: info.threshold,
        })
        setFetchingLive(false)
        if (onExit) onExit()
      })
      .catch((error) => {
        setLiveError(error instanceof Error ? error.message : 'Failed to fetch on-chain data')
        setFetchingLive(false)
        if (onExit) onExit()
      })
  }, [safe, chain, safeLoading, chainLoading, address, onExit])

  // Loading state
  if (safeLoading || chainLoading) {
    return <Spinner message="Loading Safe information..." />
  }

  // Error state
  if (safeError || chainError || !safe || !chain) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={theme.colors.error}>
          Error: {safeError || chainError || 'Safe or chain not found'}
        </Text>
      </Box>
    )
  }

  const configStore = getConfigStore()
  const chains = configStore.getAllChains()
  const eip3770 = formatSafeAddress(address, chainId, chains)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Safe Information" />

      {/* Safe name */}
      <Box marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          {safe.name}
        </Text>
      </Box>

      {/* Basic information */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Address', value: eip3770, valueColor: theme.colors.primary },
            { key: 'Chain', value: `${chain.name} (${chain.chainId})` },
            {
              key: 'Status',
              value: safe.deployed ? 'Deployed' : 'Not deployed',
              valueColor: safe.deployed ? theme.colors.success : theme.colors.warning,
            },
          ]}
        />
      </Box>

      {/* Loading on-chain data */}
      {fetchingLive && <Spinner message="Loading on-chain data..." />}

      {/* Live on-chain data for deployed Safes */}
      {safe.deployed && liveData && !fetchingLive && (
        <>
          <Box flexDirection="column" marginBottom={1}>
            <KeyValue
              title="On-chain Data"
              items={[
                { key: 'Version', value: liveData.version },
                { key: 'Nonce', value: liveData.nonce.toString() },
                ...(liveData.balance !== undefined
                  ? [
                      {
                        key: 'Balance',
                        value: `${(Number(liveData.balance) / 1e18).toFixed(4)} ${chain.currency}`,
                      },
                    ]
                  : []),
              ]}
            />
          </Box>

          <Box flexDirection="column" marginBottom={1}>
            <Box marginBottom={1}>
              <Text bold color={theme.colors.primary}>
                Owners:
              </Text>
            </Box>
            <Box flexDirection="column" marginLeft={2}>
              {liveData.owners.map((owner, i) => (
                <Box key={owner}>
                  <Text color={theme.colors.dim}>{i + 1}. </Text>
                  <Text>{owner}</Text>
                </Box>
              ))}
            </Box>
            <Box marginTop={1} marginLeft={2}>
              <Text color={theme.colors.dim}>Threshold: </Text>
              <Text>
                {liveData.threshold} / {liveData.owners.length}
              </Text>
            </Box>
          </Box>
        </>
      )}

      {/* Live data fetch error */}
      {safe.deployed && liveError && !fetchingLive && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.warning}>⚠ Could not fetch on-chain data</Text>
          <Text color={theme.colors.dim}>{liveError}</Text>
        </Box>
      )}

      {/* Predicted configuration for undeployed Safes */}
      {!safe.deployed && safe.predictedConfig && (
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text bold color={theme.colors.primary}>
              Predicted Configuration:
            </Text>
          </Box>
          <Box flexDirection="column" marginLeft={2}>
            {safe.predictedConfig.owners.map((owner, i) => (
              <Box key={owner}>
                <Text color={theme.colors.dim}>{i + 1}. </Text>
                <Text>{owner}</Text>
              </Box>
            ))}
          </Box>
          <Box marginTop={1} marginLeft={2}>
            <Text color={theme.colors.dim}>Threshold: </Text>
            <Text>
              {safe.predictedConfig.threshold} / {safe.predictedConfig.owners.length}
            </Text>
          </Box>
        </Box>
      )}

      {/* Explorer link */}
      {chain.explorer && (
        <Box marginBottom={1}>
          <Text color={theme.colors.dim}>
            Explorer: {chain.explorer}/address/{safe.address}
          </Text>
        </Box>
      )}

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Safe information displayed successfully</Text>
      </Box>
    </Box>
  )
}
