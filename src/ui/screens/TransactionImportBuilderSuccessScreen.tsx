import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, List } from '../components/index.js'
import { theme } from '../theme.js'

export interface TransactionImportBuilderSuccessScreenProps {
  /**
   * Safe address in EIP-3770 format
   */
  safeEip3770: string

  /**
   * Chain ID
   */
  chainId: string

  /**
   * Batch name (if provided)
   */
  batchName?: string

  /**
   * Batch description (if provided)
   */
  batchDescription?: string

  /**
   * List of imported transaction hashes
   */
  importedTxHashes: string[]

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionImportBuilderSuccessScreen displays success after importing from Transaction Builder.
 * This replaces the console.log implementation in commands/tx/import.ts
 *
 * Features:
 * - Shows batch metadata (name, description)
 * - Lists all imported transaction hashes
 * - Displays next steps for signing
 */
export function TransactionImportBuilderSuccessScreen({
  safeEip3770,
  chainId,
  batchName,
  batchDescription,
  importedTxHashes,
  onExit,
}: TransactionImportBuilderSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const isSingle = importedTxHashes.length === 1

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Transaction Builder Import Complete" icon={theme.icons.success} />

      {/* Batch metadata */}
      <Box flexDirection="column" marginBottom={1}>
        {batchName && (
          <Box>
            <Text color={theme.colors.dim}>Batch: </Text>
            <Text color={theme.colors.primary}>{batchName}</Text>
          </Box>
        )}
        {batchDescription && (
          <Box>
            <Text color={theme.colors.dim}>Description: </Text>
            <Text>{batchDescription}</Text>
          </Box>
        )}
        <Box>
          <Text color={theme.colors.dim}>Safe: </Text>
          <Text color={theme.colors.primary}>{safeEip3770}</Text>
        </Box>
        <Box>
          <Text color={theme.colors.dim}>Chain: </Text>
          <Text>{chainId}</Text>
        </Box>
      </Box>

      {/* Imported transactions */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.success}>
          Successfully imported {importedTxHashes.length} transaction{isSingle ? '' : 's'}
        </Text>
        {importedTxHashes.length <= 5 && (
          <Box marginLeft={2} marginTop={1}>
            <List
              items={importedTxHashes.map((hash) => ({
                label: hash,
                icon: theme.icons.success,
                iconColor: theme.colors.success,
              }))}
            />
          </Box>
        )}
      </Box>

      {/* Next steps */}
      <Box flexDirection="column">
        <Text bold color={theme.colors.primary}>
          Next steps:
        </Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          {isSingle ? (
            <>
              <Text color={theme.colors.info}>
                safe tx sign {importedTxHashes[0]}
              </Text>
              <Text color={theme.colors.dim}>  (sign the transaction)</Text>
              <Box marginTop={1} />
              <Text color={theme.colors.info}>
                safe tx status {importedTxHashes[0]}
              </Text>
              <Text color={theme.colors.dim}>  (check status)</Text>
            </>
          ) : (
            <>
              <Text color={theme.colors.info}>safe tx list</Text>
              <Text color={theme.colors.dim}>  (view all transactions)</Text>
              <Box marginTop={1} />
              <Text color={theme.colors.info}>safe tx sign {'<safeTxHash>'}</Text>
              <Text color={theme.colors.dim}>  (sign each transaction)</Text>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
