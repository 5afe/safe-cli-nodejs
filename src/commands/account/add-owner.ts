import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { TransactionService } from '../../services/transaction-service.js'
import { renderScreen } from '../../ui/render.js'
import { OwnerAddSuccessScreen } from '../../ui/screens/index.js'
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

export async function addOwner(account?: string, ownerAddress?: string) {
  p.intro(pc.bgCyan(pc.black(' Add Safe Owner ')))

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
      p.log.error('Safe must be deployed before adding owners')
      p.cancel('Operation cancelled')
      return
    }

    // Get chain
    const chain = ensureChainConfigured(safe.chainId, ctx.configStore)
    if (!chain) return

    // Fetch live Safe data
    const safeData = await fetchSafeOwnersAndThreshold(chain, safe.address as Address)
    if (!safeData) return
    const { owners: currentOwners, threshold: currentThreshold } = safeData

    // Check if wallet is an owner
    if (!ensureWalletIsOwner(activeWallet, currentOwners)) return

    // Get new owner address
    let newOwner: Address

    if (ownerAddress) {
      // Use provided owner address
      try {
        newOwner = ctx.validator.assertAddressWithChain(
          ownerAddress,
          chainId,
          ctx.chains,
          'Owner address'
        )

        // Check for duplicates
        if (currentOwners.some((o) => o.toLowerCase() === newOwner.toLowerCase())) {
          p.log.error('Address is already an owner')
          p.outro('Failed')
          return
        }
      } catch (error) {
        p.log.error(error instanceof Error ? error.message : 'Invalid address')
        p.outro('Failed')
        return
      }
    } else {
      // Prompt for new owner address
      const newOwnerInput = await p.text({
        message: 'New owner address (supports EIP-3770 format: shortName:address):',
        placeholder: '0x... or eth:0x...',
        validate: (value) => {
          const addressError = ctx.validator.validateAddressWithChain(value, chainId, ctx.chains)
          if (addressError) return addressError

          // Check for duplicates - need to get checksummed version
          try {
            const checksummed = ctx.validator.assertAddressWithChain(
              value as string,
              chainId,
              ctx.chains,
              'Owner address'
            )
            if (currentOwners.some((o) => o.toLowerCase() === checksummed.toLowerCase())) {
              return 'Address is already an owner'
            }
          } catch (error) {
            // Should not happen since validateAddressWithChain already passed
            return error instanceof Error ? error.message : 'Invalid address'
          }

          return undefined
        },
      })

      if (!checkCancelled(newOwnerInput)) return

      // Checksum the address (strips EIP-3770 prefix if present)
      try {
        newOwner = ctx.validator.assertAddressWithChain(
          newOwnerInput as string,
          chainId,
          ctx.chains,
          'Owner address'
        )
      } catch (error) {
        p.log.error(error instanceof Error ? error.message : 'Invalid address')
        p.outro('Failed')
        return
      }
    }

    // Ask about threshold
    const newThreshold = await p.text({
      message: `New threshold (current: ${currentThreshold}, max: ${currentOwners.length + 1}):`,
      placeholder: `${currentThreshold}`,
      initialValue: `${currentThreshold}`,
      validate: (value) => {
        if (!value) return 'Threshold is required'
        const num = parseInt(value, 10)
        if (isNaN(num) || num < 1) return 'Threshold must be at least 1'
        if (num > currentOwners.length + 1) {
          return `Threshold cannot exceed ${currentOwners.length + 1} owners`
        }
        return undefined
      },
    })

    if (!checkCancelled(newThreshold)) return

    const thresholdNum = parseInt(newThreshold as string, 10)

    // Show summary
    console.log('')
    console.log(pc.bold('Add Owner Summary:'))
    console.log(`  ${pc.dim('Safe:')}          ${safe.name}`)
    console.log(`  ${pc.dim('New Owner:')}     ${newOwner}`)
    console.log(`  ${pc.dim('Current Owners:')} ${currentOwners.length}`)
    console.log(`  ${pc.dim('New Owners:')}    ${currentOwners.length + 1}`)
    console.log(`  ${pc.dim('Old Threshold:')} ${currentThreshold}`)
    console.log(`  ${pc.dim('New Threshold:')} ${thresholdNum}`)
    console.log('')

    const confirm = await p.confirm({
      message: 'Create transaction to add this owner?',
      initialValue: true,
    })

    if (!checkCancelled(confirm) || !confirm) {
      p.cancel('Operation cancelled')
      return
    }

    const spinner = p.spinner()
    spinner.start('Creating add owner transaction...')

    // The addOwnerWithThreshold method encodes the transaction data
    const txService = new TransactionService(chain)
    const safeTransaction = await txService.createAddOwnerTransaction(
      safe.address as Address,
      newOwner,
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

    spinner.stop('Transaction created')

    await renderScreen(OwnerAddSuccessScreen, {
      safeTxHash: safeTransaction.safeTxHash,
      safeAddress: safe.address as Address,
      chainId: safe.chainId,
      threshold: currentThreshold,
    })
  } catch (error) {
    handleCommandError(error)
  }
}
