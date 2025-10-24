import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { Address } from 'viem'
import { getConfigStore } from '../../storage/config-store.js'
import { getSafeStorage } from '../../storage/safe-store.js'
import { getTransactionStore } from '../../storage/transaction-store.js'
import { SafeCLIError } from '../../utils/errors.js'
import { formatSafeAddress } from '../../utils/eip3770.js'

export async function showTransactionStatus(safeTxHash?: string) {
  p.intro(pc.bgCyan(pc.black(' Transaction Status ')))

  try {
    const configStore = getConfigStore()
    const safeStorage = getSafeStorage()
    const transactionStore = getTransactionStore()
    const chains = configStore.getAllChains()

    let selectedSafeTxHash = safeTxHash

    // If no safeTxHash provided, show selection
    if (!selectedSafeTxHash) {
      const transactions = transactionStore.getAllTransactions()

      if (transactions.length === 0) {
        p.log.error('No transactions found')
        p.outro('Nothing to show')
        return
      }

      const selected = await p.select({
        message: 'Select transaction:',
        options: transactions.map((tx) => ({
          value: tx.safeTxHash,
          label: `${tx.safeTxHash.slice(0, 10)}... → ${tx.metadata.to}`,
          hint: tx.status,
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
      p.log.error(`Transaction not found: ${selectedSafeTxHash}`)
      p.outro('Failed')
      return
    }

    // Get Safe info
    const safe = safeStorage.getSafe(tx.chainId, tx.safeAddress)
    if (!safe) {
      p.log.error(`Safe not found: ${tx.safeAddress} on chain ${tx.chainId}`)
      p.outro('Failed')
      return
    }

    const chain = configStore.getChain(tx.chainId)
    const eip3770 = formatSafeAddress(tx.safeAddress, tx.chainId, chains)

    // Calculate signature status
    const signaturesCollected = tx.signatures.length
    const signaturesRequired = safe.threshold
    const isReadyToExecute = signaturesCollected >= signaturesRequired

    // Display transaction info
    console.log('')
    console.log(pc.bold('Transaction Details:'))
    console.log(`  ${pc.dim('Safe TX Hash:')} ${tx.safeTxHash}`)
    console.log(`  ${pc.dim('Safe:')}         ${eip3770}`)
    console.log(`  ${pc.dim('To:')}           ${tx.metadata.to}`)
    console.log(`  ${pc.dim('Value:')}        ${tx.metadata.value} wei`)
    console.log(`  ${pc.dim('Nonce:')}        ${tx.metadata.nonce}`)
    console.log(`  ${pc.dim('Status:')}       ${tx.status}`)
    console.log('')

    // Display signature status
    console.log(pc.bold('Signature Status:'))
    if (isReadyToExecute) {
      console.log(`  ${pc.green(`✓ ${signaturesCollected}/${signaturesRequired} signatures collected - Ready to execute!`)}`)
    } else {
      console.log(`  ${pc.yellow(`⚠ ${signaturesCollected}/${signaturesRequired} signatures collected - Need ${signaturesRequired - signaturesCollected} more`)}`)
    }
    console.log('')

    // List signers
    if (tx.signatures.length > 0) {
      console.log(pc.bold('Signatures:'))
      for (const sig of tx.signatures) {
        const isOwner = safe.owners.some((owner) => owner.toLowerCase() === sig.signer.toLowerCase())
        const ownerMark = isOwner ? pc.green('✓') : pc.red('✗')
        console.log(`  ${ownerMark} ${sig.signer}`)
      }
      console.log('')
    }

    // List owners who haven't signed
    const unsignedOwners = safe.owners.filter(
      (owner) => !tx.signatures.some((sig) => sig.signer.toLowerCase() === owner.toLowerCase())
    )

    if (unsignedOwners.length > 0) {
      console.log(pc.bold('Awaiting signatures from:'))
      for (const owner of unsignedOwners) {
        console.log(`  ${pc.dim('○')} ${owner}`)
      }
      console.log('')
    }

    // Show next steps
    console.log(pc.bold('Next steps:'))
    console.log('')
    if (isReadyToExecute) {
      console.log(`  ${pc.cyan(`safe tx execute ${tx.safeTxHash}`)}`)
      console.log('')
    } else {
      console.log(`  ${pc.cyan(`safe tx sign ${tx.safeTxHash}`)} (if you're an owner)`)
      console.log('')
      console.log(`  ${pc.cyan(`safe tx export ${tx.safeTxHash}`)} (share with other owners)`)
      console.log('')
    }
    console.log('')

    // Show transaction hash if executed
    if (tx.txHash) {
      console.log(pc.bold('Execution:'))
      console.log(`  ${pc.dim('TX Hash:')} ${tx.txHash}`)
      if (chain?.explorer) {
        console.log(`  ${pc.dim('Explorer:')} ${chain.explorer}/tx/${tx.txHash}`)
      }
      console.log('')
    }

    p.outro('Status displayed')
  } catch (error) {
    if (error instanceof SafeCLIError) {
      p.log.error(error.message)
    } else {
      p.log.error(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
    p.outro('Failed')
  }
}
