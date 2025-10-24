import * as p from '@clack/prompts'
import pc from 'picocolors'
import { writeFileSync } from 'fs'
import { getConfigStore } from '../../storage/config-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { SafeCLIError } from '../../utils/errors.js'
import { formatSafeAddress } from '../../utils/eip3770.js'

export async function exportTransaction(safeTxHash?: string, outputFile?: string) {
  try {
    const configStore = getConfigStore()
    const transactionStore = getTransactionStore()
    const chains = configStore.getAllChains()

    let selectedSafeTxHash = safeTxHash

    // If no safeTxHash provided, show selection
    if (!selectedSafeTxHash) {
      p.intro(pc.bgCyan(pc.black(' Export Transaction ')))

      const transactions = transactionStore.getAllTransactions()

      if (transactions.length === 0) {
        p.log.error('No transactions found')
        p.outro('Nothing to export')
        return
      }

      const selected = await p.select({
        message: 'Select transaction to export:',
        options: transactions.map((tx) => ({
          value: tx.safeTxHash,
          label: `${tx.safeTxHash.slice(0, 10)}... → ${tx.metadata.to}`,
          hint: `${tx.signatures.length} signature(s)`,
        })),
      })

      if (p.isCancel(selected)) {
        p.cancel('Operation cancelled')
        return
      }

      selectedSafeTxHash = selected as string
    }

    // Get transaction
    const tx = transactionStore.getTransaction(selectedSafeTxHash)
    if (!tx) {
      if (!safeTxHash) p.log.error(`Transaction not found: ${selectedSafeTxHash}`)
      throw new SafeCLIError(`Transaction not found: ${selectedSafeTxHash}`)
    }

    const eip3770 = formatSafeAddress(tx.safeAddress, tx.chainId, chains)

    // Create export object
    const exportData = {
      safeTxHash: tx.safeTxHash,
      safe: eip3770,
      chainId: tx.chainId,
      safeAddress: tx.safeAddress,
      metadata: tx.metadata,
      signatures: tx.signatures,
      createdBy: tx.createdBy,
      createdAt: tx.createdAt,
    }

    // Minify JSON (one line)
    const jsonOutput = JSON.stringify(exportData)

    if (outputFile) {
      // Write to file
      writeFileSync(outputFile, jsonOutput, 'utf-8')

      if (!safeTxHash) {
        console.log('')
        console.log(pc.green(`✓ Transaction exported to ${outputFile}`))
        console.log('')
        console.log(pc.bold('Share this file with other Safe owners:'))
        console.log(`  ${pc.cyan(`safe tx import ${outputFile}`)}`)
        console.log('')
        p.outro('Export complete')
      }
    } else {
      // Output to stdout
      if (!safeTxHash) {
        p.intro(pc.bgCyan(pc.black(' Export Transaction ')))
        console.log('')
        console.log(pc.bold('Copy this JSON to share with other Safe owners:'))
        console.log('')
      }
      console.log(jsonOutput)

      if (!safeTxHash) {
        console.log('')
        console.log(pc.dim('To import: safe tx import <json>'))
        console.log('')
        p.outro('Export complete')
      }
    }
  } catch (error) {
    if (error instanceof SafeCLIError) {
      if (!safeTxHash) {
        p.log.error(error.message)
        p.outro('Failed')
      } else {
        throw error
      }
    } else {
      if (!safeTxHash) {
        p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        p.outro('Failed')
      } else {
        throw error
      }
    }
  }
}
