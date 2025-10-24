import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getConfigStore } from '../../storage/config-store.js'

export async function showConfig() {
  const configStore = getConfigStore()
  const config = configStore.getConfig()

  p.intro(pc.bgCyan(pc.black(' Configuration ')))

  console.log('')
  console.log(pc.bold('Chains:'))
  const chains = Object.values(config.chains)
  if (chains.length === 0) {
    console.log(pc.dim('  No chains configured'))
  } else {
    for (const chain of chains) {
      console.log(`  ${pc.cyan(chain.name)} ${pc.dim(`(${chain.chainId})`)}`)
      console.log(`    RPC:      ${chain.rpcUrl}`)
      if (chain.explorer) {
        console.log(`    Explorer: ${chain.explorer}`)
      }
      console.log(`    Currency: ${chain.currency}`)
      console.log('')
    }
  }

  console.log(pc.bold('Defaults:'))
  console.log(`  Safe Version:   ${config.defaults.safeVersion}`)
  console.log(`  Signing Method: ${config.defaults.signingMethod}`)
  console.log(`  Gas Strategy:   ${config.defaults.gasStrategy}`)
  console.log('')

  console.log(pc.bold('Preferences:'))
  console.log(`  Analytics:   ${config.preferences.analytics ? 'enabled' : 'disabled'}`)
  console.log(`  Auto-Update: ${config.preferences.autoUpdate ? 'enabled' : 'disabled'}`)
  console.log('')

  console.log(pc.dim(`Config file: ${configStore.getConfigPath()}`))
  console.log('')

  p.outro(pc.green('Configuration displayed successfully'))
}
