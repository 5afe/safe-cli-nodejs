import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { SafeService } from '../../services/safe-service.js'
import { shortenAddress } from '../../utils/ethereum.js'
import { logError } from '../../ui/messages.js'

export async function showSafeInfo(safeId?: string) {
  p.intro(pc.bgCyan(pc.black(' Safe Information ')))

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()

  // Get Safe
  let safe
  if (safeId) {
    safe = safeStorage.getSafe(safeId)
    if (!safe) {
      logError(`Safe ${safeId} not found`)
      p.cancel('Operation cancelled')
      return
    }
  } else {
    safe = safeStorage.getActiveSafe()
    if (!safe) {
      const safes = safeStorage.getAllSafes()
      if (safes.length === 0) {
        logError('No Safes found')
        p.cancel('Use "safe account create" or "safe account open" to add a Safe')
        return
      }

      const selectedId = await p.select({
        message: 'Select Safe:',
        options: safes.map((s) => ({
          value: s.id,
          label: `${s.name} (${shortenAddress(s.address)})`,
        })),
      })

      if (p.isCancel(selectedId)) {
        p.cancel('Operation cancelled')
        return
      }

      safe = safeStorage.getSafe(selectedId as string)!
    }
  }

  const chain = configStore.getChain(safe.chainId)!

  console.log('')
  console.log(pc.bold(safe.name))
  console.log('')
  console.log(`  ${pc.dim('Address:')}  ${safe.address}`)
  console.log(`  ${pc.dim('Short:')}    ${shortenAddress(safe.address)}`)
  console.log(`  ${pc.dim('Chain:')}    ${chain.name} (${chain.chainId})`)
  console.log(`  ${pc.dim('Version:')}  ${safe.version}`)
  console.log(`  ${pc.dim('Status:')}   ${safe.deployed ? pc.green('Deployed') : pc.yellow('Not deployed')}`)
  console.log('')

  if (safe.deployed) {
    const spinner = p.spinner()
    spinner.start('Loading on-chain data...')

    try {
      const safeService = new SafeService(chain)
      const safeInfo = await safeService.getSafeInfo(safe.address as Address)

      spinner.stop('Data loaded')

      console.log(pc.bold('On-chain Data:'))
      console.log(`  ${pc.dim('Nonce:')}     ${safeInfo.nonce.toString()}`)
      if (safeInfo.balance !== undefined) {
        const eth = Number(safeInfo.balance) / 1e18
        console.log(`  ${pc.dim('Balance:')}   ${eth.toFixed(4)} ${chain.currency}`)
      }
      console.log('')
    } catch (error) {
      spinner.stop('Failed to load on-chain data')
      console.log(pc.yellow('⚠ Could not fetch on-chain data'))
      console.log('')
    }
  }

  console.log(pc.bold('Owners:'))
  safe.owners.forEach((owner, i) => {
    console.log(`  ${pc.dim(`${i + 1}.`)} ${owner}`)
    console.log(`      ${shortenAddress(owner)}`)
  })
  console.log('')
  console.log(`  ${pc.dim('Threshold:')} ${safe.threshold} / ${safe.owners.length}`)
  console.log('')

  if (chain.explorer) {
    console.log(pc.dim(`Explorer: ${chain.explorer}/address/${safe.address}`))
    console.log('')
  }

  p.outro(pc.green('Safe information displayed'))
}
