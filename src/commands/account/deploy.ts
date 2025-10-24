import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { SafeService } from '../../services/safe-service.js'
import { logError } from '../../ui/messages.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'

export async function deploySafe(account?: string) {
  p.intro(pc.bgCyan(pc.black(' Deploy Safe ')))

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const walletStorage = getWalletStorage()
  const chains = configStore.getAllChains()

  // Get Safe to deploy
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
    const undeployedSafes = safeStorage.getAllSafes().filter((s) => !s.deployed)
    if (undeployedSafes.length === 0) {
      logError('No undeployed Safes found')
      p.cancel('Use "safe account create" to create a Safe first')
      return
    }

    const selected = await p.select({
      message: 'Select Safe to deploy:',
      options: undeployedSafes.map((s) => {
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

  if (safe.deployed) {
    logError('Safe is already deployed')
    return
  }

  if (!safe.predictedConfig) {
    logError('Safe does not have deployment configuration')
    return
  }

  // Get active wallet
  const activeWallet = walletStorage.getActiveWallet()
  if (!activeWallet) {
    logError('No active wallet found. Please import a wallet first.')
    p.cancel('Use "safe wallet import" to import a wallet')
    return
  }

  const chain = configStore.getChain(safe.chainId)!
  const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)

  console.log('')
  console.log(pc.bold('Safe to Deploy:'))
  console.log(`  ${pc.dim('Name:')}     ${safe.name}`)
  console.log(`  ${pc.dim('Address:')}  ${pc.cyan(eip3770)}`)
  console.log(`  ${pc.dim('Chain:')}    ${chain.name}`)
  console.log(`  ${pc.dim('Owners:')}   ${safe.predictedConfig.threshold} / ${safe.predictedConfig.owners.length}`)
  console.log('')
  console.log(pc.dim(`Deploying with wallet: ${activeWallet.name} (${activeWallet.address})`))
  console.log('')

  const confirm = await p.confirm({
    message: 'Proceed with deployment?',
  })

  if (p.isCancel(confirm) || !confirm) {
    p.cancel('Operation cancelled')
    return
  }

  // Get password for wallet
  const password = await p.password({
    message: 'Enter wallet password:',
  })

  if (p.isCancel(password)) {
    p.cancel('Operation cancelled')
    return
  }

  const spinner = p.spinner()
  spinner.start('Deploying Safe...')

  try {
    // Get private key
    const privateKey = walletStorage.getPrivateKey(activeWallet.id, password as string)

    const safeService = new SafeService(chain, privateKey)

    const deployedAddress = await safeService.deploySafe({
      owners: safe.predictedConfig.owners as Address[],
      threshold: safe.predictedConfig.threshold,
      saltNonce: safe.predictedConfig.saltNonce,
    })

    spinner.stop('Safe deployed!')

    // Update storage
    safeStorage.updateSafe(chainId, address, {
      deployed: true,
      address: deployedAddress,
      predictedConfig: undefined,
    })

    const deployedEip3770 = formatSafeAddress(deployedAddress, chain.chainId, chains)

    console.log('')
    console.log(pc.green('✓ Safe deployed successfully!'))
    console.log('')
    console.log(`  ${pc.dim('Address:')} ${pc.cyan(deployedEip3770)}`)
    console.log(`  ${pc.dim('Chain:')}   ${chain.name}`)
    if (chain.explorer) {
      console.log(`  ${pc.dim('Explorer:')} ${chain.explorer}/address/${deployedAddress}`)
    }
    console.log('')

    p.outro(pc.green('Safe is now ready to use!'))
  } catch (error) {
    spinner.stop('Failed to deploy Safe')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
