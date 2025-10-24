import { useState, useEffect } from 'react'
import { getConfigStore } from '../../storage/config-store.js'
import type { Config, ChainConfig, DefaultsConfig, PreferencesConfig } from '../../types/config.js'

/**
 * Hook for accessing the complete configuration in Ink components.
 * Provides access to all chains, defaults, and preferences.
 *
 * @example
 * ```tsx
 * function ConfigScreen() {
 *   const { config, loading, error } = useConfig()
 *
 *   if (loading) return <Spinner message="Loading configuration..." />
 *   if (error) return <Text color="red">{error}</Text>
 *
 *   return (
 *     <Box flexDirection="column">
 *       <Header title="Configuration" />
 *       <KeyValue items={[
 *         { key: 'Version', value: config.version },
 *         { key: 'Chains', value: Object.keys(config.chains).length },
 *       ]} />
 *     </Box>
 *   )
 * }
 * ```
 */
export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const configStore = getConfigStore()
      const fullConfig = configStore.getConfig()

      setConfig(fullConfig)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration')
      setLoading(false)
    }
  }, [])

  return { config, loading, error }
}

/**
 * Hook for accessing all chain configurations.
 * Returns a record of chainId → ChainConfig.
 *
 * @example
 * ```tsx
 * function ChainListScreen() {
 *   const { chains, loading, error } = useChains()
 *
 *   const chainArray = Object.values(chains)
 *
 *   return (
 *     <List
 *       items={chainArray}
 *       renderItem={(chain) => (
 *         <Box>
 *           <Text>{chain.name} ({chain.chainId})</Text>
 *         </Box>
 *       )}
 *     />
 *   )
 * }
 * ```
 */
export function useChains() {
  const [chains, setChains] = useState<Record<string, ChainConfig>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const configStore = getConfigStore()
      const allChains = configStore.getAllChains()

      setChains(allChains)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chains')
      setLoading(false)
    }
  }, [])

  return { chains, loading, error }
}

/**
 * Hook for accessing a specific chain configuration by ID.
 *
 * @param chainId - The chain ID to fetch
 *
 * @example
 * ```tsx
 * function ChainDetails({ chainId }) {
 *   const { chain, loading, error } = useChain(chainId)
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Text color="red">{error}</Text>
 *   if (!chain) return <Text>Chain not found</Text>
 *
 *   return (
 *     <KeyValue
 *       items={[
 *         { key: 'Name', value: chain.name },
 *         { key: 'Chain ID', value: chain.chainId },
 *         { key: 'RPC URL', value: chain.rpcUrl },
 *         { key: 'Currency', value: chain.currency },
 *       ]}
 *     />
 *   )
 * }
 * ```
 */
export function useChain(chainId: string) {
  const [chain, setChain] = useState<ChainConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const configStore = getConfigStore()
      const foundChain = configStore.getChain(chainId)

      setChain(foundChain || null)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chain')
      setLoading(false)
    }
  }, [chainId])

  return { chain, loading, error }
}

/**
 * Hook for accessing default configuration settings.
 * Includes Safe version, signing method, and gas strategy.
 *
 * @example
 * ```tsx
 * function DefaultsScreen() {
 *   const { defaults, loading } = useDefaults()
 *
 *   if (loading) return <Spinner />
 *
 *   return (
 *     <KeyValue
 *       title="Default Settings"
 *       items={[
 *         { key: 'Safe Version', value: defaults.safeVersion },
 *         { key: 'Signing Method', value: defaults.signingMethod },
 *         { key: 'Gas Strategy', value: defaults.gasStrategy },
 *       ]}
 *     />
 *   )
 * }
 * ```
 */
export function useDefaults() {
  const [defaults, setDefaults] = useState<DefaultsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const configStore = getConfigStore()
      const configDefaults = configStore.getDefaults()

      setDefaults(configDefaults)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load defaults')
      setLoading(false)
    }
  }, [])

  return { defaults, loading, error }
}

/**
 * Hook for accessing user preferences.
 * Includes API keys and other optional settings.
 *
 * @example
 * ```tsx
 * function PreferencesScreen() {
 *   const { preferences, loading } = usePreferences()
 *
 *   if (loading) return <Spinner />
 *
 *   return (
 *     <KeyValue
 *       title="Preferences"
 *       items={[
 *         { key: 'Safe API Key', value: preferences.safeApiKey || 'Not set' },
 *         { key: 'Etherscan API Key', value: preferences.etherscanApiKey || 'Not set' },
 *       ]}
 *     />
 *   )
 * }
 * ```
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<PreferencesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const configStore = getConfigStore()
      const userPreferences = configStore.getPreferences()

      setPreferences(userPreferences)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
      setLoading(false)
    }
  }, [])

  return { preferences, loading, error }
}

/**
 * Hook for checking if a chain exists in the configuration.
 * Useful for validation flows without loading full chain data.
 *
 * @param chainId - The chain ID to check
 *
 * @example
 * ```tsx
 * function ChainValidator({ chainId }) {
 *   const { exists, loading } = useChainExists(chainId)
 *
 *   if (loading) return <Spinner />
 *
 *   return (
 *     <Text color={exists ? 'green' : 'red'}>
 *       Chain {chainId} {exists ? 'is configured' : 'not found'}
 *     </Text>
 *   )
 * }
 * ```
 */
export function useChainExists(chainId: string) {
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const configStore = getConfigStore()
      const doesExist = configStore.chainExists(chainId)

      setExists(doesExist)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check chain existence')
      setLoading(false)
    }
  }, [chainId])

  return { exists, loading, error }
}
