import { useState, useEffect } from 'react'
import { getSafeStorage } from '../../storage/safe-store.js'
import type { SafeAccount } from '../../types/safe.js'

/**
 * Hook for accessing all Safe accounts in Ink components.
 * Provides the complete list of Safes across all chains.
 *
 * @example
 * ```tsx
 * function SafeListScreen() {
 *   const { safes, loading, error } = useSafes()
 *
 *   if (loading) return <Spinner message="Loading Safes..." />
 *   if (error) return <Text color="red">{error}</Text>
 *
 *   return <List items={safes} renderItem={(safe) => <SafeItem safe={safe} />} />
 * }
 * ```
 */
export function useSafes() {
  const [safes, setSafes] = useState<SafeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const safeStorage = getSafeStorage()
      const allSafes = safeStorage.getAllSafes()

      setSafes(allSafes)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Safes')
      setLoading(false)
    }
  }, [])

  return { safes, loading, error }
}

/**
 * Hook for accessing a specific Safe account by chainId and address.
 *
 * @param chainId - The chain ID where the Safe is deployed
 * @param address - The Safe address
 *
 * @example
 * ```tsx
 * function SafeDetails({ chainId, address }) {
 *   const { safe, loading, error } = useSafe(chainId, address)
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Text color="red">{error}</Text>
 *   if (!safe) return <Text>Safe not found</Text>
 *
 *   return (
 *     <KeyValue
 *       items={[
 *         { key: 'Name', value: safe.name },
 *         { key: 'Address', value: safe.address },
 *         { key: 'Deployed', value: safe.deployed ? 'Yes' : 'No' },
 *       ]}
 *     />
 *   )
 * }
 * ```
 */
export function useSafe(chainId: string, address: string) {
  const [safe, setSafe] = useState<SafeAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const safeStorage = getSafeStorage()
      const foundSafe = safeStorage.getSafe(chainId, address)

      setSafe(foundSafe || null)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Safe')
      setLoading(false)
    }
  }, [chainId, address])

  return { safe, loading, error }
}

/**
 * Hook for accessing Safe accounts filtered by chain.
 * Useful for displaying chain-specific Safe lists.
 *
 * @param chainId - The chain ID to filter by
 *
 * @example
 * ```tsx
 * function ChainSafesScreen({ chainId }) {
 *   const { safes, loading, error } = useSafesByChain(chainId)
 *
 *   return (
 *     <Box flexDirection="column">
 *       <Header title={`Safes on Chain ${chainId}`} />
 *       <List items={safes} renderItem={(safe) => <SafeItem safe={safe} />} />
 *     </Box>
 *   )
 * }
 * ```
 */
export function useSafesByChain(chainId: string) {
  const [safes, setSafes] = useState<SafeAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const safeStorage = getSafeStorage()
      const chainSafes = safeStorage.getSafesByChain(chainId)

      setSafes(chainSafes)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Safes')
      setLoading(false)
    }
  }, [chainId])

  return { safes, loading, error }
}

/**
 * Hook for checking if a Safe exists without loading full data.
 * Useful for validation flows.
 *
 * @param chainId - The chain ID where the Safe might exist
 * @param address - The Safe address to check
 *
 * @example
 * ```tsx
 * function SafeValidator({ chainId, address }) {
 *   const { exists, loading } = useSafeExists(chainId, address)
 *
 *   if (loading) return <Spinner />
 *
 *   return (
 *     <Text color={exists ? 'green' : 'red'}>
 *       Safe {exists ? 'exists' : 'does not exist'}
 *     </Text>
 *   )
 * }
 * ```
 */
export function useSafeExists(chainId: string, address: string) {
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const safeStorage = getSafeStorage()
      const doesExist = safeStorage.safeExists(chainId, address)

      setExists(doesExist)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check Safe existence')
      setLoading(false)
    }
  }, [chainId, address])

  return { exists, loading, error }
}
