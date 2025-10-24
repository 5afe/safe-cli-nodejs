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
            hint: `Safe: ${safe?.name || eip3770} | Signatures: ${tx.signatures.length}`,
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
    const walletSignature = transaction.signatures.find(
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
      const apiService = new SafeTransactionServiceAPI(chain)

      // Check if transaction already exists on the service
      const existingTx = await apiService.getTransaction(selectedSafeTxHash)

      if (existingTx) {
        spinner.stop('Transaction already exists on service')

        // Add new signatures
        const remoteSignatures = existingTx.confirmations || []
        const remoteSigners = new Set(
          remoteSignatures.map((conf: any) => conf.owner.toLowerCase())
        )

        const newSignatures = transaction.signatures.filter(
          (sig) => !remoteSigners.has(sig.signer.toLowerCase())
        )

        if (newSignatures.length === 0) {
          console.log('')
          console.log(pc.yellow('⚠ No new signatures to push'))
          console.log('')
          p.outro('Already up to date')
          return
        }

        console.log('')
        console.log(pc.bold(`Pushing ${newSignatures.length} new signature(s)...`))

        for (const sig of newSignatures) {
          await apiService.confirmTransaction(selectedSafeTxHash, sig.signature)
          console.log(`  ${pc.green('✓')} Added signature from ${sig.signer}`)
        }

        console.log('')
        console.log(pc.green('✓ Signatures pushed successfully'))
        console.log('')
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

        // Add additional signatures if any
        const additionalSignatures = transaction.signatures.filter(
          (sig) => sig.signer.toLowerCase() !== activeWallet.address.toLowerCase()
        )

        if (additionalSignatures.length > 0) {
          console.log('')
          console.log(pc.bold(`Adding ${additionalSignatures.length} additional signature(s)...`))

          for (const sig of additionalSignatures) {
            await apiService.confirmTransaction(selectedSafeTxHash, sig.signature)
            console.log(`  ${pc.green('✓')} Added signature from ${sig.signer}`)
          }
        }

        console.log('')
        console.log(pc.green('✓ Transaction pushed to Safe Transaction Service'))
        console.log('')
      }

      const eip3770 = formatSafeAddress(transaction.safeAddress as Address, transaction.chainId, configStore.getAllChains())
      const serviceUrl = `${chain.transactionServiceUrl}/api/v1/safes/${transaction.safeAddress}/multisig-transactions/${selectedSafeTxHash}/`

      console.log(pc.dim('View on Safe Transaction Service:'))
      console.log(`  ${pc.cyan(serviceUrl)}`)
      console.log('')

      p.outro(pc.green('Push complete'))
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
