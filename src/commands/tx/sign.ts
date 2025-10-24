import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { formatSafeAddress } from '../../utils/eip3770.js'

export async function signTransaction(safeTxHash?: string) {
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
    let selectedSafeTxHash = safeTxHash

    if (!selectedSafeTxHash) {
      const pendingTxs = transactionStore
        .getAllTransactions()
        .filter((tx) => tx.status === 'pending' || tx.status === 'signed')

      if (pendingTxs.length === 0) {
        p.log.error('No pending transactions found')
        p.outro('Nothing to sign')
        return
      }

      const chains = configStore.getAllChains()

      selectedSafeTxHash = (await p.select({
        message: 'Select transaction to sign',
        options: pendingTxs.map((tx) => {
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
      p.log.error(`Transaction ${selectedSafeTxHash} not found`)
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
    const safe = safeStorage.getSafe(transaction.chainId, transaction.safeAddress)
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

    const signature = await txService.signTransaction(
      transaction.safeAddress,
      transaction.safeTxHash,
      transaction.metadata
    )

    // Store signature
    transactionStore.addSignature(selectedSafeTxHash, {
      signer: activeWallet.address as Address,
      signature,
      signedAt: new Date(),
    })

    // Update status to signed if not already
    if (transaction.status === 'pending') {
      transactionStore.updateStatus(selectedSafeTxHash, 'signed')
    }

    spinner.stop('Transaction signed')

    // Check if we have enough signatures
    const updatedTx = transactionStore.getTransaction(selectedSafeTxHash)!
    const threshold = safe.threshold

    console.log('')
    console.log(pc.green(`✓ Signature added (${updatedTx.signatures.length}/${threshold} required)`))
    console.log('')

    if (updatedTx.signatures.length >= threshold) {
      console.log(pc.bold('Transaction is ready to execute!'))
      console.log('')
      console.log(pc.bold('To execute this transaction, run:'))
      console.log('')
      console.log(`  ${pc.cyan(`safe tx execute ${selectedSafeTxHash}`)}`)
      console.log('')
      p.outro('Ready to execute')
    } else {
      console.log(pc.yellow(`Need ${threshold - updatedTx.signatures.length} more signature(s)`))
      console.log('')
      p.outro('Signature added')
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
