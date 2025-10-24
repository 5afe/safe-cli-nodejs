import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { SafeCLIError } from '../../utils/errors.js'
import { shortenAddress } from '../../utils/ethereum.js'

export async function useSafe(safeId?: string) {
  p.intro('Switch Active Safe')

  try {
    const safeStorage = getSafeStorage()
    const configStore = getConfigStore()
    const safes = safeStorage.getAllSafes()

    if (safes.length === 0) {
      p.log.error('No Safe accounts found')
      p.outro('Use "safe account create" or "safe account open" to add a Safe')
      return
    }

    let selectedId = safeId

    // If no ID provided, show interactive selection
    if (!selectedId) {
      const activeSafe = safeStorage.getActiveSafe()

      selectedId = (await p.select({
        message: 'Select Safe to use',
        options: safes.map((safe) => {
          const chain = configStore.getChain(safe.chainId)
          const isActive = activeSafe?.id === safe.id
          const status = safe.deployed ? pc.green('deployed') : pc.yellow('not deployed')

          return {
            value: safe.id,
            label: `${isActive ? pc.green('● ') : ''}${safe.name}`,
            hint: `${shortenAddress(safe.address)} | ${chain?.name || safe.chainId} | ${status}`,
          }
        }),
      })) as string

      if (p.isCancel(selectedId)) {
        p.cancel('Operation cancelled')
        return
      }
    }

    // Validate Safe ID exists
    const safe = safeStorage.getSafe(selectedId)
    if (!safe) {
      p.log.error(`Safe with ID ${selectedId} not found`)
      p.outro('Failed')
      return
    }

    // Set as active
    safeStorage.setActiveSafe(selectedId)

    const chain = configStore.getChain(safe.chainId)
    p.outro(
      `Switched to ${pc.bold(safe.name)}\n${pc.dim(
        `Address: ${safe.address} | Chain: ${chain?.name || safe.chainId}`
      )}`
    )
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
