import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { shortenAddress } from '../../utils/ethereum.js'

export async function listSafes() {
  p.intro(pc.bgCyan(pc.black(' Safe Accounts ')))

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()

  const safes = safeStorage.getAllSafes()
  const activeSafe = safeStorage.getActiveSafe()

  if (safes.length === 0) {
    console.log('')
    console.log(pc.dim('No Safe accounts found'))
    console.log('')
    p.outro('Use "safe account create" or "safe account open" to add a Safe')
    return
  }

  console.log('')
  for (const safe of safes) {
    const isActive = activeSafe?.id === safe.id
    const marker = isActive ? pc.green('●') : pc.dim('○')
    const label = isActive ? pc.bold(pc.green(safe.name)) : safe.name

    const chain = configStore.getChain(safe.chainId)
    const status = safe.deployed ? pc.green('deployed') : pc.yellow('not deployed')

    console.log(`${marker} ${label}`)
    console.log(`  ${pc.dim('ID:')}      ${pc.cyan(safe.id)}`)
    console.log(`  ${pc.dim('Address:')} ${shortenAddress(safe.address)}`)
    console.log(`  ${pc.dim('Chain:')}   ${chain?.name || safe.chainId}`)
    console.log(`  ${pc.dim('Owners:')}  ${safe.threshold} / ${safe.owners.length}`)
    console.log(`  ${pc.dim('Status:')}  ${status}`)
    if (safe.lastUsed) {
      console.log(`  ${pc.dim('Last used:')} ${new Date(safe.lastUsed).toLocaleString()}`)
    }
    console.log('')
  }

  if (activeSafe) {
    console.log(pc.dim(`Active Safe: ${activeSafe.name}`))
  }

  p.outro(pc.green(`Total: ${safes.length} Safe(s)`))
}
