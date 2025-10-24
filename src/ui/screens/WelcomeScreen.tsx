import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { theme } from '../theme.js'
import { Header } from '../components/Header.js'

interface CommandItem {
  command: string
  description: string
}

export interface WelcomeScreenProps {
  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * WelcomeScreen displays the main CLI welcome message and getting started guide.
 * This is shown when the user runs `safe` without any arguments.
 *
 * Replaces the imperative console.log implementation in cli.ts:376-391
 */
export function WelcomeScreen({ onExit }: WelcomeScreenProps): React.ReactElement {
  // Auto-exit after rendering (mimics the original behavior)
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const commands: CommandItem[] = [
    { command: 'safe config init', description: 'Initialize configuration' },
    { command: 'safe wallet import', description: 'Import a wallet' },
    { command: 'safe account create', description: 'Create a Safe' },
    { command: 'safe tx create', description: 'Create a transaction' },
    { command: 'safe --help', description: 'Show all commands' },
  ]

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Title */}
      <Header title="Safe CLI" icon={theme.icons.safe} />

      {/* Subtitle */}
      <Box marginBottom={1}>
        <Text>Modern CLI for Safe Smart Account management</Text>
      </Box>

      {/* Getting Started section */}
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text bold>Getting Started:</Text>
        </Box>
        {commands.map((item, index) => (
          <Box key={index}>
            <Box width={25} marginRight={1}>
              <Text color={theme.colors.primary}>{item.command}</Text>
            </Box>
            <Text>{item.description}</Text>
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box>
        <Text color={theme.colors.dim}>
          For more information, visit: https://github.com/safe-global/safe-cli
        </Text>
      </Box>
    </Box>
  )
}
