import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { SafeService } from '../../services/safe-service.js'
import { getValidationService } from '../../services/validation-service.js'
import { checksumAddress, shortenAddress } from '../../utils/ethereum.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { logError } from '../../ui/messages.js'
import { renderScreen } from '../../ui/render.js'
import { AccountCreateSuccessScreen } from '../../ui/screens/index.js'

export async function createSafe() {
  p.intro('Create Safe Account')

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const walletStorage = getWalletStorage()

  // Get active wallet
  const activeWallet = walletStorage.getActiveWallet()
  if (!activeWallet) {
    logError('No active wallet found. Please import a wallet first.')
    p.cancel('Use "safe wallet import" to import a wallet')
    return
  }

  console.log('')
  console.log(`Active wallet: ${activeWallet.name} (${activeWallet.address})`)
  console.log('')

  // Select chain
  const chains = Object.values(configStore.getAllChains())
  const chainId = await p.select({
    message: 'Select chain:',
    options: chains.map((chain) => ({
      value: chain.chainId,
      label: `${chain.name} (${chain.chainId})`,
    })),
  })

  if (p.isCancel(chainId)) {
    p.cancel('Operation cancelled')
    return
  }

  const chain = configStore.getChain(chainId as string)!

  // Configure owners
  const owners: Address[] = []

  const includeActiveWallet = await p.confirm({
    message: 'Include active wallet as an owner?',
    initialValue: true,
  })

  if (p.isCancel(includeActiveWallet)) {
    p.cancel('Operation cancelled')
    return
  }

  if (includeActiveWallet) {
    owners.push(checksumAddress(activeWallet.address))
    console.log(`✓ Added ${shortenAddress(activeWallet.address)}`)
  }

  // Add more owners
  let addingOwners = true
  while (addingOwners) {
    const addMore = await p.confirm({
      message: `Add ${owners.length > 0 ? 'another' : 'an'} owner?`,
      initialValue: owners.length === 0,
    })

    if (p.isCancel(addMore)) {
      p.cancel('Operation cancelled')
      return
    }

    if (!addMore) {
      addingOwners = false
      break
    }

    const validator = getValidationService()
    const ownerAddress = await p.text({
      message: 'Owner address:',
      placeholder: '0x...',
      validate: (value) => {
        const addressError = validator.validateAddress(value)
        if (addressError) return addressError
        const checksummed = checksumAddress(value as string)
        if (owners.includes(checksummed as Address)) return 'Owner already added'
        return undefined
      },
    })

    if (p.isCancel(ownerAddress)) {
      p.cancel('Operation cancelled')
      return
    }

    const checksummed = checksumAddress(ownerAddress as string)
    owners.push(checksummed)
    console.log(`✓ Added ${shortenAddress(checksummed)}`)
  }

  if (owners.length === 0) {
    logError('At least one owner is required')
    return
  }

  // Set threshold
  const validator = getValidationService()
  const threshold = await p.text({
    message: `Signature threshold (1-${owners.length}):`,
    placeholder: Math.min(2, owners.length).toString(),
    validate: (value) => validator.validateThreshold(value, 1, owners.length),
  })

  if (p.isCancel(threshold)) {
    p.cancel('Operation cancelled')
    return
  }

  const thresholdNum = parseInt(threshold as string, 10)

  // Give it a name
  const name = await p.text({
    message: 'Give this Safe a name:',
    placeholder: 'my-safe',
    validate: (value) => validator.validateRequired(value, 'Name'),
  })

  if (p.isCancel(name)) {
    p.cancel('Operation cancelled')
    return
  }

  // Summary
  console.log('')
  console.log('Safe Configuration Summary')
  console.log('')
  console.log(`  Chain:      ${chain.name} (${chain.chainId})`)
  console.log(`  Version:    1.4.1`)
  console.log(`  Owners:     ${owners.length}`)
  owners.forEach((owner, i) => {
    const isActive = owner.toLowerCase() === activeWallet.address.toLowerCase()
    console.log(`              ${i + 1}. ${shortenAddress(owner)}${isActive ? ' (you)' : ''}`)
  })
  console.log(`  Threshold: ${thresholdNum} / ${owners.length}`)
  console.log('')

  const spinner = p.spinner()
  spinner.start('Creating predicted Safe...')

  try {
    const safeService = new SafeService(chain)

    // Find an available salt nonce (increment if Safe already deployed)
    let saltNonce = '0'
    let predictedAddress: Address | undefined
    let safeAccountConfig: { owners: string[]; threshold: number } | undefined
    let attempts = 0
    const maxAttempts = 100

    while (attempts < maxAttempts) {
      const result = await safeService.createPredictedSafe({
        owners,
        threshold: thresholdNum,
        saltNonce,
      })

      predictedAddress = result.predictedAddress
      safeAccountConfig = result.safeAccountConfig

      // Check if Safe already deployed at this address
      try {
        const safeInfo = await safeService.getSafeInfo(predictedAddress)
        if (safeInfo.isDeployed) {
          // Safe already deployed, try next salt nonce
          saltNonce = (BigInt(saltNonce) + 1n).toString()
          attempts++
          continue
        }
      } catch {
        // Error checking deployment status, assume not deployed
      }

      // Found an available address
      break
    }

    if (attempts >= maxAttempts || !predictedAddress || !safeAccountConfig) {
      throw new Error(`Could not find available Safe address after ${maxAttempts} attempts`)
    }

    spinner.stop()

    // Save to storage
    const safe = safeStorage.createSafe({
      name: name as string,
      address: predictedAddress,
      chainId: chain.chainId,
      deployed: false,
      predictedConfig: {
        owners: safeAccountConfig.owners,
        threshold: safeAccountConfig.threshold,
        saltNonce,
      },
    })

    // Show brief success message
    const allChains = configStore.getAllChains()
    const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, allChains)
    console.log('')
    console.log('✓ Safe created successfully!')
    console.log('')
    console.log(`  Name:    ${safe.name}`)
    console.log(`  Address: ${eip3770}`)
    console.log(`  Chain:   ${chain.name}`)
    console.log(`  Status:  Not deployed`)
    console.log('')

    // Offer to deploy the Safe
    const shouldDeploy = await p.confirm({
      message: 'Would you like to deploy this Safe now?',
      initialValue: true,
    })

    if (!p.isCancel(shouldDeploy) && shouldDeploy) {
      console.log('')
      const { deploySafe } = await import('./deploy.js')
      await deploySafe(eip3770)
    } else {
      // Show full success screen with next steps
      await renderScreen(AccountCreateSuccessScreen, {
        name: safe.name,
        address: safe.address as Address,
        chainId: safe.chainId,
        chainName: chain.name,
      })
    }
  } catch (error) {
    spinner.stop('Failed to create Safe')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
