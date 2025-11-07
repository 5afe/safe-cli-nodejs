import * as p from '@clack/prompts'
import type { Address } from 'viem'
import { TransactionService } from '../../services/transaction-service.js'
import { TransactionStatus } from '../../types/transaction.js'
import { renderScreen } from '../../ui/render.js'
import { TransactionExecuteSuccessScreen } from '../../ui/screens/index.js'
import { createCommandContext } from '../../utils/command-context.js'
import {
  ensureActiveWallet,
  ensureChainConfigured,
  handleCommandError,
  isNonInteractiveMode,
  outputSuccess,
  outputError,
} from '../../utils/command-helpers.js'
import { selectTransaction } from '../../utils/safe-helpers.js'
import { getPassword } from '../../utils/password-handler.js'
import { getGlobalOptions } from '../../types/global-options.js'
import { ExitCode } from '../../constants/exit-codes.js'

export async function executeTransaction(safeTxHash?: string) {
  if (!isNonInteractiveMode()) {
    p.intro('Execute Safe Transaction')
  }

  try {
    const ctx = createCommandContext()

    const activeWallet = ensureActiveWallet(ctx.walletStorage)
    if (!activeWallet) return

    // Get transaction to execute
    let selectedSafeTxHash = safeTxHash

    if (!selectedSafeTxHash) {
      if (isNonInteractiveMode()) {
        outputError('Transaction hash is required in non-interactive mode', ExitCode.INVALID_ARGS)
      }
      const hash = await selectTransaction(
        ctx.transactionStore,
        ctx.safeStorage,
        ctx.configStore,
        [TransactionStatus.SIGNED],
        'Select transaction to execute'
      )
      if (!hash) return
      selectedSafeTxHash = hash
    }

    const transaction = ctx.transactionStore.getTransaction(selectedSafeTxHash)
    if (!transaction) {
      outputError(`Transaction ${selectedSafeTxHash} not found`, ExitCode.ERROR)
    }

    if (transaction.status === TransactionStatus.EXECUTED) {
      outputError('Transaction already executed', ExitCode.ERROR)
    }

    if (transaction.status === 'rejected') {
      outputError('Transaction has been rejected', ExitCode.ERROR)
    }

    // Get Safe info
    const safe = ctx.safeStorage.getSafe(transaction.chainId, transaction.safeAddress)
    if (!safe) {
      outputError('Safe not found', ExitCode.SAFE_NOT_FOUND)
    }

    // Get chain
    const chain = ensureChainConfigured(transaction.chainId, ctx.configStore)
    if (!chain) return

    // Fetch live owners and threshold from blockchain
    const spinner = !isNonInteractiveMode() ? p.spinner() : null
    spinner?.start('Fetching Safe information from blockchain...')

    let owners: Address[]
    let threshold: number
    try {
      const txService = new TransactionService(chain)
      ;[owners, threshold] = await Promise.all([
        txService.getOwners(transaction.safeAddress),
        txService.getThreshold(transaction.safeAddress),
      ])
      spinner?.stop('Safe information fetched')
    } catch (error) {
      spinner?.stop('Failed to fetch Safe information')
      outputError(
        error instanceof Error ? error.message : 'Failed to fetch Safe data from blockchain',
        ExitCode.NETWORK_ERROR
      )
    }

    // Check if wallet is an owner
    if (!owners.some((owner) => owner.toLowerCase() === activeWallet.address.toLowerCase())) {
      outputError('Active wallet is not an owner of this Safe', ExitCode.ERROR)
    }

    // Check if we have enough signatures
    const sigCount = transaction.signatures?.length || 0
    if (sigCount < threshold) {
      outputError(`Not enough signatures. Have ${sigCount}, need ${threshold}`, ExitCode.ERROR)
    }

    if (!isNonInteractiveMode()) {
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
    }

    // Request password using centralized handler
    const globalOptions = getGlobalOptions()
    const password = await getPassword(
      {
        password: globalOptions.password,
        passwordFile: globalOptions.passwordFile,
        passwordEnv: 'SAFE_WALLET_PASSWORD',
      },
      'Enter wallet password'
    )

    if (!password) {
      outputError('Password is required', ExitCode.AUTH_FAILURE)
    }

    // Get private key
    const spinner2 = !isNonInteractiveMode() ? p.spinner() : null
    spinner2?.start('Executing transaction')

    let privateKey: string
    try {
      privateKey = ctx.walletStorage.getPrivateKey(activeWallet.id, password)
    } catch {
      spinner2?.stop('Failed')
      outputError('Invalid password', ExitCode.AUTH_FAILURE)
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
    ctx.transactionStore.updateStatus(selectedSafeTxHash, TransactionStatus.EXECUTED, txHash)

    spinner2?.stop('Transaction executed')

    const explorerUrl = chain.explorer ? `${chain.explorer}/tx/${txHash}` : undefined

    if (isNonInteractiveMode()) {
      outputSuccess('Transaction executed successfully', {
        safeTxHash: selectedSafeTxHash,
        txHash,
        explorerUrl,
        chainId: transaction.chainId,
        chainName: chain.name,
      })
    } else {
      await renderScreen(TransactionExecuteSuccessScreen, {
        txHash,
        explorerUrl,
      })
    }
  } catch (error) {
    handleCommandError(error)
  }
}
