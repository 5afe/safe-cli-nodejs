import * as p from '@clack/prompts'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { SafeService } from '../../services/safe-service.js'
import { getValidationService } from '../../services/validation-service.js'
import { checksumAddress, shortenAddress } from '../../utils/ethereum.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { AccountCreateSuccessScreen } from '../../ui/screens/index.js'
import { isNonInteractiveMode, outputSuccess, outputError } from '../../utils/command-helpers.js'
import { ExitCode } from '../../constants/exit-codes.js'
import { parseOwnersArgument } from '../../utils/argument-parser.js'

export interface SafeCreateOptions {
  chainId?: string
  owners?: string
  threshold?: string
  name?: string
  noDeploy?: boolean
}

export async function createSafe(options: SafeCreateOptions = {}) {
  if (!isNonInteractiveMode()) {
    p.intro('Create Safe Account')
  }

  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const walletStorage = getWalletStorage()

  // Get active wallet
  const activeWallet = walletStorage.getActiveWallet()
  if (!activeWallet) {
    outputError('No active wallet found. Please import a wallet first.', ExitCode.WALLET_ERROR)
  }

  if (!isNonInteractiveMode()) {
    console.log('')
    console.log(`Active wallet: ${activeWallet.name} (${activeWallet.address})`)
    console.log('')
  }

  // Select or get chain
  let chainId: string

  if (options.chainId) {
    // Use provided chain ID
    chainId = options.chainId
  } else {
    if (isNonInteractiveMode()) {
      outputError('Chain ID is required in non-interactive mode', ExitCode.INVALID_ARGS)
    }
    // Interactive chain selection
    const chains = Object.values(configStore.getAllChains())
    const selected = await p.select({
      message: 'Select chain:',
      options: chains.map((chain) => ({
        value: chain.chainId,
        label: `${chain.name} (${chain.chainId})`,
      })),
    })

    if (p.isCancel(selected)) {
      p.cancel('Operation cancelled')
      return
    }

    chainId = selected as string
  }

  const chain = configStore.getChain(chainId)
  if (!chain) {
    outputError(`Chain not found: ${chainId}`, ExitCode.CONFIG_ERROR)
  }

  const chainsConfig = configStore.getAllChains()

  // Configure owners
  let owners: Address[] = []
  const validator = getValidationService()

  if (options.owners) {
    // Parse owners from argument
    try {
      const parsedOwners = parseOwnersArgument(options.owners)
      // Validate and checksum each address
      owners = parsedOwners.map((owner) => {
        return validator.assertAddressWithChain(owner, chainId, chainsConfig, 'Owner address')
      })

      if (owners.length === 0) {
        outputError('At least one owner is required', ExitCode.INVALID_ARGS)
      }
    } catch (error) {
      outputError(
        error instanceof Error ? error.message : 'Invalid owners argument',
        ExitCode.INVALID_ARGS
      )
    }
  } else {
    if (isNonInteractiveMode()) {
      outputError('Owners are required in non-interactive mode', ExitCode.INVALID_ARGS)
    }
    // Interactive owner configuration
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

      const ownerAddress = await p.text({
        message: 'Owner address (supports EIP-3770 format: shortName:address):',
        placeholder: '0x... or eth:0x...',
        validate: (value) => {
          const addressError = validator.validateAddressWithChain(value, chainId, chainsConfig)
          if (addressError) return addressError

          // Check for duplicates - need to get checksummed version
          try {
            const checksummed = validator.assertAddressWithChain(
              value as string,
              chainId,
              chainsConfig,
              'Owner address'
            )
            if (owners.includes(checksummed)) return 'Owner already added'
          } catch (error) {
            // Should not happen since validateAddressWithChain already passed
            return error instanceof Error ? error.message : 'Invalid address'
          }

          return undefined
        },
      })

      if (p.isCancel(ownerAddress)) {
        p.cancel('Operation cancelled')
        return
      }

      const checksummed = validator.assertAddressWithChain(
        ownerAddress as string,
        chainId,
        chainsConfig,
        'Owner address'
      )
      owners.push(checksummed)
      console.log(`✓ Added ${shortenAddress(checksummed)}`)
    }

    if (owners.length === 0) {
      outputError('At least one owner is required', ExitCode.INVALID_ARGS)
    }
  }

  // Set threshold
  let thresholdNum: number

  if (options.threshold) {
    // Use provided threshold
    thresholdNum = parseInt(options.threshold, 10)
    if (isNaN(thresholdNum) || thresholdNum < 1 || thresholdNum > owners.length) {
      outputError(`Threshold must be between 1 and ${owners.length}`, ExitCode.INVALID_ARGS)
    }
  } else {
    if (isNonInteractiveMode()) {
      outputError('Threshold is required in non-interactive mode', ExitCode.INVALID_ARGS)
    }
    // Interactive threshold input
    const threshold = await p.text({
      message: `Signature threshold (1-${owners.length}):`,
      placeholder: Math.min(2, owners.length).toString(),
      validate: (value) => validator.validateThreshold(value, 1, owners.length),
    })

    if (p.isCancel(threshold)) {
      p.cancel('Operation cancelled')
      return
    }

    thresholdNum = parseInt(threshold as string, 10)
  }

  // Get name
  let safeName: string

  if (options.name) {
    // Use provided name
    const error = validator.validateRequired(options.name, 'Name')
    if (error) {
      outputError(error, ExitCode.INVALID_ARGS)
    }
    safeName = options.name
  } else {
    if (isNonInteractiveMode()) {
      outputError('Name is required in non-interactive mode', ExitCode.INVALID_ARGS)
    }
    // Interactive name input
    const name = await p.text({
      message: 'Give this Safe a name:',
      placeholder: 'my-safe',
      validate: (value) => validator.validateRequired(value, 'Name'),
    })

    if (p.isCancel(name)) {
      p.cancel('Operation cancelled')
      return
    }

    safeName = name as string
  }

  // Summary
  if (!isNonInteractiveMode()) {
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
  }

  const spinner = !isNonInteractiveMode() ? p.spinner() : null
  spinner?.start('Creating predicted Safe...')

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

    spinner?.stop()

    // Save to storage
    const safe = safeStorage.createSafe({
      name: safeName,
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

    if (isNonInteractiveMode()) {
      // JSON output mode
      outputSuccess('Safe created successfully', {
        name: safe.name,
        address: safe.address,
        eip3770,
        chainId: safe.chainId,
        chainName: chain.name,
        deployed: false,
        owners: safeAccountConfig.owners,
        threshold: safeAccountConfig.threshold,
        saltNonce,
      })
    } else {
      console.log('')
      console.log('✓ Safe created successfully!')
      console.log('')
      console.log(`  Name:    ${safe.name}`)
      console.log(`  Address: ${eip3770}`)
      console.log(`  Chain:   ${chain.name}`)
      console.log(`  Status:  Not deployed`)
      console.log('')
    }

    // Offer to deploy the Safe (skip if --no-deploy or non-interactive mode)
    if (!options.noDeploy && !isNonInteractiveMode()) {
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
    } else if (!isNonInteractiveMode()) {
      // Show success screen if deployment was skipped
      await renderScreen(AccountCreateSuccessScreen, {
        name: safe.name,
        address: safe.address as Address,
        chainId: safe.chainId,
        chainName: chain.name,
      })
    }
  } catch (error) {
    spinner?.stop('Failed to create Safe')
    const message = error instanceof Error ? error.message : 'Unknown error'
    outputError(message, ExitCode.ERROR)
  }
}
