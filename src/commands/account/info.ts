import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { AccountInfoScreen } from '../../ui/screens/index.js'
import { SafeService } from '../../services/safe-service.js'
import { isNonInteractiveMode, outputSuccess, outputError } from '../../utils/command-helpers.js'
import { ExitCode } from '../../constants/exit-codes.js'

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
      outputError(error instanceof Error ? error.message : 'Invalid account', ExitCode.INVALID_ARGS)
    }
  } else {
    // Show interactive selection
    const safes = safeStorage.getAllSafes()
    if (safes.length === 0) {
      outputError(
        'No Safes found. Use "safe account create" or "safe account open" to add a Safe',
        ExitCode.SAFE_NOT_FOUND
      )
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

  // Verify chain exists
  const chain = configStore.getChain(chainId)
  if (!chain) {
    outputError(`Chain not found: ${chainId}`, ExitCode.CONFIG_ERROR)
  }

  // In JSON mode, fetch data and output directly
  if (isNonInteractiveMode()) {
    const safe = safeStorage.getSafe(chainId, address)
    const safeService = new SafeService(chain)

    try {
      const safeInfo = await safeService.getSafeInfo(address)
      const eip3770 = formatSafeAddress(address, chainId, chains)

      outputSuccess('Safe information retrieved', {
        name: safe?.name,
        address,
        eip3770,
        chainId,
        chainName: chain.name,
        deployed: safeInfo.isDeployed,
        version: safeInfo.version,
        nonce: safeInfo.nonce.toString(),
        balance: safeInfo.balance?.toString(),
        owners: safeInfo.owners,
        threshold: safeInfo.threshold,
        modules: safeInfo.modules,
        guard: safeInfo.guard,
        fallbackHandler: safeInfo.fallbackHandler,
        masterCopy: safeInfo.masterCopy,
      })
    } catch (error) {
      outputError(
        error instanceof Error ? error.message : 'Failed to fetch Safe info',
        ExitCode.NETWORK_ERROR
      )
    }
  } else {
    // Render the AccountInfoScreen with the Safe address
    // Note: Safe doesn't need to be in storage - we can query any Safe on-chain
    await renderScreen(AccountInfoScreen, { chainId, address })
  }
}
