import * as p from '@clack/prompts'
import { isAddress, type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { formatSafeAddress } from '../../utils/eip3770.js'

export async function createTransaction() {
  p.intro('Create Safe Transaction')

  try {
    const safeStorage = getSafeStorage()
    const configStore = getConfigStore()
    const walletStorage = getWalletStorage()
    const transactionStore = getTransactionStore()

    const activeWallet = walletStorage.getActiveWallet()
    if (!activeWallet) {
      p.log.error('No active wallet set. Please import a wallet first.')
      p.outro('Setup required')
      return
    }

    // Get all Safes
    const safes = safeStorage.getAllSafes()
    if (safes.length === 0) {
      p.log.error('No Safes found. Please create a Safe first.')
      p.outro('Setup required')
      return
    }

    const chains = configStore.getAllChains()

    // Select Safe
    const safeKey = (await p.select({
      message: 'Select Safe to create transaction for',
      options: safes.map((safe) => {
        const eip3770 = formatSafeAddress(safe.address as Address, safe.chainId, chains)
        const chain = configStore.getChain(safe.chainId)

        return {
          value: `${safe.chainId}:${safe.address}`,
          label: `${safe.name} (${eip3770})`,
          hint: chain?.name || safe.chainId,
        }
      }),
    })) as string

    if (p.isCancel(safeKey)) {
      p.cancel('Operation cancelled')
      return
    }

    const [chainId, address] = safeKey.split(':')
    const safe = safeStorage.getSafe(chainId, address as Address)
    if (!safe) {
      p.log.error('Safe not found')
      p.outro('Failed')
      return
    }

    // Check if wallet is an owner
    if (!safe.owners.some((owner) => owner.toLowerCase() === activeWallet.address.toLowerCase())) {
      p.log.error('Active wallet is not an owner of this Safe')
      p.outro('Failed')
      return
    }

    // Get transaction details
    const to = (await p.text({
      message: 'Recipient address',
      placeholder: '0x...',
      validate: (value) => {
        if (!value) return 'Address is required'
        if (!isAddress(value)) return 'Invalid Ethereum address'
        return undefined
      },
    })) as Address

    if (p.isCancel(to)) {
      p.cancel('Operation cancelled')
      return
    }

    const value = (await p.text({
      message: 'Value in wei (0 for token transfer)',
      placeholder: '0',
      initialValue: '0',
      validate: (value) => {
        if (!value) return 'Value is required'
        try {
          BigInt(value)
          return undefined
        } catch {
          return 'Invalid number'
        }
      },
    })) as string

    if (p.isCancel(value)) {
      p.cancel('Operation cancelled')
      return
    }

    const data = (await p.text({
      message: 'Transaction data (hex)',
      placeholder: '0x',
      initialValue: '0x',
      validate: (value) => {
        if (!value) return 'Data is required (use 0x for empty)'
        if (!value.startsWith('0x')) return 'Data must start with 0x'
        if (value.length > 2 && !/^0x[0-9a-fA-F]*$/.test(value)) {
          return 'Data must be valid hex'
        }
        return undefined
      },
    })) as `0x${string}`

    if (p.isCancel(data)) {
      p.cancel('Operation cancelled')
      return
    }

    const operation = (await p.select({
      message: 'Operation type',
      options: [
        { value: 0, label: 'Call', hint: 'Standard transaction call' },
        { value: 1, label: 'DelegateCall', hint: 'Delegate call (advanced)' },
      ],
      initialValue: 0,
    })) as 0 | 1

    if (p.isCancel(operation)) {
      p.cancel('Operation cancelled')
      return
    }

    // Get current Safe nonce for recommendation
    const chain = configStore.getChain(safe.chainId)
    if (!chain) {
      p.log.error(`Chain ${safe.chainId} not found in configuration`)
      p.outro('Failed')
      return
    }

    const txService = new TransactionService(chain)
    let currentNonce: number
    try {
      currentNonce = await txService.getNonce(safe.address as Address)
    } catch (error) {
      p.log.error(`Failed to get Safe nonce: ${error instanceof Error ? error.message : 'Unknown error'}`)
      p.outro('Failed')
      return
    }

    // Ask for nonce (optional, with recommended value)
    const nonceInput = (await p.text({
      message: 'Transaction nonce (leave empty for default)',
      placeholder: `${currentNonce} (recommended: current nonce)`,
      validate: (value) => {
        if (!value) return undefined // Empty is OK (will use default)
        const num = parseInt(value, 10)
        if (isNaN(num) || num < 0) return 'Nonce must be a non-negative number'
        if (num < currentNonce) return `Nonce cannot be lower than current Safe nonce (${currentNonce})`
        return undefined
      },
    })) as string

    if (p.isCancel(nonceInput)) {
      p.cancel('Operation cancelled')
      return
    }

    const nonce = nonceInput ? parseInt(nonceInput, 10) : undefined

    // Create transaction
    const spinner = p.spinner()
    spinner.start('Creating transaction')

    const createdTx = await txService.createTransaction(safe.address as Address, {
      to,
      value,
      data,
      operation,
      nonce,
    })

    // Store transaction with safeTxHash as ID
    const storedTx = transactionStore.createTransaction(
      createdTx.safeTxHash,
      safe.address as Address,
      safe.chainId,
      createdTx.metadata,
      activeWallet.address as Address
    )

    spinner.stop('Transaction created')

    p.outro(
      `Transaction created with Safe TX Hash: ${createdTx.safeTxHash}\n\nUse 'safe tx sign ${createdTx.safeTxHash}' to sign this transaction.`
    )
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
