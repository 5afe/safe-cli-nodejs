import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header } from '../components/index.js'
import { theme } from '../theme.js'

export interface ConfigInitSuccessScreenProps {
  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * ConfigInitSuccessScreen displays the success message after initializing configuration.
 * This replaces the console.log implementation in commands/config/init.ts
 *
 * Features:
 * - Shows success message
 * - Displays next steps with command examples
 * - Clean, consistent styling
 */
export function ConfigInitSuccessScreen({
  onExit,
}: ConfigInitSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Configuration Initialized Successfully!" icon={theme.icons.success} />

      {/* Next steps */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text bold>Next steps:</Text>
        </Box>

        <Box flexDirection="column" marginLeft={2}>
          <Box>
            <Text color={theme.colors.primary}>• </Text>
            <Text>
              Import a wallet: <Text bold color={theme.colors.primary}>safe wallet import</Text>
            </Text>
          </Box>
          <Box>
            <Text color={theme.colors.primary}>• </Text>
            <Text>
              View configuration: <Text bold color={theme.colors.primary}>safe config show</Text>
            </Text>
          </Box>
          <Box>
            <Text color={theme.colors.primary}>• </Text>
            <Text>
              Manage chains: <Text bold color={theme.colors.primary}>safe config chains list</Text>
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Ready to use Safe CLI!</Text>
      </Box>
    </Box>
  )
}
