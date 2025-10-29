import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync, readFileSync } from 'fs'
import { type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { TxBuilderParser, type TxBuilderFormat } from '../../services/tx-builder-parser.js'
import { SafeCLIError } from '../../utils/errors.js'
import { validateAndChecksumAddress } from '../../utils/validation.js'
import type { TransactionMetadata, TransactionSignature } from '../../types/transaction.js'
import { renderScreen } from '../../ui/render.js'
import {
  TransactionImportBuilderSuccessScreen,
  TransactionImportSuccessScreen,
} from '../../ui/screens/index.js'
import { formatSafeAddress } from '../../utils/eip3770.js'

interface ImportData {
  safeTxHash: string
  safe: string
  chainId: string
  safeAddress: Address
  metadata: TransactionMetadata
  signatures: TransactionSignature[]
  createdBy: Address
  createdAt: string | Date
}

/**
 * Import transactions from Transaction Builder format
 */
async function importTransactionBuilderFormat(data: TxBuilderFormat) {
  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const transactionStore = getTransactionStore()
  const walletStorage = getWalletStorage()

  try {
    // Parse Transaction Builder format
    const parsed = TxBuilderParser.parse(data)

    // Checksum addresses immediately
    try {
      parsed.safeAddress = validateAndChecksumAddress(parsed.safeAddress)
      for (const tx of parsed.transactions) {
        tx.to = validateAndChecksumAddress(tx.to)
      }
      if (parsed.createdBy) {
        parsed.createdBy = validateAndChecksumAddress(parsed.createdBy)
      }
    } catch (error) {
      throw new SafeCLIError(
        `Invalid address in transaction data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // Check if Safe exists locally
    const safe = safeStorage.getSafe(parsed.chainId, parsed.safeAddress)
    if (!safe) {
      p.log.warning(`Safe ${parsed.safeAddress} on chain ${parsed.chainId} not found locally`)
      console.log('')
      console.log(pc.dim('You need to open this Safe first:'))
      console.log(`  ${pc.cyan(`safe account open`)}`)
      console.log('')

      const confirm = await p.confirm({
        message: 'Continue anyway? (Transaction will need manual configuration)',
        initialValue: false,
      })

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled')
        return
      }
    }

    // Get active wallet
    const activeWallet = walletStorage.getActiveWallet()
    if (!activeWallet) {
      p.log.warning('No active wallet set')
      console.log('')
      console.log(pc.dim('You may need a wallet to sign transactions later:'))
      console.log(`  ${pc.cyan(`safe wallet import`)}`)
      console.log('')
    }

    // Get chain config
    const chain = configStore.getChain(parsed.chainId)
    if (!chain) {
      throw new SafeCLIError(`Chain ${parsed.chainId} not found in configuration`)
    }

    // Check if this is a batch (multiple transactions)
    if (parsed.transactions.length > 1) {
      console.log(pc.yellow('⚠ Multiple transactions detected (batch transaction)'))
      console.log('')
      console.log(
        pc.dim('Transaction Builder batches need to be converted to a MultiSend transaction.')
      )
      console.log(
        pc.dim('This feature is not yet implemented. Each transaction will be imported separately.')
      )
      console.log('')

      const confirm = await p.confirm({
        message: 'Import transactions separately?',
        initialValue: true,
      })

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled')
        return
      }
    }

    // Import each transaction
    const txService = new TransactionService(chain)
    const importedTransactions: string[] = []

    for (let i = 0; i < parsed.transactions.length; i++) {
      const tx = parsed.transactions[i]

      // Get current nonce for this Safe
      const currentNonce = await txService.getNonce(parsed.safeAddress)

      // Prompt for nonce
      const nonceInput = (await p.text({
        message: 'Transaction nonce:',
        placeholder: `${currentNonce} (recommended)`,
        initialValue: `${currentNonce}`,
        validate: (value) => {
          if (!value) return 'Nonce is required'
          const num = parseInt(value, 10)
          if (isNaN(num) || num < 0) return 'Nonce must be a non-negative number'
          if (num < currentNonce)
            return `Nonce cannot be lower than current Safe nonce (${currentNonce})`
          return undefined
        },
      })) as string

      if (p.isCancel(nonceInput)) {
        p.cancel('Operation cancelled')
        return
      }

      const nonce = parseInt(nonceInput, 10)

      // Create transaction with user-provided nonce
      const spinner = p.spinner()
      spinner.start('Creating transaction...')

      const createdTx = await txService.createTransaction(parsed.safeAddress, {
        to: tx.to,
        value: tx.value,
        data: tx.data,
        operation: tx.operation,
        nonce,
      })

      // Store transaction
      const createdBy = parsed.createdBy || (activeWallet?.address as Address) || parsed.safeAddress
      transactionStore.createTransaction(
        createdTx.safeTxHash,
        parsed.safeAddress,
        parsed.chainId,
        createdTx.metadata,
        createdBy
      )

      spinner.stop('Transaction created')

      importedTransactions.push(createdTx.safeTxHash)
    }

    // Get chains for EIP-3770 formatting
    const chains = configStore.getAllChains()
    const eip3770 = formatSafeAddress(parsed.safeAddress, parsed.chainId, chains)

    await renderScreen(TransactionImportBuilderSuccessScreen, {
      safeEip3770: eip3770,
      chainId: parsed.chainId,
      batchName: parsed.meta.name,
      batchDescription: parsed.meta.description,
      importedTxHashes: importedTransactions,
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

export async function importTransaction(input?: string) {
  p.intro(pc.bgCyan(pc.black(' Import Transaction ')))

  try {
    const safeStorage = getSafeStorage()
    const transactionStore = getTransactionStore()

    let jsonInput = input

    // If no input, prompt for it
    if (!jsonInput) {
      jsonInput = (await p.text({
        message: 'Enter JSON or file path:',
        placeholder: '{"safeTxHash":"0x..."}',
        validate: (value) => {
          if (!value) return 'Input is required'
          return undefined
        },
      })) as string

      if (p.isCancel(jsonInput)) {
        p.cancel('Operation cancelled')
        return
      }
    }

    // Check if input is a file path
    let jsonData: string
    if (existsSync(jsonInput)) {
      jsonData = readFileSync(jsonInput, 'utf-8')
    } else {
      jsonData = jsonInput
    }

    // Parse JSON
    let parsedData: unknown
    try {
      parsedData = JSON.parse(jsonData)
    } catch {
      throw new SafeCLIError('Invalid JSON format. Please make sure the JSON is quoted.')
    }

    // Auto-detect format and handle accordingly
    // Check if it's Transaction Builder format
    if (TxBuilderParser.isTxBuilderFormat(parsedData)) {
      console.log('')
      console.log(pc.cyan('ℹ Transaction Builder format detected'))

      await importTransactionBuilderFormat(parsedData)
      return
    }

    // Otherwise, treat as CLI format
    const importData: ImportData = parsedData as ImportData

    // Validate CLI format structure
    if (
      !importData.safeTxHash ||
      !importData.chainId ||
      !importData.safeAddress ||
      !importData.metadata
    ) {
      throw new SafeCLIError('Invalid transaction data: missing required fields')
    }

    // Checksum addresses immediately
    try {
      importData.safeAddress = validateAndChecksumAddress(importData.safeAddress)
      importData.metadata.to = validateAndChecksumAddress(importData.metadata.to)
      if (importData.metadata.gasToken) {
        importData.metadata.gasToken = validateAndChecksumAddress(importData.metadata.gasToken)
      }
      if (importData.metadata.refundReceiver) {
        importData.metadata.refundReceiver = validateAndChecksumAddress(
          importData.metadata.refundReceiver
        )
      }
      if (importData.createdBy) {
        importData.createdBy = validateAndChecksumAddress(importData.createdBy)
      }
      // Checksum all signature signers
      for (const sig of importData.signatures) {
        sig.signer = validateAndChecksumAddress(sig.signer)
      }
    } catch (error) {
      throw new SafeCLIError(
        `Invalid address in transaction data: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // Check if Safe exists locally
    const safe = safeStorage.getSafe(importData.chainId, importData.safeAddress)
    if (!safe) {
      p.log.warning(
        `Safe ${importData.safeAddress} on chain ${importData.chainId} not found locally`
      )
      console.log('')
      console.log(
        pc.dim('You can still import this transaction, but you may need to open this Safe first:')
      )
      console.log(`  ${pc.cyan(`safe account open`)}`)
      console.log('')

      const confirm = await p.confirm({
        message: 'Import transaction anyway?',
        initialValue: true,
      })

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled')
        return
      }
    }

    // Check if transaction already exists
    const existingTx = transactionStore.getTransaction(importData.safeTxHash)

    if (existingTx) {
      p.log.warning('Transaction already exists locally')

      // Merge signatures
      const newSignatures = (importData.signatures || []).filter(
        (importSig) =>
          !(existingTx.signatures || []).some(
            (existingSig) => existingSig.signer.toLowerCase() === importSig.signer.toLowerCase()
          )
      )

      if (newSignatures.length === 0) {
        p.log.info('No new signatures to import')
        p.outro('Already up to date')
        return
      }

      const confirm = await p.confirm({
        message: 'Import new signatures?',
        initialValue: true,
      })

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled')
        return
      }

      // Add new signatures
      for (const sig of newSignatures) {
        transactionStore.addSignature(importData.safeTxHash, sig)
      }

      const updatedTx = transactionStore.getTransaction(importData.safeTxHash)!
      const readyToExecute =
        safe &&
        safe.threshold !== undefined &&
        (updatedTx.signatures?.length || 0) >= safe.threshold

      await renderScreen(TransactionImportSuccessScreen, {
        safeTxHash: importData.safeTxHash,
        safe: importData.safe || importData.safeAddress,
        to: importData.metadata.to,
        mode: 'merged' as const,
        signatureCount: updatedTx.signatures?.length || 0,
        threshold: safe?.threshold,
        newSigners: newSignatures.map((sig) => sig.signer as Address),
        readyToExecute: !!readyToExecute,
      })
    } else {
      // Create new transaction
      const confirm = await p.confirm({
        message: 'Import this transaction?',
        initialValue: true,
      })

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled')
        return
      }

      // Store transaction
      transactionStore.createTransaction(
        importData.safeTxHash,
        importData.safeAddress,
        importData.chainId,
        importData.metadata,
        importData.createdBy
      )

      // Add all signatures
      for (const sig of importData.signatures) {
        transactionStore.addSignature(importData.safeTxHash, sig)
      }

      const readyToExecute =
        safe &&
        safe.threshold !== undefined &&
        (importData.signatures?.length || 0) >= safe.threshold

      await renderScreen(TransactionImportSuccessScreen, {
        safeTxHash: importData.safeTxHash,
        safe: importData.safe || importData.safeAddress,
        to: importData.metadata.to,
        mode: 'new' as const,
        signatureCount: importData.signatures?.length || 0,
        threshold: safe?.threshold,
        readyToExecute: !!readyToExecute,
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
