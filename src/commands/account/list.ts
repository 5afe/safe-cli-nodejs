import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { formatSafeAddress } from '../../utils/eip3770.js'

export async function listSafes() {
  p.intro(pc.bgCyan(pc.black(' Safe Accounts ')))

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()

  const safes = safeStorage.getAllSafes()

  if (safes.length === 0) {
    console.log('')
    console.log(pc.dim('No Safe accounts found'))
    console.log('')
    p.outro('Use "safe account create" or "safe account open" to add a Safe')
    return
  }

  const chains = configStore.getAllChains()

  // Display initial list immediately
  console.log('')
  for (const safe of safes) {
    const chain = configStore.getChain(safe.chainId)
    const status = safe.deployed ? pc.green('deployed') : pc.yellow('not deployed')
    const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)

    console.log(pc.bold(safe.name))
    console.log(`  ${pc.dim('Address:')} ${pc.cyan(eip3770)}`)
    console.log(`  ${pc.dim('Chain:')}   ${chain?.name || safe.chainId}`)

    if (safe.deployed) {
      console.log(`  ${pc.dim('Owners:')}  ${pc.dim('Loading...')}`)
    } else if (safe.predictedConfig) {
      console.log(`  ${pc.dim('Owners:')}  ${safe.predictedConfig.threshold} / ${safe.predictedConfig.owners.length}`)
    }

    console.log(`  ${pc.dim('Status:')}  ${status}`)
    console.log('')
  }

  // Fetch live data for deployed Safes
  const deployedSafes = safes.filter((s) => s.deployed)

  if (deployedSafes.length > 0) {
    const spinner = p.spinner()
    spinner.start(`Fetching live data for ${deployedSafes.length} deployed Safe(s)...`)

    const safeDataMap = new Map<string, { owners: Address[]; threshold: number } | null>()

    await Promise.all(
      deployedSafes.map(async (safe) => {
        const chain = configStore.getChain(safe.chainId)
        if (!chain) {
          safeDataMap.set(safe.address, null)
          return
        }

        try {
          const txService = new TransactionService(chain)
          const [owners, threshold] = await Promise.all([
            txService.getOwners(safe.address as Address),
            txService.getThreshold(safe.address as Address),
          ])
          safeDataMap.set(safe.address, { owners, threshold })
        } catch (error) {
          safeDataMap.set(safe.address, null)
        }
      })
    )

    spinner.stop('Data loaded')

    // Clear screen and redisplay with live data
    console.log('\x1b[2J\x1b[H') // Clear screen, move cursor to home

    p.intro(pc.bgCyan(pc.black(' Safe Accounts ')))

    console.log('')
    for (const safe of safes) {
      const chain = configStore.getChain(safe.chainId)
      const status = safe.deployed ? pc.green('deployed') : pc.yellow('not deployed')
      const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)

      console.log(pc.bold(safe.name))
      console.log(`  ${pc.dim('Address:')} ${pc.cyan(eip3770)}`)
      console.log(`  ${pc.dim('Chain:')}   ${chain?.name || safe.chainId}`)

      if (safe.deployed) {
        const data = safeDataMap.get(safe.address)
        if (data) {
          console.log(`  ${pc.dim('Owners:')}  ${data.threshold} / ${data.owners.length}`)
        } else {
          console.log(`  ${pc.dim('Owners:')}  ${pc.red('Error fetching')}`)
        }
      } else if (safe.predictedConfig) {
        console.log(`  ${pc.dim('Owners:')}  ${safe.predictedConfig.threshold} / ${safe.predictedConfig.owners.length}`)
      }

      console.log(`  ${pc.dim('Status:')}  ${status}`)
      console.log('')
    }
  }

  p.outro(pc.green(`Total: ${safes.length} Safe(s)`))
}
