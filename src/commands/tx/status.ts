import * as p from '@clack/prompts'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { TransactionStatusScreen } from '../../ui/screens/index.js'
import { isNonInteractiveMode, outputSuccess, outputError } from '../../utils/command-helpers.js'
import { ExitCode } from '../../constants/exit-codes.js'

export async function showTransactionStatus(safeTxHash?: string) {
  if (!isNonInteractiveMode()) {
    p.intro('Transaction Status')
  }

  try {
    const configStore = getConfigStore()
    const safeStorage = getSafeStorage()
    const transactionStore = getTransactionStore()
    const chains = configStore.getAllChains()

    let selectedSafeTxHash = safeTxHash

    // If no safeTxHash provided, show selection
    if (!selectedSafeTxHash) {
      const transactions = transactionStore.getAllTransactions()

      if (transactions.length === 0) {
        outputError('No transactions found', ExitCode.ERROR)
      }

      if (isNonInteractiveMode()) {
        outputError('Transaction hash is required in non-interactive mode', ExitCode.INVALID_ARGS)
      }

      const selected = await p.select({
        message: 'Select transaction:',
        options: transactions.map((tx) => ({
          value: tx.safeTxHash,
          label: `${tx.safeTxHash.slice(0, 10)}... → ${tx.metadata.to}`,
          hint: tx.status,
        })),
      })

      if (p.isCancel(selected)) {
        p.cancel('Operation cancelled')
        return
      }

      selectedSafeTxHash = selected as string
    }

    // Get transaction
    const tx = transactionStore.getTransaction(selectedSafeTxHash)
    if (!tx) {
      outputError(`Transaction not found: ${selectedSafeTxHash}`, ExitCode.ERROR)
    }

    // Get Safe info
    const safe = safeStorage.getSafe(tx.chainId, tx.safeAddress)
    if (!safe) {
      outputError(
        `Safe not found: ${tx.safeAddress} on chain ${tx.chainId}`,
        ExitCode.SAFE_NOT_FOUND
      )
    }

    const chain = configStore.getChain(tx.chainId)
    if (!chain) {
      outputError(`Chain ${tx.chainId} not found in configuration`, ExitCode.CONFIG_ERROR)
    }

    const eip3770 = formatSafeAddress(tx.safeAddress, tx.chainId, chains)

    // Fetch live owners and threshold from blockchain
    const spinner = !isNonInteractiveMode() ? p.spinner() : null
    spinner?.start('Fetching Safe information from blockchain...')

    let owners: Address[]
    let threshold: number
    try {
      const txService = new TransactionService(chain)
      ;[owners, threshold] = await Promise.all([
        txService.getOwners(tx.safeAddress),
        txService.getThreshold(tx.safeAddress),
      ])
      spinner?.stop('Safe information fetched')
    } catch (error) {
      spinner?.stop('Failed to fetch Safe information')
      outputError(
        error instanceof Error ? error.message : 'Failed to fetch Safe data from blockchain',
        ExitCode.NETWORK_ERROR
      )
    }

    // Calculate signature status
    const signaturesCollected = tx.signatures?.length || 0
    const signaturesRequired = threshold

    if (isNonInteractiveMode()) {
      const explorerUrl =
        tx.txHash && chain?.explorer ? `${chain.explorer}/tx/${tx.txHash}` : undefined
      outputSuccess('Transaction status retrieved', {
        safeTxHash: tx.safeTxHash,
        safeAddress: tx.safeAddress,
        safeEip3770: eip3770,
        chainId: tx.chainId,
        chainName: chain.name,
        to: tx.metadata.to,
        value: tx.metadata.value,
        data: tx.metadata.data,
        operation: tx.metadata.operation,
        nonce: tx.metadata.nonce,
        status: tx.status,
        signatures: {
          collected: signaturesCollected,
          required: signaturesRequired,
          signers: (tx.signatures || []).map((sig) => sig.signer),
        },
        owners,
        txHash: tx.txHash,
        explorerUrl,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      })
    } else {
      await renderScreen(TransactionStatusScreen, {
        safeTxHash: tx.safeTxHash,
        safeEip3770: eip3770,
        to: tx.metadata.to,
        value: tx.metadata.value,
        nonce: tx.metadata.nonce,
        status: tx.status,
        signaturesCollected,
        signaturesRequired,
        signers: (tx.signatures || []).map((sig) => sig.signer as Address),
        owners,
        txHash: tx.txHash,
        explorerUrl: tx.txHash && chain?.explorer ? `${chain.explorer}/tx/${tx.txHash}` : undefined,
      })
    }
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
