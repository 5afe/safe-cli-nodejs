import React from 'react'
import { Box, Text } from 'ink'
import InkSpinner from 'ink-spinner'
import { theme } from '../theme.js'

export interface SpinnerProps {
  /**
   * Message to display next to the spinner
   */
  message?: string

  /**
   * Spinner type (from ink-spinner)
   */
  type?: 'dots' | 'dots2' | 'line' | 'simpleDotsScrolling'
}

/**
 * Spinner component for displaying loading states.
 * Replaces p.spinner() from @clack/prompts with Ink-native spinner.
 *
 * @example
 * ```tsx
 * <Spinner message="Deploying Safe..." />
 * <Spinner message="Fetching transactions..." type="dots2" />
 * ```
 */
export function Spinner({ message, type = 'dots' }: SpinnerProps): React.ReactElement {
  return (
    <Box>
      <Text color={theme.colors.primary}>
        <InkSpinner type={type} />
      </Text>
      {message && (
        <Box marginLeft={1}>
          <Text>{message}</Text>
        </Box>
      )}
    </Box>
  )
}
