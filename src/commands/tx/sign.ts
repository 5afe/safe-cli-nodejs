import * as p from '@clack/prompts'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { SafeCLIError } from '../../utils/errors.js'

export async function signTransaction(txId?: string) {
  p.intro('Sign Safe Transaction')

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

    // Get transaction to sign
    let transactionId = txId

    if (!transactionId) {
      const pendingTxs = transactionStore
        .getAllTransactions()
        .filter((tx) => tx.status === 'pending' || tx.status === 'signed')

      if (pendingTxs.length === 0) {
        p.log.error('No pending transactions found')
        p.outro('Nothing to sign')
        return
      }

      transactionId = (await p.select({
        message: 'Select transaction to sign',
        options: pendingTxs.map((tx) => ({
          value: tx.id,
          label: `${tx.id.slice(0, 8)}... → ${tx.metadata.to}`,
          hint: `Safe: ${tx.safeAddress} | Signatures: ${tx.signatures.length}`,
        })),
      })) as string

      if (p.isCancel(transactionId)) {
        p.cancel('Operation cancelled')
        return
      }
    }

    const transaction = transactionStore.getTransaction(transactionId)
    if (!transaction) {
      p.log.error(`Transaction ${transactionId} not found`)
      p.outro('Failed')
      return
    }

    if (transaction.status === 'executed') {
      p.log.error('Transaction already executed')
      p.outro('Failed')
      return
    }

    if (transaction.status === 'rejected') {
      p.log.error('Transaction has been rejected')
      p.outro('Failed')
      return
    }

    // Get Safe info
    const safe = safeStorage.getSafe(transaction.safeAddress, transaction.chainId)
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

    // Check if already signed
    const existingSignature = transaction.signatures.find(
      (sig) => sig.signer.toLowerCase() === activeWallet.address.toLowerCase()
    )

    if (existingSignature) {
      const confirm = await p.confirm({
        message: 'You have already signed this transaction. Sign again?',
        initialValue: false,
      })

      if (!confirm || p.isCancel(confirm)) {
        p.cancel('Operation cancelled')
        return
      }
    }

    // Request password
    const password = (await p.password({
      message: 'Enter wallet password',
      validate: (value) => {
        if (!value) return 'Password is required'
        return undefined
      },
    })) as string

    if (p.isCancel(password)) {
      p.cancel('Operation cancelled')
      return
    }

    // Get private key
    const spinner = p.spinner()
    spinner.start('Signing transaction')

    let privateKey: string
    try {
      privateKey = walletStorage.getPrivateKey(activeWallet.id, password)
    } catch (error) {
      spinner.stop('Failed')
      p.log.error('Invalid password')
      p.outro('Failed')
      return
    }

    // Sign transaction
    const chain = configStore.getChain(transaction.chainId)
    if (!chain) {
      spinner.stop('Failed')
      p.log.error(`Chain ${transaction.chainId} not found in configuration`)
      p.outro('Failed')
      return
    }

    const txService = new TransactionService(chain, privateKey)

    if (!transaction.safeTxHash) {
      spinner.stop('Failed')
      p.log.error('Transaction missing safeTxHash')
      p.outro('Failed')
      return
    }

    const signature = await txService.signTransaction(
      transaction.safeAddress,
      transaction.safeTxHash,
      transaction.metadata
    )

    // Store signature
    transactionStore.addSignature(transactionId, {
      signer: activeWallet.address as Address,
      signature,
      signedAt: new Date(),
    })

    // Update status to signed if not already
    if (transaction.status === 'pending') {
      transactionStore.updateStatus(transactionId, 'signed')
    }

    spinner.stop('Transaction signed')

    // Check if we have enough signatures
    const updatedTx = transactionStore.getTransaction(transactionId)!
    const threshold = safe.threshold

    p.outro(
      `Signature added (${updatedTx.signatures.length}/${threshold} required).\n\n${
        updatedTx.signatures.length >= threshold
          ? `Transaction is ready to execute!\nUse 'safe tx execute ${transactionId}' to execute.`
          : `Need ${threshold - updatedTx.signatures.length} more signature(s).`
      }`
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
