import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { SafeTransactionServiceAPI } from '../../services/api-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { renderScreen } from '../../ui/render.js'
import { TransactionPushSuccessScreen } from '../../ui/screens/index.js'

export async function pushTransaction(safeTxHash?: string) {
  p.intro(pc.bgCyan(pc.black(' Push Transaction to Safe API ')))

  try {
    const configStore = getConfigStore()
    const safeStorage = getSafeStorage()
    const walletStorage = getWalletStorage()
    const transactionStore = getTransactionStore()

    const activeWallet = walletStorage.getActiveWallet()
    if (!activeWallet) {
      p.log.error('No active wallet set. Please import a wallet first.')
      p.outro('Setup required')
      return
    }

    // Get transaction to push
    let selectedSafeTxHash = safeTxHash

    if (!selectedSafeTxHash) {
      const localTxs = transactionStore.getAllTransactions()

      if (localTxs.length === 0) {
        p.log.error('No local transactions found')
        p.outro('Nothing to push')
        return
      }

      const chains = configStore.getAllChains()

      selectedSafeTxHash = (await p.select({
        message: 'Select transaction to push',
        options: localTxs.map((tx) => {
          const safe = safeStorage.getSafe(tx.chainId, tx.safeAddress)
          const eip3770 = formatSafeAddress(tx.safeAddress as Address, tx.chainId, chains)
          return {
            value: tx.safeTxHash,
            label: `${tx.safeTxHash.slice(0, 10)}... → ${tx.metadata.to}`,
            hint: `Safe: ${safe?.name || eip3770} | Signatures: ${tx.signatures?.length || 0}`,
          }
        }),
      })) as string

      if (p.isCancel(selectedSafeTxHash)) {
        p.cancel('Operation cancelled')
        return
      }
    }

    const transaction = transactionStore.getTransaction(selectedSafeTxHash)
    if (!transaction) {
      p.log.error(`Transaction ${selectedSafeTxHash} not found locally`)
      p.outro('Failed')
      return
    }

    // Get Safe info
    const safe = safeStorage.getSafe(transaction.chainId, transaction.safeAddress)
    if (!safe) {
      p.log.error('Safe not found')
      p.outro('Failed')
      return
    }

    // Get chain
    const chain = configStore.getChain(transaction.chainId)
    if (!chain) {
      p.log.error(`Chain ${transaction.chainId} not found in configuration`)
      p.outro('Failed')
      return
    }

    if (!chain.transactionServiceUrl) {
      p.log.error(`Transaction Service not configured for ${chain.name}`)
      p.outro('Not available')
      return
    }

    // Check if active wallet has signed
    const walletSignature = (transaction.signatures || []).find(
      (sig) => sig.signer.toLowerCase() === activeWallet.address.toLowerCase()
    )

    if (!walletSignature) {
      p.log.error('Active wallet has not signed this transaction')
      console.log('')
      console.log(pc.dim('Please sign the transaction first:'))
      console.log('')
      console.log(`  ${pc.cyan(`safe tx sign ${selectedSafeTxHash}`)}`)
      console.log('')
      p.outro('Failed')
      return
    }

    const spinner = p.spinner()
    spinner.start('Pushing transaction to Safe Transaction Service...')

    try {
      const apiKey = configStore.getPreferences().safeApiKey
      const apiService = new SafeTransactionServiceAPI(chain, apiKey)

      // Check if transaction already exists on the service
      const existingTx = await apiService.getTransaction(selectedSafeTxHash)

      const pushedSigners: Address[] = []

      if (existingTx) {
        spinner.stop('Transaction already exists on service')

        // Add new signatures
        const remoteSignatures = existingTx.confirmations as Array<{ owner: string }> || []
        const remoteSigners = new Set(remoteSignatures.map((conf) => conf.owner.toLowerCase()))

        const newSignatures = (transaction.signatures || []).filter(
          (sig) => !remoteSigners.has(sig.signer.toLowerCase())
        )

        if (newSignatures.length === 0) {
          p.outro('Already up to date')
          return
        }

        for (const sig of newSignatures) {
          await apiService.confirmTransaction(selectedSafeTxHash, sig.signature)
          pushedSigners.push(sig.signer as Address)
        }
      } else {
        // Propose new transaction
        await apiService.proposeTransaction(
          transaction.safeAddress as Address,
          selectedSafeTxHash,
          transaction.metadata,
          walletSignature.signature,
          activeWallet.address as Address
        )

        spinner.stop('Transaction proposed')

        // Track proposer
        pushedSigners.push(activeWallet.address as Address)

        // Add additional signatures if any
        const additionalSignatures = (transaction.signatures || []).filter(
          (sig) => sig.signer.toLowerCase() !== activeWallet.address.toLowerCase()
        )

        for (const sig of additionalSignatures) {
          await apiService.confirmTransaction(selectedSafeTxHash, sig.signature)
          pushedSigners.push(sig.signer as Address)
        }
      }

      const chains = configStore.getAllChains()
      const eip3770 = formatSafeAddress(
        transaction.safeAddress as Address,
        transaction.chainId,
        chains
      )
      const serviceUrl = `https://app.safe.global/transactions/tx?safe=${chain.shortName}:${transaction.safeAddress}&id=${selectedSafeTxHash}`

      await renderScreen(TransactionPushSuccessScreen, {
        safeTxHash: selectedSafeTxHash,
        safeEip3770: eip3770,
        mode: (existingTx ? 'updated' : 'proposed') as 'updated' | 'proposed',
        signers: pushedSigners,
        serviceUrl,
      })
    } catch (error) {
      spinner.stop('Failed')
      throw error
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
