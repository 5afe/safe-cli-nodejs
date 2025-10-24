import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync, readFileSync } from 'fs'
import { isAddress, type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { getWalletStorage } from '../../storage/wallet-store.js'
import { TransactionService } from '../../services/transaction-service.js'
import { TxBuilderParser } from '../../services/tx-builder-parser.js'
import { SafeCLIError } from '../../utils/errors.js'
import type { TransactionMetadata, TransactionSignature } from '../../types/transaction.js'

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
async function importTransactionBuilderFormat(data: any) {
  const configStore = getConfigStore()
  const safeStorage = getSafeStorage()
  const transactionStore = getTransactionStore()
  const walletStorage = getWalletStorage()

  try {
    // Parse Transaction Builder format
    const parsed = TxBuilderParser.parse(data)

    console.log('')
    console.log(pc.bold('Transaction Builder Import'))
    console.log('')

    if (parsed.meta.name) {
      console.log(`  ${pc.dim('Batch Name:')} ${parsed.meta.name}`)
    }
    if (parsed.meta.description) {
      console.log(`  ${pc.dim('Description:')} ${parsed.meta.description}`)
    }
    console.log(`  ${pc.dim('Chain ID:')}    ${parsed.chainId}`)
    console.log(`  ${pc.dim('Safe:')}        ${parsed.safeAddress}`)
    console.log(`  ${pc.dim('Transactions:')} ${parsed.transactions.length}`)
    console.log('')

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
      console.log(pc.dim('Transaction Builder batches need to be converted to a MultiSend transaction.'))
      console.log(pc.dim('This feature is not yet implemented. Each transaction will be imported separately.'))
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
      
      console.log('')
      console.log(pc.bold(`Transaction ${i + 1}/${parsed.transactions.length}`))
      console.log(`  ${pc.dim('To:')}    ${tx.to}`)
      console.log(`  ${pc.dim('Value:')} ${tx.value} wei`)
      console.log(`  ${pc.dim('Data:')}  ${tx.data.slice(0, 20)}...`)
      console.log('')

      // Get current nonce for this Safe
      const currentNonce = await txService.getNonce(parsed.safeAddress)

      console.log(pc.yellow(`⚠ Transaction needs configuration:`))
      console.log(`  • Nonce (current Safe nonce: ${currentNonce})`)
      console.log(`  • Gas parameters`)
      console.log('')

      // Prompt for nonce
      const nonceInput = (await p.text({
        message: 'Transaction nonce:',
        placeholder: `${currentNonce} (recommended)`,
        initialValue: `${currentNonce}`,
        validate: (value) => {
          if (!value) return 'Nonce is required'
          const num = parseInt(value, 10)
          if (isNaN(num) || num < 0) return 'Nonce must be a non-negative number'
          if (num < currentNonce) return `Nonce cannot be lower than current Safe nonce (${currentNonce})`
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
      
      console.log('')
      console.log(pc.green(`✓ Transaction ${i + 1} imported`))
      console.log(`  ${pc.dim('Safe TX Hash:')} ${createdTx.safeTxHash}`)

      importedTransactions.push(createdTx.safeTxHash)
    }

    console.log('')
    console.log(pc.green(`✓ Successfully imported ${importedTransactions.length} transaction(s)`))
    console.log('')
    console.log(pc.bold('Next steps:'))
    console.log('')
    
    if (importedTransactions.length === 1) {
      console.log(`  ${pc.cyan(`safe tx sign ${importedTransactions[0]}`)} (sign the transaction)`)
      console.log('')
      console.log(`  ${pc.cyan(`safe tx status ${importedTransactions[0]}`)} (check status)`)
    } else {
      console.log(`  ${pc.cyan(`safe tx list`)} (view all transactions)`)
      console.log('')
      console.log(`  ${pc.cyan(`safe tx sign <safeTxHash>`)} (sign each transaction)`)
    }
    console.log('')

    p.outro('Import complete')
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
    let parsedData: any
    try {
      parsedData = JSON.parse(jsonData)
    } catch (error) {
      throw new SafeCLIError('Invalid JSON format')
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
    if (!importData.safeTxHash || !importData.chainId || !importData.safeAddress || !importData.metadata) {
      throw new SafeCLIError('Invalid transaction data: missing required fields')
    }

    if (!isAddress(importData.safeAddress)) {
      throw new SafeCLIError('Invalid Safe address in transaction data')
    }

    // Check if Safe exists locally
    const safe = safeStorage.getSafe(importData.chainId, importData.safeAddress)
    if (!safe) {
      p.log.warning(`Safe ${importData.safeAddress} on chain ${importData.chainId} not found locally`)
      console.log('')
      console.log(pc.dim('You can still import this transaction, but you may need to open this Safe first:'))
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
      console.log('')
      console.log(pc.yellow('⚠ Transaction already exists locally'))
      console.log('')

      // Merge signatures
      const newSignatures = importData.signatures.filter(
        (importSig) =>
          !existingTx.signatures.some(
            (existingSig) => existingSig.signer.toLowerCase() === importSig.signer.toLowerCase()
          )
      )

      if (newSignatures.length === 0) {
        p.log.info('No new signatures to import')
        p.outro('Already up to date')
        return
      }

      console.log(pc.bold(`Found ${newSignatures.length} new signature(s) to import:`))
      for (const sig of newSignatures) {
        console.log(`  ${pc.dim('•')} ${sig.signer}`)
      }
      console.log('')

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

      console.log('')
      console.log(pc.green(`✓ Imported ${newSignatures.length} new signature(s)`))
      console.log('')
      console.log(pc.bold('Updated status:'))
      console.log(`  ${pc.dim('Signatures:')} ${updatedTx.signatures.length}${safe ? ` / ${safe.threshold}` : ''}`)
      console.log('')

      if (safe && updatedTx.signatures.length >= safe.threshold) {
        console.log(pc.green('✓ Transaction ready to execute!'))
        console.log('')
        console.log(pc.bold('To execute this transaction, run:'))
        console.log('')
        console.log(`  ${pc.cyan(`safe tx execute ${importData.safeTxHash}`)}`)
        console.log('')
      }

      p.outro('Import complete')
    } else {
      // Create new transaction
      console.log('')
      console.log(pc.bold('Importing transaction:'))
      console.log(`  ${pc.dim('Safe TX Hash:')} ${importData.safeTxHash}`)
      console.log(`  ${pc.dim('Safe:')}         ${importData.safe || importData.safeAddress}`)
      console.log(`  ${pc.dim('To:')}           ${importData.metadata.to}`)
      console.log(`  ${pc.dim('Signatures:')}   ${importData.signatures.length}`)
      console.log('')

      const confirm = await p.confirm({
        message: 'Import this transaction?',
        initialValue: true,
      })

      if (p.isCancel(confirm) || !confirm) {
        p.cancel('Operation cancelled')
        return
      }

      // Store transaction
      const storedTx = transactionStore.createTransaction(
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

      console.log('')
      console.log(pc.green('✓ Transaction imported successfully'))
      console.log('')

      if (safe && importData.signatures.length >= safe.threshold) {
        console.log(pc.green('✓ Transaction ready to execute!'))
        console.log('')
        console.log(pc.bold('To execute this transaction, run:'))
        console.log('')
        console.log(`  ${pc.cyan(`safe tx execute ${importData.safeTxHash}`)}`)
        console.log('')
      } else {
        console.log(pc.bold('Next steps:'))
        console.log('')
        console.log(`  ${pc.cyan(`safe tx status ${importData.safeTxHash}`)} (check status)`)
        console.log('')
        console.log(`  ${pc.cyan(`safe tx sign ${importData.safeTxHash}`)} (add your signature)`)
        console.log('')
      }

      p.outro('Import complete')
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
