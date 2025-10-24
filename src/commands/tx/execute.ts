import * as p from '@clack/prompts'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { SafeCLIError } from '../../utils/errors.js'

export async function executeTransaction(txId?: string) {
  p.intro('Execute Safe Transaction')

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

    // Get transaction to execute
    let transactionId = txId

    if (!transactionId) {
      const signedTxs = transactionStore
        .getAllTransactions()
        .filter((tx) => tx.status === 'signed')

      if (signedTxs.length === 0) {
        p.log.error('No signed transactions ready for execution')
        p.outro('Nothing to execute')
        return
      }

      transactionId = (await p.select({
        message: 'Select transaction to execute',
        options: signedTxs.map((tx) => ({
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

    // Check if we have enough signatures
    if (transaction.signatures.length < safe.threshold) {
      p.log.error(
        `Not enough signatures. Have ${transaction.signatures.length}, need ${safe.threshold}`
      )
      p.outro('Failed')
      return
    }

    // Display transaction details
    console.log('\nTransaction Details:')
    console.log(`  To: ${transaction.metadata.to}`)
    console.log(`  Value: ${transaction.metadata.value} wei`)
    console.log(`  Data: ${transaction.metadata.data}`)
    console.log(`  Operation: ${transaction.metadata.operation === 0 ? 'Call' : 'DelegateCall'}`)
    console.log(`  Signatures: ${transaction.signatures.length}/${safe.threshold}`)

    const confirm = await p.confirm({
      message: 'Execute this transaction on-chain?',
      initialValue: false,
    })

    if (!confirm || p.isCancel(confirm)) {
      p.cancel('Operation cancelled')
      return
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
    spinner.start('Executing transaction')

    let privateKey: string
    try {
      privateKey = walletStorage.getPrivateKey(activeWallet.id, password)
    } catch (error) {
      spinner.stop('Failed')
      p.log.error('Invalid password')
      p.outro('Failed')
      return
    }

    // Execute transaction
    const chain = configStore.getChain(transaction.chainId)
    if (!chain) {
      spinner.stop('Failed')
      p.log.error(`Chain ${transaction.chainId} not found in configuration`)
      p.outro('Failed')
      return
    }

    const txService = new TransactionService(chain, privateKey)

    const txHash = await txService.executeTransaction(
      transaction.safeAddress,
      transaction.metadata,
      transaction.signatures.map((sig) => ({
        signer: sig.signer,
        signature: sig.signature,
      }))
    )

    // Update transaction status
    transactionStore.updateStatus(transactionId, 'executed', txHash)

    spinner.stop('Transaction executed')

    const explorerUrl = chain.explorer ? `${chain.explorer}/tx/${txHash}` : null

    p.outro(
      `Transaction executed successfully!\n\nTx Hash: ${txHash}${
        explorerUrl ? `\nExplorer: ${explorerUrl}` : ''
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
