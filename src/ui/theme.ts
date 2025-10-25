/**
 * Theme configuration for Safe CLI UI components.
 * Defines colors, spacing, and styling constants used throughout the application.
 */

export const theme = {
  /**
   * Color palette matching the existing picocolors usage in the CLI
   */
  colors: {
    primary: '#00D9FF', // cyan - primary brand color
    success: '#00FF88', // green - success states, confirmations
    error: '#FF5555', // red - errors, warnings
    warning: '#FFAA00', // yellow - caution messages
    info: '#5599FF', // blue - informational messages
    dim: '#666666', // gray - secondary text, labels
    white: '#FFFFFF', // white - primary text
    black: '#000000', // black - backgrounds, emphasis
  },

  /**
   * Spacing values for consistent layout
   * Values represent the number of blank lines/spaces
   */
  spacing: {
    none: 0,
    small: 1,
    medium: 2,
    large: 3,
  },

  /**
   * Icons and symbols used in the UI
   */
  icons: {
    safe: '🔐',
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    bullet: '•',
    activeBullet: '●',
    inactiveBullet: '○',
    arrow: '→',
    check: '✓',
  },

  /**
   * Text formatting presets
   */
  text: {
    bold: true,
    dim: true,
    italic: false,
  },
} as const

/**
 * Type-safe access to theme values
 */
export type Theme = typeof theme
export type ThemeColor = keyof typeof theme.colors
export type ThemeSpacing = keyof typeof theme.spacing
export type ThemeIcon = keyof typeof theme.icons
