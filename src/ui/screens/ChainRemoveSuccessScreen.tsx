import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header } from '../components/index.js'
import { theme } from '../theme.js'

export interface ChainRemoveSuccessScreenProps {
  /**
   * Name of the removed chain
   */
  chainName: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * ChainRemoveSuccessScreen displays success message after removing a chain.
 * This replaces the p.outro implementation in commands/config/chains.ts
 *
 * Features:
 * - Shows confirmation of chain removal
 * - Clean, consistent styling
 */
export function ChainRemoveSuccessScreen({
  chainName,
  onExit,
}: ChainRemoveSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Chain Removed Successfully" icon={theme.icons.success} />

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>
          Chain "{chainName}" has been removed
        </Text>
      </Box>
    </Box>
  )
}
