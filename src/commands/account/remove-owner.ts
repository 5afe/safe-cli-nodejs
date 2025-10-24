import * as p from '@clack/prompts'
import pc from 'picocolors'
import { isAddress, type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'

export async function removeOwner(account?: string) {
  p.intro(pc.bgCyan(pc.black(' Remove Safe Owner ')))

  try {
    const configStore = getConfigStore()
    const safeStorage = getSafeStorage()
    const walletStorage = getWalletStorage()
    const transactionStore = getTransactionStore()
    const chains = configStore.getAllChains()

    const activeWallet = walletStorage.getActiveWallet()
    if (!activeWallet) {
      p.log.error('No active wallet set. Please import a wallet first.')
      p.outro('Setup required')
      return
    }

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
        p.log.error(error instanceof Error ? error.message : 'Invalid account')
        p.cancel('Operation cancelled')
        return
      }
    } else {
      // Show interactive selection
      const safes = safeStorage.getAllSafes().filter((s) => s.deployed)
      if (safes.length === 0) {
        p.log.error('No deployed Safes found')
        p.cancel('Use "safe account deploy" to deploy a Safe first')
        return
      }

      const selected = await p.select({
        message: 'Select Safe to remove owner from:',
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
      p.log.error(`Safe not found: ${address} on chain ${chainId}`)
      p.cancel('Operation cancelled')
      return
    }

    if (!safe.deployed) {
      p.log.error('Safe must be deployed before removing owners')
      p.cancel('Operation cancelled')
      return
    }

    // Check if wallet is an owner
    if (!safe.owners.some((owner) => owner.toLowerCase() === activeWallet.address.toLowerCase())) {
      p.log.error('Active wallet is not an owner of this Safe')
      p.outro('Failed')
      return
    }

    // Check that Safe has at least 2 owners
    if (safe.owners.length <= 1) {
      p.log.error('Cannot remove the last owner from a Safe')
      p.outro('Failed')
      return
    }

    // Select owner to remove
    const ownerToRemove = await p.select({
      message: 'Select owner to remove:',
      options: safe.owners.map((owner) => ({
        value: owner,
        label: owner,
      })),
    })

    if (p.isCancel(ownerToRemove)) {
      p.cancel('Operation cancelled')
      return
    }

    const removeAddress = ownerToRemove as Address

    // Calculate max threshold after removal
    const maxThreshold = safe.owners.length - 1

    // Ask about threshold
    const currentThreshold = safe.threshold
    const suggestedThreshold = Math.min(currentThreshold, maxThreshold)

    const newThreshold = await p.text({
      message: `New threshold (current: ${currentThreshold}, max: ${maxThreshold}):`,
      placeholder: `${suggestedThreshold}`,
      initialValue: `${suggestedThreshold}`,
      validate: (value) => {
        if (!value) return 'Threshold is required'
        const num = parseInt(value, 10)
        if (isNaN(num) || num < 1) return 'Threshold must be at least 1'
        if (num > maxThreshold) {
          return `Threshold cannot exceed ${maxThreshold} (remaining owners)`
        }
        return undefined
      },
    })

    if (p.isCancel(newThreshold)) {
      p.cancel('Operation cancelled')
      return
    }

    const thresholdNum = parseInt(newThreshold as string, 10)

    // Show summary
    console.log('')
    console.log(pc.bold('Remove Owner Summary:'))
    console.log(`  ${pc.dim('Safe:')}          ${safe.name}`)
    console.log(`  ${pc.dim('Remove Owner:')}  ${removeAddress}`)
    console.log(`  ${pc.dim('Current Owners:')} ${safe.owners.length}`)
    console.log(`  ${pc.dim('New Owners:')}     ${safe.owners.length - 1}`)
    console.log(`  ${pc.dim('Old Threshold:')}  ${safe.threshold}`)
    console.log(`  ${pc.dim('New Threshold:')}  ${thresholdNum}`)
    console.log('')

    const confirm = await p.confirm({
      message: 'Create transaction to remove this owner?',
      initialValue: true,
    })

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Operation cancelled')
      return
    }

    // Get chain
    const chain = configStore.getChain(safe.chainId)
    if (!chain) {
      p.log.error(`Chain ${safe.chainId} not found in configuration`)
      p.outro('Failed')
      return
    }

    const spinner = p.spinner()
    spinner.start('Creating remove owner transaction...')

    // Create the remove owner transaction using Safe SDK
    const txService = new TransactionService(chain)

    const safeTransaction = await txService.createRemoveOwnerTransaction(
      safe.address as Address,
      removeAddress,
      thresholdNum
    )

    // Store transaction
    const storedTx = transactionStore.createTransaction(
      safeTransaction.safeTxHash,
      safe.address as Address,
      safe.chainId,
      safeTransaction.metadata,
      activeWallet.address as Address
    )

    spinner.stop('Transaction created')

    const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)

    console.log('')
    console.log(pc.green('✓ Remove owner transaction created'))
    console.log('')
    console.log(`  ${pc.dim('Safe TX Hash:')} ${safeTransaction.safeTxHash}`)
    console.log(`  ${pc.dim('Safe:')}         ${eip3770}`)
    console.log('')
    console.log(pc.bold('Next steps:'))
    console.log(`  1. Get ${safe.threshold} signature(s): ${pc.cyan(`safe tx sign ${safeTransaction.safeTxHash}`)}`)
    console.log(`  2. Execute the transaction: ${pc.cyan(`safe tx execute ${safeTransaction.safeTxHash}`)}`)
    console.log('')

    p.outro(pc.green('Owner removal transaction ready'))
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
