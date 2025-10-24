import * as p from '@clack/prompts'
import pc from 'picocolors'
import { getConfigStore } from '../../storage/config-store.js'
import type { ChainConfig } from '../../types/config.js'
import { isValidChainId, isValidUrl } from '../../utils/validation.js'
import { logError } from '../../ui/messages.js'

export async function addChain() {
  p.intro(pc.bgCyan(pc.black(' Add Chain ')))

  const configStore = getConfigStore()

  const chainId = await p.text({
    message: 'Chain ID:',
    placeholder: '1',
    validate: (value) => {
      if (!value) return 'Chain ID is required'
      if (!isValidChainId(value)) return 'Invalid chain ID'
      if (configStore.chainExists(value)) return `Chain ${value} already exists`
      return undefined
    },
  })

  if (p.isCancel(chainId)) {
    p.cancel('Operation cancelled')
    return
  }

  const name = await p.text({
    message: 'Chain name:',
    placeholder: 'Ethereum Mainnet',
    validate: (value) => (!value ? 'Chain name is required' : undefined),
  })

  if (p.isCancel(name)) {
    p.cancel('Operation cancelled')
    return
  }

  const shortName = await p.text({
    message: 'Short name (EIP-3770):',
    placeholder: 'eth',
    validate: (value) => {
      if (!value) return 'Short name is required'
      if (!/^[a-z0-9-]+$/.test(value)) return 'Short name must be lowercase alphanumeric with hyphens'
      return undefined
    },
  })

  if (p.isCancel(shortName)) {
    p.cancel('Operation cancelled')
    return
  }

  const rpcUrl = await p.text({
    message: 'RPC URL:',
    placeholder: 'https://eth.llamarpc.com',
    validate: (value) => {
      if (!value) return 'RPC URL is required'
      if (!isValidUrl(value)) return 'Invalid URL'
      return undefined
    },
  })

  if (p.isCancel(rpcUrl)) {
    p.cancel('Operation cancelled')
    return
  }

  const explorer = await p.text({
    message: 'Block explorer URL (optional):',
    placeholder: 'https://etherscan.io',
  })

  if (p.isCancel(explorer)) {
    p.cancel('Operation cancelled')
    return
  }

  const currency = await p.text({
    message: 'Native currency symbol:',
    placeholder: 'ETH',
    validate: (value) => (!value ? 'Currency symbol is required' : undefined),
  })

  if (p.isCancel(currency)) {
    p.cancel('Operation cancelled')
    return
  }

  const chainConfig: ChainConfig = {
    name: name as string,
    chainId: chainId as string,
    shortName: shortName as string,
    rpcUrl: rpcUrl as string,
    explorer: explorer ? (explorer as string) : undefined,
    currency: currency as string,
  }

  const spinner = p.spinner()
  spinner.start('Adding chain configuration...')

  try {
    configStore.setChain(chainId as string, chainConfig)
    spinner.stop('Chain added successfully')
    p.outro(pc.green(`✓ Chain ${name} (${chainId}) has been added`))
  } catch (error) {
    spinner.stop('Failed to add chain')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

export async function listChains() {
  p.intro(pc.bgCyan(pc.black(' Configured Chains ')))

  const configStore = getConfigStore()
  const chains = Object.values(configStore.getAllChains())

  if (chains.length === 0) {
    console.log(pc.dim('No chains configured'))
    p.outro('Use "safe config chains add" to add a chain')
    return
  }

  console.log('')
  for (const chain of chains) {
    console.log(`${pc.cyan('●')} ${pc.bold(chain.name)} ${pc.dim(`(Chain ID: ${chain.chainId})`)}`)
    console.log(`  ${pc.dim('Short name:')} ${pc.cyan(chain.shortName)}`)
    console.log(`  ${pc.dim('RPC:')} ${chain.rpcUrl}`)
    if (chain.explorer) {
      console.log(`  ${pc.dim('Explorer:')} ${chain.explorer}`)
    }
    console.log(`  ${pc.dim('Currency:')} ${chain.currency}`)
    console.log('')
  }

  p.outro(pc.green(`Total: ${chains.length} chain(s) configured`))
}

export async function removeChain() {
  p.intro(pc.bgCyan(pc.black(' Remove Chain ')))

  const configStore = getConfigStore()
  const chains = configStore.getAllChains()
  const chainEntries = Object.entries(chains)

  if (chainEntries.length === 0) {
    logError('No chains configured')
    p.cancel('Operation cancelled')
    return
  }

  const chainId = await p.select({
    message: 'Select chain to remove:',
    options: chainEntries.map(([id, config]) => ({
      value: id,
      label: `${config.name} (${id})`,
    })),
  })

  if (p.isCancel(chainId)) {
    p.cancel('Operation cancelled')
    return
  }

  const confirm = await p.confirm({
    message: `Are you sure you want to remove ${chains[chainId as string].name}?`,
  })

  if (p.isCancel(confirm) || !confirm) {
    p.cancel('Operation cancelled')
    return
  }

  try {
    configStore.deleteChain(chainId as string)
    p.outro(pc.green(`✓ Chain ${chains[chainId as string].name} has been removed`))
  } catch (error) {
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
