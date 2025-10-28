import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { TransactionService } from '../../services/transaction-service.js'
import { renderScreen } from '../../ui/render.js'
import { ThresholdChangeSuccessScreen } from '../../ui/screens/index.js'
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

export async function changeThreshold(account?: string) {
  p.intro(pc.bgCyan(pc.black(' Change Safe Threshold ')))

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
      p.log.error('Safe must be deployed before changing threshold')
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

    // Ask for new threshold
    const newThreshold = await p.text({
      message: `New threshold (current: ${currentThreshold}, max: ${owners.length}):`,
      placeholder: `${currentThreshold}`,
      validate: (value) => {
        if (!value) return 'Threshold is required'
        const num = parseInt(value, 10)
        if (isNaN(num) || num < 1) return 'Threshold must be at least 1'
        if (num > owners.length) {
          return `Threshold cannot exceed ${owners.length} (current owners)`
        }
        if (num === currentThreshold) {
          return 'New threshold must be different from current threshold'
        }
        return undefined
      },
    })

    if (!checkCancelled(newThreshold)) return

    const thresholdNum = parseInt(newThreshold as string, 10)

    // Show summary
    console.log('')
    console.log(pc.bold('Change Threshold Summary:'))
    console.log(`  ${pc.dim('Safe:')}         ${safe.name}`)
    console.log(`  ${pc.dim('Owners:')}       ${owners.length}`)
    console.log(`  ${pc.dim('Old Threshold:')} ${currentThreshold}`)
    console.log(`  ${pc.dim('New Threshold:')} ${thresholdNum}`)
    console.log('')

    const confirm = await p.confirm({
      message: 'Create transaction to change threshold?',
      initialValue: true,
    })

    if (!checkCancelled(confirm) || !confirm) {
      p.cancel('Operation cancelled')
      return
    }

    const spinner2 = p.spinner()
    spinner2.start('Creating change threshold transaction...')

    // Create the change threshold transaction using Safe SDK
    const txService = new TransactionService(chain)

    const safeTransaction = await txService.createChangeThresholdTransaction(
      safe.address as Address,
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

    await renderScreen(ThresholdChangeSuccessScreen, {
      safeTxHash: safeTransaction.safeTxHash,
      safeAddress: safe.address as Address,
      chainId: safe.chainId,
      oldThreshold: currentThreshold,
      newThreshold: thresholdNum,
    })
  } catch (error) {
    handleCommandError(error)
  }
}
