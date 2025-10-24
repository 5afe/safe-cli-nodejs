import { useState, useEffect } from 'react'
import { getWalletStorage } from '../../storage/wallet-store.js'
import type { Wallet } from '../../types/wallet.js'

/**
 * Hook for accessing wallet data in Ink components.
 * Provides wallet list and active wallet state.
 *
 * @example
 * ```tsx
 * function WalletListScreen() {
 *   const { wallets, activeWallet, loading, error } = useWallets()
 *
 *   if (loading) return <Spinner message="Loading wallets..." />
 *   if (error) return <Text color="red">{error}</Text>
 *
 *   return <List items={wallets} activeId={activeWallet?.id} />
 * }
 * ```
 */
export function useWallets() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [activeWallet, setActiveWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const walletStorage = getWalletStorage()
      const allWallets = walletStorage.getAllWallets()
      const active = walletStorage.getActiveWallet()

      setWallets(allWallets)
      setActiveWallet(active)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets')
      setLoading(false)
    }
  }, [])

  return { wallets, activeWallet, loading, error }
}

/**
 * Hook for accessing a specific wallet by ID.
 *
 * @param walletId - The ID of the wallet to fetch
 *
 * @example
 * ```tsx
 * function WalletDetails({ walletId }) {
 *   const { wallet, loading, error } = useWallet(walletId)
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Text color="red">{error}</Text>
 *   if (!wallet) return <Text>Wallet not found</Text>
 *
 *   return <KeyValue items={[{ key: 'Name', value: wallet.name }]} />
 * }
 * ```
 */
export function useWallet(walletId: string) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const walletStorage = getWalletStorage()
      const foundWallet = walletStorage.getWallet(walletId)

      setWallet(foundWallet || null)
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet')
      setLoading(false)
    }
  }, [walletId])

  return { wallet, loading, error }
}
