import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header } from '../components/index.js'
import { theme } from '../theme.js'

export interface ChainEditSuccessScreenProps {
  /**
   * Number of chains added
   */
  added: number

  /**
   * Number of chains modified
   */
  modified: number

  /**
   * Number of chains removed
   */
  removed: number

  /**
   * Names of added chains
   */
  addedNames?: string[]

  /**
   * Names of modified chains
   */
  modifiedNames?: string[]

  /**
   * Names of removed chains
   */
  removedNames?: string[]

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * ChainEditSuccessScreen displays success message after editing chain configuration.
 * This replaces the console.log implementation in commands/config/edit.ts
 *
 * Features:
 * - Shows what changed (added/modified/removed)
 * - Displays chain names for each category
 * - Clean, consistent styling
 */
export function ChainEditSuccessScreen({
  added,
  modified,
  removed,
  addedNames = [],
  modifiedNames = [],
  removedNames = [],
  onExit,
}: ChainEditSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const hasChanges = added > 0 || modified > 0 || removed > 0

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Configuration Saved" icon={theme.icons.success} />

      {hasChanges && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Changes detected:
          </Text>

          {added > 0 && addedNames.length > 0 && (
            <Box marginLeft={2}>
              <Text color={theme.colors.success}>Added: </Text>
              <Text>{addedNames.join(', ')}</Text>
            </Box>
          )}

          {modified > 0 && modifiedNames.length > 0 && (
            <Box marginLeft={2}>
              <Text color={theme.colors.info}>Modified: </Text>
              <Text>{modifiedNames.join(', ')}</Text>
            </Box>
          )}

          {removed > 0 && removedNames.length > 0 && (
            <Box marginLeft={2}>
              <Text color={theme.colors.warning}>Removed: </Text>
              <Text>{removedNames.join(', ')}</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Summary */}
      <Box>
        <Text color={theme.colors.success}>
          Updated {added + modified} chain(s)
          {removed > 0 && `, removed ${removed}`}
        </Text>
      </Box>
    </Box>
  )
}
