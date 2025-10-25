import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { ThresholdChangeSuccessScreen } from '../../ui/screens/index.js'

export async function changeThreshold(account?: string) {
  p.intro(pc.bgCyan(pc.black(' Change Safe Threshold ')))

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
        message: 'Select Safe to change threshold:',
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
      p.log.error('Safe must be deployed before changing threshold')
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

    // Fetch live owners and threshold from blockchain
    const spinner = p.spinner()
    spinner.start('Fetching Safe information from blockchain...')

    let owners: Address[]
    let currentThreshold: number
    try {
      const txService = new TransactionService(chain)
      ;[owners, currentThreshold] = await Promise.all([
        txService.getOwners(safe.address as Address),
        txService.getThreshold(safe.address as Address),
      ])
      spinner.stop('Safe information fetched')
    } catch (error) {
      spinner.stop('Failed to fetch Safe information')
      p.log.error(
        error instanceof Error ? error.message : 'Failed to fetch Safe data from blockchain'
      )
      p.outro('Failed')
      return
    }

    // Check if wallet is an owner
    if (!owners.some((owner) => owner.toLowerCase() === activeWallet.address.toLowerCase())) {
      p.log.error('Active wallet is not an owner of this Safe')
      p.outro('Failed')
      return
    }

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

    if (p.isCancel(newThreshold)) {
      p.cancel('Operation cancelled')
      return
    }

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

    if (p.isCancel(confirm) || !confirm) {
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
    transactionStore.createTransaction(
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
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
