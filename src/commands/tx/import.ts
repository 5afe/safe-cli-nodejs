import * as p from '@clack/prompts'
import pc from 'picocolors'
import { existsSync, readFileSync } from 'fs'
import { isAddress, type Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
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

export async function importTransaction(input?: string) {
  p.intro(pc.bgCyan(pc.black(' Import Transaction ')))

  try {
    const configStore = getConfigStore()
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
    let importData: ImportData
    try {
      importData = JSON.parse(jsonData)
    } catch (error) {
      throw new SafeCLIError('Invalid JSON format')
    }

    // Validate structure
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
