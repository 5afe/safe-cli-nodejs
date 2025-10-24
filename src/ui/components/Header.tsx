import React from 'react'
import { Box, Text } from 'ink'
import { theme } from '../theme.js'

export interface HeaderProps {
  /**
   * The title text to display in the header
   */
  title: string

  /**
   * Optional icon to display before the title
   */
  icon?: string

  /**
   * Optional subtitle to display below the title
   */
  subtitle?: string
}

/**
 * Header component for displaying titles and section headers.
 * Used at the top of screens or to separate sections.
 *
 * @example
 * ```tsx
 * <Header title="Safe Accounts" icon="🔐" />
 * <Header title="Configuration" subtitle="Current settings" />
 * ```
 */
export function Header({ title, icon, subtitle }: HeaderProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        {icon && (
          <Text>
            {icon}{' '}
          </Text>
        )}
        <Text bold color={theme.colors.primary}>
          {title}
        </Text>
      </Box>
      {subtitle && (
        <Text color={theme.colors.dim}>{subtitle}</Text>
      )}
    </Box>
  )
}
