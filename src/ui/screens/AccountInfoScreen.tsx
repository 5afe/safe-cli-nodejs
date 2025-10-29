import React, { useEffect, useState } from 'react'
import { Box, Text } from 'ink'
import { type Address } from 'viem'
import { useSafe, useChain } from '../hooks/index.js'
import { Header, KeyValue, Spinner } from '../components/index.js'
import { theme } from '../theme.js'
import { SafeService } from '../../services/safe-service.js'
import { ABIService } from '../../services/abi-service.js'
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
  modules?: Address[]
  guard?: Address | null
  fallbackHandler?: Address | null
  masterCopy?: Address | null
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
  const { safe, loading: safeLoading } = useSafe(chainId, address)
  const { chain, loading: chainLoading, error: chainError } = useChain(chainId)
  const [liveData, setLiveData] = useState<LiveData | null>(null)
  const [fetchingLive, setFetchingLive] = useState(false)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [contractNames, setContractNames] = useState<Record<Address, string>>({})

  // Fetch live on-chain data
  useEffect(() => {
    if (!chain) {
      if (!chainLoading && onExit) {
        onExit()
      }
      return
    }

    // If Safe is in storage and not deployed, skip fetching
    if (safe && !safe.deployed) {
      if (!safeLoading && !chainLoading && onExit) {
        onExit()
      }
      return
    }

    setFetchingLive(true)

    const safeService = new SafeService(chain)
    safeService
      .getSafeInfo(address)
      .then(async (info) => {
        setLiveData({
          version: info.version,
          nonce: info.nonce,
          balance: info.balance,
          owners: info.owners,
          threshold: info.threshold,
          modules: info.modules,
          guard: info.guard,
          fallbackHandler: info.fallbackHandler,
          masterCopy: info.masterCopy,
        })
        setFetchingLive(false)

        // Fetch contract names for advanced configuration
        const addressesToFetch: Address[] = []
        if (info.masterCopy) addressesToFetch.push(info.masterCopy)
        if (info.modules) addressesToFetch.push(...info.modules)
        if (info.guard) addressesToFetch.push(info.guard)
        if (info.fallbackHandler) addressesToFetch.push(info.fallbackHandler)

        if (addressesToFetch.length > 0) {
          // Get Etherscan API key from config
          const configStore = getConfigStore()
          const preferences = configStore.getPreferences()
          const etherscanApiKey = preferences?.etherscanApiKey
          const abiService = new ABIService(chain, etherscanApiKey)

          // Fetch contract info for each address (with timeout)
          const names: Record<Address, string> = {}
          try {
            await Promise.race([
              Promise.all(
                addressesToFetch.map(async (addr) => {
                  try {
                    const contractInfo = await abiService.fetchContractInfo(addr)
                    if (contractInfo.name) {
                      names[addr] = contractInfo.name
                    }
                  } catch {
                    // Ignore errors - contract might not be verified
                  }
                })
              ),
              // Timeout after 3 seconds for contract name fetching
              new Promise((resolve) => setTimeout(resolve, 3000)),
            ])
            setContractNames(names)
          } catch {
            // Ignore errors
          }
        }

        // Call onExit after all data is fetched
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
  if (chainError || !chain) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={theme.colors.error}>Error: {chainError || 'Chain not found'}</Text>
      </Box>
    )
  }

  // Note: safe can be null if the Safe is not in storage (ad-hoc query)
  // This is fine - we'll fetch live data directly from the blockchain

  const configStore = getConfigStore()
  const chains = configStore.getAllChains()
  const eip3770 = formatSafeAddress(address, chainId, chains)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Safe Information" />

      {/* Safe name (if available) */}
      {safe?.name && (
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            {safe.name}
          </Text>
        </Box>
      )}

      {/* Basic information */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Address', value: eip3770, valueColor: theme.colors.primary },
            { key: 'Chain', value: `${chain.name} (${chain.chainId})` },
            ...(safe
              ? [
                  {
                    key: 'Status',
                    value: safe.deployed ? 'Deployed' : 'Not deployed',
                    valueColor: safe.deployed ? theme.colors.success : theme.colors.warning,
                  },
                ]
              : liveData
                ? [{ key: 'Status', value: 'Deployed', valueColor: theme.colors.success }]
                : []),
          ]}
        />
      </Box>

      {/* Loading on-chain data */}
      {fetchingLive && <Spinner message="Loading on-chain data..." />}

      {/* Live on-chain data for deployed Safes */}
      {liveData && !fetchingLive && (
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

          {/* Advanced Safe Information */}
          {(liveData.masterCopy ||
            liveData.modules ||
            liveData.guard ||
            liveData.fallbackHandler) && (
            <Box flexDirection="column" marginBottom={1}>
              <Box marginBottom={1}>
                <Text bold color={theme.colors.primary}>
                  Advanced Configuration:
                </Text>
              </Box>

              {/* Master Copy / Implementation */}
              {liveData.masterCopy && (
                <Box flexDirection="column" marginBottom={1} marginLeft={2}>
                  <Text color={theme.colors.dim}>Master Copy (Implementation):</Text>
                  <Box marginLeft={2} flexDirection="column">
                    <Text>{liveData.masterCopy}</Text>
                    {contractNames[liveData.masterCopy] && (
                      <Text color={theme.colors.success}>
                        → {contractNames[liveData.masterCopy]}
                      </Text>
                    )}
                    {chain.explorer && (
                      <Text color={theme.colors.dim}>
                        {chain.explorer}/address/{liveData.masterCopy}
                      </Text>
                    )}
                  </Box>
                </Box>
              )}

              {/* Modules */}
              {liveData.modules && liveData.modules.length > 0 && (
                <Box flexDirection="column" marginBottom={1} marginLeft={2}>
                  <Text color={theme.colors.dim}>Enabled Modules ({liveData.modules.length}):</Text>
                  <Box flexDirection="column" marginLeft={2}>
                    {liveData.modules.map((module, i) => (
                      <Box key={module} flexDirection="column" marginBottom={1}>
                        <Box>
                          <Text color={theme.colors.dim}>{i + 1}. </Text>
                          <Text>{module}</Text>
                        </Box>
                        {contractNames[module] && (
                          <Box marginLeft={3}>
                            <Text color={theme.colors.success}>→ {contractNames[module]}</Text>
                          </Box>
                        )}
                        {chain.explorer && (
                          <Box marginLeft={3}>
                            <Text color={theme.colors.dim}>
                              {chain.explorer}/address/{module}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Guard */}
              {liveData.guard && (
                <Box flexDirection="column" marginBottom={1} marginLeft={2}>
                  <Text color={theme.colors.dim}>Transaction Guard:</Text>
                  <Box marginLeft={2} flexDirection="column">
                    <Text>{liveData.guard}</Text>
                    {contractNames[liveData.guard] && (
                      <Text color={theme.colors.success}>→ {contractNames[liveData.guard]}</Text>
                    )}
                    {chain.explorer && (
                      <Text color={theme.colors.dim}>
                        {chain.explorer}/address/{liveData.guard}
                      </Text>
                    )}
                  </Box>
                </Box>
              )}

              {/* Fallback Handler */}
              {liveData.fallbackHandler && (
                <Box flexDirection="column" marginBottom={1} marginLeft={2}>
                  <Text color={theme.colors.dim}>Fallback Handler:</Text>
                  <Box marginLeft={2} flexDirection="column">
                    <Text>{liveData.fallbackHandler}</Text>
                    {contractNames[liveData.fallbackHandler] && (
                      <Text color={theme.colors.success}>
                        → {contractNames[liveData.fallbackHandler]}
                      </Text>
                    )}
                    {chain.explorer && (
                      <Text color={theme.colors.dim}>
                        {chain.explorer}/address/{liveData.fallbackHandler}
                      </Text>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </>
      )}

      {/* Live data fetch error */}
      {liveError && !fetchingLive && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.warning}>⚠ Could not fetch on-chain data</Text>
          <Text color={theme.colors.dim}>{liveError}</Text>
        </Box>
      )}

      {/* Predicted configuration for undeployed Safes */}
      {safe && !safe.deployed && safe.predictedConfig && (
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
            Explorer: {chain.explorer}/address/{address}
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
