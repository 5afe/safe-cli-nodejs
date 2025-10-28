import * as p from '@clack/prompts'
import pc from 'picocolors'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { getValidationService } from '../../services/validation-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { parseSafeAddress, formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { OwnerAddSuccessScreen } from '../../ui/screens/index.js'

export async function addOwner(account?: string) {
  p.intro(pc.bgCyan(pc.black(' Add Safe Owner ')))

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
        message: 'Select Safe to add owner to:',
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
      p.log.error('Safe must be deployed before adding owners')
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

    // Fetch live Safe data
    const txService = new TransactionService(chain)
    let currentOwners: Address[]
    let currentThreshold: number

    try {
      ;[currentOwners, currentThreshold] = await Promise.all([
        txService.getOwners(safe.address as Address),
        txService.getThreshold(safe.address as Address),
      ])
    } catch (error) {
      p.log.error(
        `Failed to fetch Safe data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      p.outro('Failed')
      return
    }

    // Check if wallet is an owner
    if (
      !currentOwners.some((owner) => owner.toLowerCase() === activeWallet.address.toLowerCase())
    ) {
      p.log.error('Active wallet is not an owner of this Safe')
      p.outro('Failed')
      return
    }

    // Get new owner address
    const validator = getValidationService()
    const newOwnerInput = await p.text({
      message: 'New owner address (supports EIP-3770 format: shortName:address):',
      placeholder: '0x... or eth:0x...',
      validate: (value) => {
        const addressError = validator.validateAddressWithChain(value, chainId, chains)
        if (addressError) return addressError
        const checksummed = validator.assertAddressWithChain(
          value as string,
          chainId,
          chains,
          'Owner address'
        )
        if (currentOwners.some((o) => o.toLowerCase() === checksummed.toLowerCase())) {
          return 'Address is already an owner'
        }
        return undefined
      },
    })

    if (p.isCancel(newOwnerInput)) {
      p.cancel('Operation cancelled')
      return
    }

    // Checksum the address (strips EIP-3770 prefix if present)
    let newOwner: Address
    try {
      newOwner = validator.assertAddressWithChain(
        newOwnerInput as string,
        chainId,
        chains,
        'Owner address'
      )
    } catch (error) {
      p.log.error(error instanceof Error ? error.message : 'Invalid address')
      p.outro('Failed')
      return
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

    if (p.isCancel(newThreshold)) {
      p.cancel('Operation cancelled')
      return
    }

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

    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Operation cancelled')
      return
    }

    const spinner = p.spinner()
    spinner.start('Creating add owner transaction...')

    // The addOwnerWithThreshold method encodes the transaction data
    const safeTransaction = await txService.createAddOwnerTransaction(
      safe.address as Address,
      newOwner,
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

    spinner.stop('Transaction created')

    await renderScreen(OwnerAddSuccessScreen, {
      safeTxHash: safeTransaction.safeTxHash,
      safeAddress: safe.address as Address,
      chainId: safe.chainId,
      threshold: currentThreshold,
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
