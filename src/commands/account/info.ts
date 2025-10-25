import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { logError } from '../../ui/messages.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { AccountInfoScreen } from '../../ui/screens/index.js'

/**
 * Displays detailed information about a Safe account.
 *
 * Migration: Phase 4 - Tier 2 command
 * - Old: 131 lines of imperative console.log with complex state management
 * - New: Declarative Ink rendering
 *
 * Benefits:
 * - Reactive loading states with animated spinner
 * - Clean separation: selection (prompts) → display (Ink)
 * - Reusable AccountInfoScreen component
 * - Live on-chain data fetching with error handling
 * - Consistent styling and formatting
 * - Much cleaner code (~131 → ~60 lines = 54% reduction)
 */
export async function showSafeInfo(account?: string) {
  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const chains = configStore.getAllChains()

  // Get Safe
  let chainId: string
  let address: Address

  if (account) {
    // Parse EIP-3770 address
    try {
      const parsed = parseSafeAddress(account, chains)
      chainId = parsed.chainId
      address = parsed.address
    } catch (error) {
      logError(error instanceof Error ? error.message : 'Invalid account')
      p.cancel('Operation cancelled')
      return
    }
  } else {
    // Show interactive selection
    const safes = safeStorage.getAllSafes()
    if (safes.length === 0) {
      logError('No Safes found')
      p.cancel('Use "safe account create" or "safe account open" to add a Safe')
      return
    }

    const selected = await p.select({
      message: 'Select Safe:',
      options: safes.map((s) => {
        const chain = configStore.getChain(s.chainId)
        const eip3770 = formatSafeAddress(s.address as Address, s.chainId, chains)
        return {
          value: `${s.chainId}:${s.address}`,
          label: `${s.name} (${eip3770})`,
          hint: chain?.name || s.chainId,
        }
      }),
    })

    if (p.isCancel(selected)) {
      p.cancel('Operation cancelled')
      return
    }

    const [selectedChainId, selectedAddress] = (selected as string).split(':')
    chainId = selectedChainId
    address = selectedAddress as Address
  }

  const safe = safeStorage.getSafe(chainId, address)
  if (!safe) {
    logError(`Safe not found: ${address} on chain ${chainId}`)
    p.cancel('Operation cancelled')
    return
  }

  // Render the AccountInfoScreen with the selected Safe
  await renderScreen(AccountInfoScreen, { chainId, address })
}
