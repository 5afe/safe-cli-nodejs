import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { logError } from '../../ui/messages.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'

export async function useSafe(account?: string) {
  p.intro(pc.bgCyan(pc.black(' Set Active Account ')))

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const chains = configStore.getAllChains()

  // Get Safe to set as active
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
      message: 'Select account to use:',
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

  try {
    safeStorage.setActiveSafe(chainId, address)

    const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)
    const chain = configStore.getChain(safe.chainId)

    console.log('')
    console.log(pc.green('✓ Active account set'))
    console.log('')
    console.log(`  ${pc.dim('Name:')}    ${pc.bold(safe.name)}`)
    console.log(`  ${pc.dim('Address:')} ${pc.cyan(eip3770)}`)
    console.log(`  ${pc.dim('Chain:')}   ${chain?.name || safe.chainId}`)
    console.log('')

    p.outro(pc.dim('You can now use commands without specifying an account'))
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
