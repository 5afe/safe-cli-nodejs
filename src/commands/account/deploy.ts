import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { SafeService } from '../../services/safe-service.js'
import { logError } from '../../ui/messages.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { AccountDeploySuccessScreen } from '../../ui/screens/index.js'

export async function deploySafe(account?: string) {
  p.intro('Deploy Safe')

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

  if (!safe.predictedConfig) {
    logError('Safe does not have deployment configuration')
    return
  }

  // Verify on-chain deployment status
  const chain = configStore.getChain(safe.chainId)!
  const safeService = new SafeService(chain)

  try {
    const safeInfo = await safeService.getSafeInfo(address)

    // If Safe is actually deployed on-chain
    if (safeInfo.isDeployed) {
      // Sync local storage with on-chain reality
      if (!safe.deployed) {
        safeStorage.updateSafe(chainId, address, { deployed: true })
      }
      logError('Safe is already deployed on-chain')
      return
    }

    // If local storage says deployed but on-chain says not deployed, fix the storage
    if (safe.deployed && !safeInfo.isDeployed) {
      safeStorage.updateSafe(chainId, address, { deployed: false })
    }
  } catch {
    // If we can't verify, log warning but continue
    console.log('⚠ Warning: Could not verify on-chain deployment status')
  }

  // Get active wallet
  const activeWallet = walletStorage.getActiveWallet()
  if (!activeWallet) {
    logError('No active wallet found. Please import a wallet first.')
    p.cancel('Use "safe wallet import" to import a wallet')
    return
  }

  const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)

  console.log('')
  console.log('Safe to Deploy:')
  console.log(`  Name:     ${safe.name}`)
  console.log(`  Address:  ${eip3770}`)
  console.log(`  Chain:    ${chain.name}`)
  console.log(
    `  Owners:   ${safe.predictedConfig.threshold} / ${safe.predictedConfig.owners.length}`
  )
  console.log('')
  console.log(`Deploying with wallet: ${activeWallet.name} (${activeWallet.address})`)
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

    // Display success screen with deployment details
    await renderScreen(AccountDeploySuccessScreen, {
      address: deployedAddress,
      chainId: chain.chainId,
      chainName: chain.name,
      explorerUrl: chain.explorer ? `${chain.explorer}/address/${deployedAddress}` : undefined,
    })
  } catch (error) {
    spinner.stop('Failed to deploy Safe')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
