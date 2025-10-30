import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { TransactionService } from '../../services/transaction-service.js'
import { renderScreen } from '../../ui/render.js'
import { OwnerRemoveSuccessScreen } from '../../ui/screens/index.js'
import { createCommandContext } from '../../utils/command-context.js'
import {
  ensureActiveWallet,
  ensureChainConfigured,
  checkCancelled,
  handleCommandError,
} from '../../utils/command-helpers.js'
import {
  selectDeployedSafe,
  fetchSafeOwnersAndThreshold,
  ensureWalletIsOwner,
  parseAddressInput,
} from '../../utils/safe-helpers.js'

export async function removeOwner(account?: string, ownerAddress?: string) {
  p.intro(pc.bgCyan(pc.black(' Remove Safe Owner ')))

  try {
    const ctx = createCommandContext()

    const activeWallet = ensureActiveWallet(ctx.walletStorage)
    if (!activeWallet) return

    // Get Safe
    let chainId: string
    let address: Address

    if (account) {
      // Parse EIP-3770 address
      const parsed = parseAddressInput(account, ctx.chains)
      if (!parsed) return
      chainId = parsed.chainId
      address = parsed.address
    } else {
      // Show interactive selection
      const result = await selectDeployedSafe(ctx.safeStorage, ctx.configStore, ctx.chains)
      if (!result) return
      chainId = result.chainId
      address = result.address
    }

    const safe = ctx.safeStorage.getSafe(chainId, address)
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

    // Get chain
    const chain = ensureChainConfigured(safe.chainId, ctx.configStore)
    if (!chain) return

    // Fetch live owners and threshold from blockchain
    const safeData = await fetchSafeOwnersAndThreshold(chain, safe.address as Address)
    if (!safeData) return
    const { owners, threshold: currentThreshold } = safeData

    // Check if wallet is an owner
    if (!ensureWalletIsOwner(activeWallet, owners)) return

    // Check that Safe has at least 2 owners
    if (owners.length <= 1) {
      p.log.error('Cannot remove the last owner from a Safe')
      p.outro('Failed')
      return
    }

    // Get owner to remove
    let removeAddress: Address

    if (ownerAddress) {
      // Use provided owner address
      try {
        removeAddress = ctx.validator.assertAddressWithChain(
          ownerAddress,
          chainId,
          ctx.chains,
          'Owner address'
        )

        // Check if address is actually an owner
        if (!owners.some((o) => o.toLowerCase() === removeAddress.toLowerCase())) {
          p.log.error('Address is not an owner of this Safe')
          p.outro('Failed')
          return
        }
      } catch (error) {
        p.log.error(error instanceof Error ? error.message : 'Invalid address')
        p.outro('Failed')
        return
      }
    } else {
      // Select owner to remove interactively
      const ownerToRemove = await p.select({
        message: 'Select owner to remove:',
        options: owners.map((owner) => ({
          value: owner,
          label: owner,
        })),
      })

      if (!checkCancelled(ownerToRemove)) return

      removeAddress = ownerToRemove as Address
    }

    // Calculate max threshold after removal
    const maxThreshold = owners.length - 1

    // Ask about threshold
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

    if (!checkCancelled(newThreshold)) return

    const thresholdNum = parseInt(newThreshold as string, 10)

    // Show summary
    console.log('')
    console.log(pc.bold('Remove Owner Summary:'))
    console.log(`  ${pc.dim('Safe:')}          ${safe.name}`)
    console.log(`  ${pc.dim('Remove Owner:')}  ${removeAddress}`)
    console.log(`  ${pc.dim('Current Owners:')} ${owners.length}`)
    console.log(`  ${pc.dim('New Owners:')}     ${owners.length - 1}`)
    console.log(`  ${pc.dim('Old Threshold:')}  ${currentThreshold}`)
    console.log(`  ${pc.dim('New Threshold:')}  ${thresholdNum}`)
    console.log('')

    const confirm = await p.confirm({
      message: 'Create transaction to remove this owner?',
      initialValue: true,
    })

    if (!checkCancelled(confirm) || !confirm) {
      p.cancel('Operation cancelled')
      return
    }

    const spinner2 = p.spinner()
    spinner2.start('Creating remove owner transaction...')

    // Create the remove owner transaction using Safe SDK
    const txService = new TransactionService(chain)

    const safeTransaction = await txService.createRemoveOwnerTransaction(
      safe.address as Address,
      removeAddress,
      thresholdNum
    )

    // Store transaction
    ctx.transactionStore.createTransaction(
      safeTransaction.safeTxHash,
      safe.address as Address,
      safe.chainId,
      safeTransaction.metadata,
      activeWallet.address as Address
    )

    spinner2.stop('Transaction created')

    await renderScreen(OwnerRemoveSuccessScreen, {
      safeTxHash: safeTransaction.safeTxHash,
      safeAddress: safe.address as Address,
      chainId: safe.chainId,
      threshold: currentThreshold,
    })
  } catch (error) {
    handleCommandError(error)
  }
}
