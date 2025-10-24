import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header } from '../components/index.js'
import { theme } from '../theme.js'

export interface TransactionSyncSuccessScreenProps {
  /**
   * Safe address in EIP-3770 format
   */
  safeEip3770: string

  /**
   * Number of transactions pulled (imported) from API
   */
  pullImported: number

  /**
   * Number of transactions updated with new signatures from API
   */
  pullUpdated: number

  /**
   * Number of transactions proposed (pushed) to API
   */
  pushProposed: number

  /**
   * Number of transactions updated with new signatures on API
   */
  pushUpdated: number

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionSyncSuccessScreen displays results after two-way sync with Safe API.
 * This replaces the console.log implementation in commands/tx/sync.ts
 *
 * Features:
 * - Shows pull statistics (imported, updated)
 * - Shows push statistics (proposed, updated)
 * - Displays summary with directional indicators
 * - Color-coded success indicators
 */
export function TransactionSyncSuccessScreen({
  safeEip3770,
  pullImported,
  pullUpdated,
  pushProposed,
  pushUpdated,
  onExit,
}: TransactionSyncSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const totalPull = pullImported + pullUpdated
  const totalPush = pushProposed + pushUpdated
  const hasChanges = totalPull > 0 || totalPush > 0

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Sync Complete" icon={theme.icons.success} />

      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.colors.dim}>Safe: </Text>
        <Text color={theme.colors.primary}>{safeEip3770}</Text>
      </Box>

      {hasChanges ? (
        <Box flexDirection="column">
          {/* Pull results */}
          {totalPull > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color={theme.colors.primary}>
                ↓ Pull from API:
              </Text>
              <Box flexDirection="column" marginLeft={2} marginTop={1}>
                {pullImported > 0 && (
                  <Text color={theme.colors.success}>Imported: {pullImported} transaction{pullImported !== 1 ? 's' : ''}</Text>
                )}
                {pullUpdated > 0 && (
                  <Text color={theme.colors.info}>Updated: {pullUpdated} transaction{pullUpdated !== 1 ? 's' : ''}</Text>
                )}
              </Box>
            </Box>
          )}

          {/* Push results */}
          {totalPush > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color={theme.colors.primary}>
                ↑ Push to API:
              </Text>
              <Box flexDirection="column" marginLeft={2} marginTop={1}>
                {pushProposed > 0 && (
                  <Text color={theme.colors.success}>Proposed: {pushProposed} transaction{pushProposed !== 1 ? 's' : ''}</Text>
                )}
                {pushUpdated > 0 && (
                  <Text color={theme.colors.info}>Updated: {pushUpdated} transaction{pushUpdated !== 1 ? 's' : ''}</Text>
                )}
              </Box>
            </Box>
          )}

          {/* Summary */}
          <Box flexDirection="column">
            <Text bold color={theme.colors.primary}>
              Summary:
            </Text>
            <Box flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color={theme.colors.success}>
                ↓ Pulled: {pullImported} new, {pullUpdated} updated
              </Text>
              <Text color={theme.colors.success}>
                ↑ Pushed: {pushProposed} new, {pushUpdated} updated
              </Text>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box>
          <Text color={theme.colors.dim}>
            No changes - local and remote are in sync
          </Text>
        </Box>
      )}
    </Box>
  )
}
