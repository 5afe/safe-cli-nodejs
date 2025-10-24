import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
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

  console.log('')
  for (const safe of safes) {
    const chain = configStore.getChain(safe.chainId)
    const status = safe.deployed ? pc.green('deployed') : pc.yellow('not deployed')
    const eip3770 = formatSafeAddress(safe.address as any, safe.chainId, chains)

    console.log(`${pc.bold(safe.name)}`)
    console.log(`  ${pc.dim('Address:')} ${pc.cyan(eip3770)}`)
    console.log(`  ${pc.dim('Chain:')}   ${chain?.name || safe.chainId}`)
    console.log(`  ${pc.dim('Owners:')}  ${safe.threshold} / ${safe.owners.length}`)
    console.log(`  ${pc.dim('Status:')}  ${status}`)
    console.log('')
  }

  p.outro(pc.green(`Total: ${safes.length} Safe(s)`))
}
