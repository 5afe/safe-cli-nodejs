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
 * Styled to match @clack/prompts visual style for consistency.
 *
 * @example
 * ```tsx
 * <Spinner message="Deploying Safe..." />
 * <Spinner message="Fetching transactions..." />
 * ```
 */
export function Spinner({ message, type = 'dots' }: SpinnerProps): React.ReactElement {
  return (
    <Box>
      <Text color={theme.colors.dim}>
        <InkSpinner type={type} />
      </Text>
      {message && (
        <Box marginLeft={1}>
          <Text color={theme.colors.dim}>{message}</Text>
        </Box>
      )}
    </Box>
  )
}
