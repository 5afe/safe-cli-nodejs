import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, KeyValue, List } from '../components/index.js'
import { theme } from '../theme.js'
import type { Address } from 'viem'

export interface TransactionImportSuccessScreenProps {
  /**
   * Transaction hash (safeTxHash)
   */
  safeTxHash: string

  /**
   * Safe address or name
   */
  safe: string

  /**
   * Target address of the transaction
   */
  to: Address

  /**
   * Import mode: 'new' for new transaction, 'merged' for signature merge
   */
  mode: 'new' | 'merged'

  /**
   * Number of signatures in the transaction
   */
  signatureCount: number

  /**
   * Safe threshold (if known)
   */
  threshold?: number

  /**
   * List of newly imported signers (for merged mode)
   */
  newSigners?: Address[]

  /**
   * Whether transaction is ready to execute
   */
  readyToExecute: boolean

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionImportSuccessScreen displays success after importing CLI format transaction.
 * This replaces the console.log implementation in commands/tx/import.ts
 *
 * Features:
 * - Shows transaction details (hash, safe, target)
 * - Displays mode (new import or signature merge)
 * - Lists newly imported signers (for merged mode)
 * - Shows signature progress and execution readiness
 * - Displays appropriate next steps
 */
export function TransactionImportSuccessScreen({
  safeTxHash,
  safe,
  to,
  mode,
  signatureCount,
  threshold,
  newSigners,
  readyToExecute,
  onExit,
}: TransactionImportSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const title = mode === 'new' ? 'Transaction Imported' : 'Signatures Merged'
  const modeColor = mode === 'new' ? theme.colors.success : theme.colors.info

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title={title} icon={theme.icons.success} />

      {/* Transaction details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Safe TX Hash', value: safeTxHash, valueColor: theme.colors.primary },
            { key: 'Safe', value: safe },
            { key: 'To', value: to },
          ]}
        />
      </Box>

      {/* New signers (for merged mode) */}
      {mode === 'merged' && newSigners && newSigners.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={modeColor}>
            Imported {newSigners.length} new signature{newSigners.length !== 1 ? 's' : ''}:
          </Text>
          <List
            items={newSigners.map((signer) => ({
              label: signer,
              icon: theme.icons.success,
              iconColor: theme.colors.success,
            }))}
            renderItem={(item) => (
              <Text>
                <Text color={item.iconColor}>{item.icon}</Text> {item.label}
              </Text>
            )}
          />
        </Box>
      )}

      {/* Signature status */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>
          <Text color={theme.colors.dim}>Signatures: </Text>
          <Text bold color={theme.colors.primary}>
            {signatureCount}
            {threshold !== undefined && ` / ${threshold}`}
          </Text>
        </Text>
      </Box>

      {/* Ready to execute indicator */}
      {readyToExecute && (
        <Box marginBottom={1}>
          <Text color={theme.colors.success}>✓ Transaction ready to execute!</Text>
        </Box>
      )}

      {/* Next steps */}
      <Box flexDirection="column">
        <Text bold color={theme.colors.primary}>
          {readyToExecute ? 'To execute this transaction, run:' : 'Next steps:'}
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          {readyToExecute ? (
            <Text color={theme.colors.info}>safe tx execute {safeTxHash}</Text>
          ) : (
            <>
              <Text color={theme.colors.info}>safe tx status {safeTxHash}</Text>
              <Text color={theme.colors.dim}>  (check status)</Text>
              <Box marginTop={1} />
              <Text color={theme.colors.info}>safe tx sign {safeTxHash}</Text>
              <Text color={theme.colors.dim}>  (add your signature)</Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
