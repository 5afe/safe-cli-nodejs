import * as p from '@clack/prompts'
import type { Address } from 'viem'
import { TransactionService } from '../../services/transaction-service.js'
import { LedgerService } from '../../services/ledger-service.js'
import { SafeCLIError } from '../../utils/errors.js'
import { TransactionStatus } from '../../types/transaction.js'
import { renderScreen } from '../../ui/render.js'
import { TransactionSignSuccessScreen } from '../../ui/screens/index.js'
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

export async function signTransaction(safeTxHash?: string) {
  if (!isNonInteractiveMode()) {
    p.intro('Sign Safe Transaction')
  }

  try {
    const ctx = createCommandContext()

    const activeWallet = ensureActiveWallet(ctx.walletStorage)
    if (!activeWallet) return

    // Get transaction to sign
    let selectedSafeTxHash = safeTxHash

    if (!selectedSafeTxHash) {
      if (isNonInteractiveMode()) {
        outputError('Transaction hash is required in non-interactive mode', ExitCode.INVALID_ARGS)
      }
      const hash = await selectTransaction(
        ctx.transactionStore,
        ctx.safeStorage,
        ctx.configStore,
        [TransactionStatus.PENDING, TransactionStatus.SIGNED],
        'Select transaction to sign'
      )
      if (!hash) return
      selectedSafeTxHash = hash
    }

    const transaction = ctx.transactionStore.getTransaction(selectedSafeTxHash)
    if (!transaction) {
      outputError(`Transaction ${selectedSafeTxHash} not found`, ExitCode.ERROR)
    }

    if (transaction.status === 'executed') {
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

    // Check if already signed
    const existingSignature = transaction.signatures?.find(
      (sig) => sig.signer.toLowerCase() === activeWallet.address.toLowerCase()
    )

    if (existingSignature && !isNonInteractiveMode()) {
      const confirm = await p.confirm({
        message: 'You have already signed this transaction. Sign again?',
        initialValue: false,
      })

      if (!confirm || p.isCancel(confirm)) {
        p.cancel('Operation cancelled')
        return
      }
    }

    // Sign transaction based on wallet type
    const spinner2 = !isNonInteractiveMode() ? p.spinner() : null
    let signature: string

    if (activeWallet.type === 'ledger') {
      // Ledger wallet signing
      spinner2?.start('Connecting to Ledger device...')

      try {
        // Check if device is connected
        if (!(await LedgerService.isDeviceConnected())) {
          spinner2?.stop('No Ledger device found')
          outputError(
            'No Ledger device found. Please connect your Ledger device and try again',
            ExitCode.ERROR
          )
        }

        // Connect to Ledger
        const ledgerService = new LedgerService()
        await ledgerService.connect()

        spinner2?.message('Please confirm transaction on your Ledger device...')

        // Sign with Ledger
        const txService = new TransactionService(chain)
        signature = await txService.signTransactionWithLedger(
          transaction.safeAddress,
          transaction.metadata,
          ledgerService,
          activeWallet.derivationPath
        )

        // Disconnect
        await ledgerService.disconnect()

        spinner2?.stop('Transaction signed')
      } catch (error) {
        spinner2?.stop('Failed')
        if (error instanceof SafeCLIError) {
          outputError(error.message, ExitCode.ERROR)
        } else {
          outputError(
            `Failed to sign with Ledger: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure your Ledger is connected, unlocked, and the Ethereum app is open`,
            ExitCode.ERROR
          )
        }
      }
    } else {
      // Private key wallet signing
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

      spinner2?.start('Signing transaction')

      let privateKey: string
      try {
        privateKey = ctx.walletStorage.getPrivateKey(activeWallet.id, password)
      } catch {
        spinner2?.stop('Failed')
        outputError('Invalid password', ExitCode.AUTH_FAILURE)
      }

      // Sign transaction
      const txService = new TransactionService(chain, privateKey)
      signature = await txService.signTransaction(transaction.safeAddress, transaction.metadata)

      spinner2?.stop('Transaction signed')
    }

    // Store signature
    ctx.transactionStore.addSignature(selectedSafeTxHash, {
      signer: activeWallet.address as Address,
      signature,
      signedAt: new Date().toISOString(),
    })

    // Update status to signed if not already
    if (transaction.status === TransactionStatus.PENDING) {
      ctx.transactionStore.updateStatus(selectedSafeTxHash, TransactionStatus.SIGNED)
    }

    // Check if we have enough signatures
    const updatedTx = ctx.transactionStore.getTransaction(selectedSafeTxHash)!
    const currentSignatures = updatedTx.signatures?.length || 0

    if (isNonInteractiveMode()) {
      // JSON output mode
      outputSuccess('Transaction signed successfully', {
        safeTxHash: selectedSafeTxHash,
        signer: activeWallet.address,
        currentSignatures,
        requiredSignatures: threshold,
        readyToExecute: currentSignatures >= threshold,
        status: updatedTx.status,
      })
    } else {
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
    }
  } catch (error) {
    handleCommandError(error)
  }
}
