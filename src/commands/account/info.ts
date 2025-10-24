import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { SafeService } from '../../services/safe-service.js'
import { logError } from '../../ui/messages.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'

export async function showSafeInfo(account?: string) {
  p.intro(pc.bgCyan(pc.black(' Safe Information ')))

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

  const chain = configStore.getChain(safe.chainId)!
  const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)

  console.log('')
  console.log(pc.bold(safe.name))
  console.log('')
  console.log(`  ${pc.dim('Address:')} ${pc.cyan(eip3770)}`)
  console.log(`  ${pc.dim('Chain:')}   ${chain.name} (${chain.chainId})`)
  console.log(`  ${pc.dim('Version:')} ${safe.version}`)
  console.log(`  ${pc.dim('Status:')}  ${safe.deployed ? pc.green('Deployed') : pc.yellow('Not deployed')}`)
  console.log('')

  if (safe.deployed) {
    const spinner = p.spinner()
    spinner.start('Loading on-chain data...')

    try {
      const safeService = new SafeService(chain)
      const safeInfo = await safeService.getSafeInfo(safe.address as Address)

      spinner.stop('Data loaded')

      console.log(pc.bold('On-chain Data:'))
      console.log(`  ${pc.dim('Nonce:')}   ${safeInfo.nonce.toString()}`)
      if (safeInfo.balance !== undefined) {
        const eth = Number(safeInfo.balance) / 1e18
        console.log(`  ${pc.dim('Balance:')} ${eth.toFixed(4)} ${chain.currency}`)
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
