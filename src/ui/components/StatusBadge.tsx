import React from 'react'
import { Box, Text } from 'ink'
import { theme } from '../theme.js'

export type StatusType = 'success' | 'error' | 'warning' | 'info'

export interface StatusBadgeProps {
  /**
   * The type of status to display
   */
  type: StatusType

  /**
   * The message to display
   */
  message: string

  /**
   * Optional custom icon (defaults to type-specific icon)
   */
  icon?: string
}

/**
 * StatusBadge component for displaying status messages with appropriate colors and icons.
 * Replaces manual p.log.success/error/warning/info calls.
 *
 * @example
 * ```tsx
 * <StatusBadge type="success" message="Safe created successfully!" />
 * <StatusBadge type="error" message="Failed to deploy Safe" />
 * <StatusBadge type="warning" message="Private key will be encrypted" />
 * <StatusBadge type="info" message="Connecting to Ethereum node..." />
 * ```
 */
export function StatusBadge({
  type,
  message,
  icon,
}: StatusBadgeProps): React.ReactElement {
  const config = {
    success: {
      color: theme.colors.success,
      icon: theme.icons.success,
    },
    error: {
      color: theme.colors.error,
      icon: theme.icons.error,
    },
    warning: {
      color: theme.colors.warning,
      icon: theme.icons.warning,
    },
    info: {
      color: theme.colors.info,
      icon: theme.icons.info,
    },
  }

  const { color, icon: defaultIcon } = config[type]
  const displayIcon = icon || defaultIcon

  return (
    <Box>
      <Text color={color}>
        {displayIcon} {message}
      </Text>
    </Box>
  )
}
