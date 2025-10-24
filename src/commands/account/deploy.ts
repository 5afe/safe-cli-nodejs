import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { SafeService } from '../../services/safe-service.js'
import { shortenAddress } from '../../utils/ethereum.js'
import { logError } from '../../ui/messages.js'

export async function deploySafe(safeId?: string) {
  p.intro(pc.bgCyan(pc.black(' Deploy Safe ')))

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const walletStorage = getWalletStorage()

  // Get Safe to deploy
  let safe
  if (safeId) {
    safe = safeStorage.getSafe(safeId)
    if (!safe) {
      logError(`Safe ${safeId} not found`)
      p.cancel('Operation cancelled')
      return
    }
  } else {
    // Get active Safe
    safe = safeStorage.getActiveSafe()
    if (!safe) {
      const safes = safeStorage.getAllSafes().filter((s) => !s.deployed)
      if (safes.length === 0) {
        logError('No undeployed Safes found')
        p.cancel('Use "safe account create" to create a Safe first')
        return
      }

      const selectedId = await p.select({
        message: 'Select Safe to deploy:',
        options: safes.map((s) => ({
          value: s.id,
          label: `${s.name} (${shortenAddress(s.address)}) on ${configStore.getChain(s.chainId)?.name}`,
        })),
      })

      if (p.isCancel(selectedId)) {
        p.cancel('Operation cancelled')
        return
      }

      safe = safeStorage.getSafe(selectedId as string)!
    }
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

  console.log('')
  console.log(pc.bold('Safe to Deploy:'))
  console.log(`  ${pc.dim('Name:')}     ${safe.name}`)
  console.log(`  ${pc.dim('Address:')}  ${shortenAddress(safe.address)}`)
  console.log(`  ${pc.dim('Chain:')}    ${chain.name}`)
  console.log(`  ${pc.dim('Owners:')}   ${safe.owners.length}`)
  console.log(`  ${pc.dim('Threshold:')} ${safe.threshold} / ${safe.owners.length}`)
  console.log('')
  console.log(pc.dim(`Deploying with wallet: ${activeWallet.name} (${shortenAddress(activeWallet.address)})`))
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
    safeStorage.updateSafe(safe.id, {
      deployed: true,
      address: deployedAddress,
      predictedConfig: undefined,
    })

    console.log('')
    console.log(pc.green('✓ Safe deployed successfully!'))
    console.log('')
    console.log(`  ${pc.dim('Address:')} ${pc.bold(deployedAddress)}`)
    console.log(`  ${pc.dim('Short:')}   ${shortenAddress(deployedAddress)}`)
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
