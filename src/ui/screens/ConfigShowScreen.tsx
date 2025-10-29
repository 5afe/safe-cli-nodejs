import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { useConfig } from '../hooks/index.js'
import { Header, KeyValue, Spinner } from '../components/index.js'
import { theme } from '../theme.js'
import { getConfigStore } from '../../storage/config-store.js'

export interface ConfigShowScreenProps {
  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * Helper function to obfuscate API keys for display
 */
function obfuscateApiKey(key: string): string {
  if (key.length <= 12) {
    return '*'.repeat(key.length)
  }
  return key.slice(0, 8) + '...' + key.slice(-4)
}

/**
 * ConfigShowScreen displays the current CLI configuration.
 * This replaces the imperative console.log implementation in commands/config/show.ts
 *
 * Features:
 * - Shows all configured chains with details
 * - Displays default settings
 * - Shows API keys (obfuscated)
 * - Shows config file path
 */
export function ConfigShowScreen({ onExit }: ConfigShowScreenProps): React.ReactElement {
  const { config, loading, error } = useConfig()

  // Auto-exit after rendering
  useEffect(() => {
    if (!loading && onExit) {
      onExit()
    }
  }, [loading, onExit])

  // Loading state
  if (loading) {
    return <Spinner message="Loading configuration..." />
  }

  // Error state
  if (error || !config) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color={theme.colors.error}>
          Error: {error || 'Failed to load configuration'}
        </Text>
      </Box>
    )
  }

  const configStore = getConfigStore()
  const chains = Object.values(config.chains)

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Configuration" />

      {/* Chains section */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Chains:
          </Text>
        </Box>

        {chains.length === 0 ? (
          <Box marginLeft={2}>
            <Text color={theme.colors.dim}>No chains configured</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {chains.map((chain) => (
              <Box key={chain.chainId} flexDirection="column" marginBottom={1}>
                <Box marginLeft={2}>
                  <Text color={theme.colors.primary}>
                    {chain.name} <Text color={theme.colors.dim}>({chain.chainId})</Text>
                  </Text>
                </Box>
                <Box marginLeft={4}>
                  <KeyValue
                    items={[
                      { key: 'RPC', value: chain.rpcUrl },
                      ...(chain.explorer
                        ? [{ key: 'Explorer', value: chain.explorer }]
                        : []
                      ),
                      { key: 'Currency', value: chain.currency },
                    ]}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Defaults section */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          title="Defaults"
          items={[
            { key: 'Safe Version', value: config.defaults.safeVersion },
            { key: 'Signing Method', value: config.defaults.signingMethod },
            { key: 'Gas Strategy', value: config.defaults.gasStrategy },
          ]}
        />
      </Box>

      {/* API Configuration section */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          title="API Configuration"
          items={[
            {
              key: 'Safe API Key',
              value: config.preferences.safeApiKey
                ? obfuscateApiKey(config.preferences.safeApiKey)
                : 'not configured',
              valueColor: config.preferences.safeApiKey
                ? undefined
                : theme.colors.dim,
            },
            {
              key: 'Safe API Environment',
              value: config.preferences.isStagingSafeApi
                ? 'staging.5afe.dev'
                : 'safe.global (production)',
              valueColor: config.preferences.isStagingSafeApi
                ? theme.colors.warning
                : undefined,
            },
            {
              key: 'Etherscan API Key',
              value: config.preferences.etherscanApiKey
                ? obfuscateApiKey(config.preferences.etherscanApiKey)
                : 'not configured',
              valueColor: config.preferences.etherscanApiKey
                ? undefined
                : theme.colors.dim,
            },
          ]}
        />
      </Box>

      {/* Config file path */}
      <Box marginBottom={1}>
        <Text color={theme.colors.dim}>
          Config file: {configStore.getConfigPath()}
        </Text>
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>
          Configuration displayed successfully
        </Text>
      </Box>
    </Box>
  )
}
