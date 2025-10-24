import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { SafeService } from '../../services/safe-service.js'
import { isValidAddress } from '../../utils/validation.js'
import { checksumAddress, shortenAddress } from '../../utils/ethereum.js'
import { logError } from '../../ui/messages.js'

export async function createSafe() {
  p.intro(pc.bgCyan(pc.black(' Create Safe Account ')))

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
  console.log(pc.dim(`Active wallet: ${activeWallet.name} (${shortenAddress(activeWallet.address)})`))
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
    console.log(pc.green(`✓ Added ${shortenAddress(activeWallet.address)}`))
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
      message: 'Owner address:',
      placeholder: '0x...',
      validate: (value) => {
        if (!value) return 'Address is required'
        if (!isValidAddress(value)) return 'Invalid Ethereum address'
        const checksummed = checksumAddress(value)
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
    console.log(pc.green(`✓ Added ${shortenAddress(checksummed)}`))
  }

  if (owners.length === 0) {
    logError('At least one owner is required')
    return
  }

  // Set threshold
  const threshold = await p.text({
    message: `Signature threshold (1-${owners.length}):`,
    placeholder: Math.min(2, owners.length).toString(),
    validate: (value) => {
      if (!value) return 'Threshold is required'
      const num = parseInt(value, 10)
      if (isNaN(num)) return 'Must be a number'
      if (num < 1) return 'Threshold must be at least 1'
      if (num > owners.length) return `Threshold cannot exceed ${owners.length} owners`
      return undefined
    },
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
    validate: (value) => (!value ? 'Name is required' : undefined),
  })

  if (p.isCancel(name)) {
    p.cancel('Operation cancelled')
    return
  }

  // Summary
  console.log('')
  console.log(pc.bold('📋 Safe Configuration Summary'))
  console.log('')
  console.log(`  ${pc.dim('Chain:')}      ${chain.name} (${chain.chainId})`)
  console.log(`  ${pc.dim('Version:')}    1.4.1`)
  console.log(`  ${pc.dim('Owners:')}     ${owners.length}`)
  owners.forEach((owner, i) => {
    const isActive = owner.toLowerCase() === activeWallet.address.toLowerCase()
    console.log(`              ${pc.dim(`${i + 1}.`)} ${shortenAddress(owner)}${isActive ? pc.green(' (you)') : ''}`)
  })
  console.log(`  ${pc.dim('Threshold:')} ${thresholdNum} / ${owners.length}`)
  console.log('')

  const spinner = p.spinner()
  spinner.start('Creating predicted Safe...')

  try {
    const safeService = new SafeService(chain)
    const { predictedAddress, safeAccountConfig, safeVersion } =
      await safeService.createPredictedSafe({
        owners,
        threshold: thresholdNum,
      })

    spinner.stop('Safe created!')

    // Save to storage
    const safe = safeStorage.createSafe({
      name: name as string,
      address: predictedAddress,
      chainId: chain.chainId,
      version: safeVersion,
      owners: safeAccountConfig.owners,
      threshold: safeAccountConfig.threshold,
      deployed: false,
      predictedConfig: {
        owners: safeAccountConfig.owners,
        threshold: safeAccountConfig.threshold,
      },
    })

    console.log('')
    console.log(pc.green('✓ Safe created successfully!'))
    console.log('')
    console.log(`  ${pc.dim('Name:')}            ${pc.bold(safe.name)}`)
    console.log(`  ${pc.dim('Address:')}         ${pc.bold(safe.address)}`)
    console.log(`  ${pc.dim('Short:')}           ${shortenAddress(safe.address)}`)
    console.log(`  ${pc.dim('Chain:')}           ${chain.name}`)
    console.log(`  ${pc.dim('Status:')}          ${pc.yellow('Not deployed')}`)
    console.log('')
    console.log(pc.dim('This Safe has been predicted but not yet deployed to the blockchain.'))
    console.log('')
    console.log('Next steps:')
    console.log(`  ${pc.cyan('•')} Deploy:  ${pc.bold(`safe account deploy ${safe.id}`)}`)
    console.log(`  ${pc.cyan('•')} Info:    ${pc.bold(`safe account info`)}`)
    console.log('')

    p.outro(pc.green('Safe ready for deployment'))
  } catch (error) {
    spinner.stop('Failed to create Safe')
    logError(error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
