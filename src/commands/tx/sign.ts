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
import { TransactionSignSuccessScreen } from '../../ui/screens/index.js'

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
        .filter(
          (tx) => tx.status === TransactionStatus.PENDING || tx.status === TransactionStatus.SIGNED
        )

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

    // Check if already signed
    const existingSignature = transaction.signatures?.find(
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
    const spinner2 = p.spinner()
    spinner2.start('Signing transaction')

    let privateKey: string
    try {
      privateKey = walletStorage.getPrivateKey(activeWallet.id, password)
    } catch (error) {
      spinner2.stop('Failed')
      p.log.error('Invalid password')
      p.outro('Failed')
      return
    }

    // Sign transaction
    const txService = new TransactionService(chain, privateKey)

    const signature = await txService.signTransaction(transaction.safeAddress, transaction.metadata)

    // Store signature
    transactionStore.addSignature(selectedSafeTxHash, {
      signer: activeWallet.address as Address,
      signature,
      signedAt: new Date(),
    })

    // Update status to signed if not already
    if (transaction.status === TransactionStatus.PENDING) {
      transactionStore.updateStatus(selectedSafeTxHash, TransactionStatus.SIGNED)
    }

    spinner2.stop()

    // Check if we have enough signatures
    const updatedTx = transactionStore.getTransaction(selectedSafeTxHash)!
    const currentSignatures = updatedTx.signatures?.length || 0

    // Show brief success message
    console.log('')
    console.log(`✓ Signature added (${currentSignatures}/${threshold} required)`)
    console.log('')

    // Offer next action based on signature status
    if (currentSignatures >= threshold) {
      // Transaction is ready to execute
      console.log('✓ Transaction is ready to execute!')
      console.log('')

      const nextAction = (await p.select({
        message: 'What would you like to do?',
        options: [
          { value: 'execute', label: 'Execute transaction on-chain', hint: 'Recommended' },
          {
            value: 'push',
            label: 'Push to Safe Transaction Service',
            hint: 'Share with other signers',
          },
          { value: 'skip', label: 'Skip for now' },
        ],
        initialValue: 'execute',
      })) as string

      if (!p.isCancel(nextAction)) {
        console.log('')
        if (nextAction === 'execute') {
          const { executeTransaction } = await import('./execute.js')
          await executeTransaction(selectedSafeTxHash)
        } else if (nextAction === 'push') {
          const { pushTransaction } = await import('./push.js')
          await pushTransaction(selectedSafeTxHash)
        } else {
          // Show full success screen with next steps
          await renderScreen(TransactionSignSuccessScreen, {
            safeTxHash: selectedSafeTxHash,
            currentSignatures,
            requiredSignatures: threshold,
          })
        }
      } else {
        p.outro('Done!')
      }
    } else {
      // Need more signatures
      console.log(`Still need ${threshold - currentSignatures} more signature(s)`)
      console.log('')

      const shouldPush = await p.confirm({
        message: 'Would you like to push this transaction to Safe Transaction Service?',
        initialValue: true,
      })

      if (!p.isCancel(shouldPush) && shouldPush) {
        console.log('')
        const { pushTransaction } = await import('./push.js')
        await pushTransaction(selectedSafeTxHash)
      } else {
        // Show full success screen with next steps
        await renderScreen(TransactionSignSuccessScreen, {
          safeTxHash: selectedSafeTxHash,
          currentSignatures,
          requiredSignatures: threshold,
        })
      }
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
