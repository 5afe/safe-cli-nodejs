import * as p from '@clack/prompts'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { formatSafeAddress } from '../../utils/eip3770.js'
import { TransactionStatus } from '../../types/transaction.js'
import { renderScreen } from '../../ui/render.js'
import { TransactionExecuteSuccessScreen } from '../../ui/screens/index.js'

export async function executeTransaction(safeTxHash?: string) {
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
    let selectedSafeTxHash = safeTxHash

    if (!selectedSafeTxHash) {
      const signedTxs = transactionStore
        .getAllTransactions()
        .filter((tx) => tx.status === TransactionStatus.SIGNED)

      if (signedTxs.length === 0) {
        p.log.error('No signed transactions ready for execution')
        p.outro('Nothing to execute')
        return
      }

      const chains = configStore.getAllChains()

      selectedSafeTxHash = (await p.select({
        message: 'Select transaction to execute',
        options: signedTxs.map((tx) => {
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
      p.log.error(`Transaction ${selectedSafeTxHash} not found`)
      p.outro('Failed')
      return
    }

    if (transaction.status === TransactionStatus.EXECUTED) {
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

    // Get chain
    const chain = configStore.getChain(transaction.chainId)
    if (!chain) {
      p.log.error(`Chain ${transaction.chainId} not found in configuration`)
      p.outro('Failed')
      return
    }

    // Fetch live owners and threshold from blockchain
    const spinner = p.spinner()
    spinner.start('Fetching Safe information from blockchain...')

    let owners: Address[]
    let threshold: number
    try {
      const txService = new TransactionService(chain)
      ;[owners, threshold] = await Promise.all([
        txService.getOwners(transaction.safeAddress),
        txService.getThreshold(transaction.safeAddress),
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

    // Check if we have enough signatures
    const sigCount = transaction.signatures?.length || 0
    if (sigCount < threshold) {
      p.log.error(`Not enough signatures. Have ${sigCount}, need ${threshold}`)
      p.outro('Failed')
      return
    }

    // Display transaction details
    console.log('\nTransaction Details:')
    console.log(`  To: ${transaction.metadata.to}`)
    console.log(`  Value: ${transaction.metadata.value} wei`)
    console.log(`  Data: ${transaction.metadata.data}`)
    console.log(`  Operation: ${transaction.metadata.operation === 0 ? 'Call' : 'DelegateCall'}`)
    console.log(`  Signatures: ${sigCount}/${threshold}`)

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
    const spinner2 = p.spinner()
    spinner2.start('Executing transaction')

    let privateKey: string
    try {
      privateKey = walletStorage.getPrivateKey(activeWallet.id, password)
    } catch (error) {
      spinner2.stop('Failed')
      p.log.error('Invalid password')
      p.outro('Failed')
      return
    }

    // Execute transaction
    const txService = new TransactionService(chain, privateKey)

    const txHash = await txService.executeTransaction(
      transaction.safeAddress,
      transaction.metadata,
      (transaction.signatures || []).map((sig) => ({
        signer: sig.signer,
        signature: sig.signature,
      }))
    )

    // Update transaction status
    transactionStore.updateStatus(selectedSafeTxHash, TransactionStatus.EXECUTED, txHash)

    spinner2.stop('Transaction executed')

    const explorerUrl = chain.explorer ? `${chain.explorer}/tx/${txHash}` : undefined

    await renderScreen(TransactionExecuteSuccessScreen, {
      txHash,
      explorerUrl,
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
