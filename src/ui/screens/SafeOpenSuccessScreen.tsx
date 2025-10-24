import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, KeyValue } from '../components/index.js'
import { theme } from '../theme.js'

export interface SafeOpenSuccessScreenProps {
  /**
   * Safe name
   */
  name: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * SafeOpenSuccessScreen displays success message after adding an existing Safe to workspace.
 * This replaces the console.log implementation in commands/account/open.ts
 *
 * Features:
 * - Shows Safe name
 * - Clean, consistent styling
 */
export function SafeOpenSuccessScreen({
  name,
  onExit,
}: SafeOpenSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Safe Added to Workspace!" icon={theme.icons.success} />

      {/* Safe details */}
      <Box flexDirection="column" marginBottom={1}>
        <KeyValue items={[{ key: 'Name', value: name }]} />
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Safe ready to use</Text>
      </Box>
    </Box>
  )
}
