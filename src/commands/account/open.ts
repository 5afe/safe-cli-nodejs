import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address, isAddress } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { SafeService } from '../../services/safe-service.js'
import { isValidAddress } from '../../utils/validation.js'
import { checksumAddress, shortenAddress } from '../../utils/ethereum.js'
import { logError } from '../../ui/messages.js'
import { renderScreen } from '../../ui/render.js'
import { SafeOpenSuccessScreen } from '../../ui/screens/index.js'
import { parseEIP3770, getChainIdFromShortName } from '../../utils/eip3770.js'

export async function openSafe(addressArg?: string) {
  p.intro(pc.bgCyan(pc.black(' Open Existing Safe ')))

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const chains = configStore.getAllChains()

  if (Object.keys(chains).length === 0) {
    logError('No chains configured. Please run "safe config init" first.')
    return
  }

  let chainId: string
  let safeAddress: Address

  // Scenario 1: EIP-3770 format provided (shortName:address)
  if (addressArg && addressArg.includes(':')) {
    try {
      const { shortName, address } = parseEIP3770(addressArg)
      chainId = getChainIdFromShortName(shortName, chains)
      safeAddress = address
    } catch (error) {
      logError(error instanceof Error ? error.message : 'Invalid address format')
      return
    }
  }
  // Scenario 2: Bare address provided - ask for chain
  else if (addressArg) {
    if (!isAddress(addressArg)) {
      logError('Invalid Ethereum address')
      return
    }
    safeAddress = checksumAddress(addressArg) as Address

    // Ask for chain
    const chainsList = Object.values(chains)
    const selectedChainId = await p.select({
      message: 'Select chain:',
      options: chainsList.map((chain) => ({
        value: chain.chainId,
        label: `${chain.name} (${chain.chainId})`,
      })),
    })

    if (p.isCancel(selectedChainId)) {
      p.cancel('Operation cancelled')
      return
    }

    chainId = selectedChainId as string
  }
  // Scenario 3: No address provided - ask for both chain and address
  else {
    const chainsList = Object.values(chains)

    const selectedChainId = await p.select({
      message: 'Select chain:',
      options: chainsList.map((chain) => ({
        value: chain.chainId,
        label: `${chain.name} (${chain.chainId})`,
      })),
    })

    if (p.isCancel(selectedChainId)) {
      p.cancel('Operation cancelled')
      return
    }

    chainId = selectedChainId as string

    // Get Safe address
    const address = await p.text({
      message: 'Safe address:',
      placeholder: '0x...',
      validate: (value) => {
        if (!value) return 'Address is required'
        if (!isValidAddress(value)) return 'Invalid Ethereum address'
        return undefined
      },
    })

    if (p.isCancel(address)) {
      p.cancel('Operation cancelled')
      return
    }

    safeAddress = checksumAddress(address as string) as Address
  }

  const chain = configStore.getChain(chainId)!

  // Check if already exists
  if (safeStorage.safeExists(safeAddress, chain.chainId)) {
    logError('This Safe is already in your workspace')
    return
  }

  const spinner = p.spinner()
  spinner.start('Loading Safe information...')

  try {
    const safeService = new SafeService(chain)
    const safeInfo = await safeService.getSafeInfo(safeAddress)

    if (!safeInfo.isDeployed) {
      spinner.stop('Safe not found')
      logError('No Safe contract found at this address')
      return
    }

    spinner.stop('Safe loaded!')

    console.log('')
    console.log(pc.bold('Safe Information:'))
    console.log(`  ${pc.dim('Address:')}  ${shortenAddress(safeAddress)}`)
    console.log(`  ${pc.dim('Chain:')}    ${chain.name}`)
    console.log(`  ${pc.dim('Version:')}  ${safeInfo.version}`)
    console.log(`  ${pc.dim('Owners:')}   ${safeInfo.owners.length}`)
    safeInfo.owners.forEach((owner, i) => {
      console.log(`             ${pc.dim(`${i + 1}.`)} ${shortenAddress(owner)}`)
    })
    console.log(`  ${pc.dim('Threshold:')} ${safeInfo.threshold} / ${safeInfo.owners.length}`)
    console.log(`  ${pc.dim('Nonce:')}    ${safeInfo.nonce.toString()}`)
    if (safeInfo.balance) {
      const eth = Number(safeInfo.balance) / 1e18
      console.log(`  ${pc.dim('Balance:')}  ${eth.toFixed(4)} ${chain.currency}`)
    }
    console.log('')

    // Give it a name
    const name = await p.text({
      message: 'Give this Safe a name:',
      placeholder: 'my-safe',
      validate: (value) => (!value ? 'Name is required' : undefined),
    })

    if (p.isCancel(name)) {
      p.cancel('Operation cancelled')
      return
    }

    // Save to storage
    const safe = safeStorage.createSafe({
      name: name as string,
      address: safeAddress,
      chainId: chain.chainId,
      deployed: true,
    })

    await renderScreen(SafeOpenSuccessScreen, {
      name: safe.name,
    })
  } catch (error) {
    spinner.stop('Failed to load Safe')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
