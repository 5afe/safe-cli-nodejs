import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'

export interface TransactionExportSuccessScreenProps {
  /**
   * Output file path
   */
  outputFile: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionExportSuccessScreen displays success message after exporting a transaction.
 * This replaces the console.log implementation in commands/tx/export.ts
 *
 * Features:
 * - Shows export file path
 * - Displays import command for sharing
 * - Clean, consistent styling
 */
export function TransactionExportSuccessScreen({
  outputFile,
  onExit,
}: TransactionExportSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Transaction Exported" icon={theme.icons.success} />

      {/* Export details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue items={[{ key: 'File', value: outputFile, valueColor: theme.colors.primary }]} />
      </Box>

      {/* Instructions */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Share this file with other Safe owners:
        </Text>
        <Box marginLeft={2}>
          <Text color={theme.colors.primary}>safe tx import {outputFile}</Text>
        </Box>
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Export complete</Text>
      </Box>
    </Box>
  )
}
