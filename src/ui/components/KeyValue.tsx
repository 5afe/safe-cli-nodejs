import React from 'react'
import { Box, Text } from 'ink'
import { theme } from '../theme.js'

export interface KeyValueItem {
  /**
   * The label/key to display
   */
  key: string

  /**
   * The value to display
   */
  value: string | number | React.ReactNode

  /**
   * Optional custom color for the value
   */
  valueColor?: string

  /**
   * Optional custom color for the key
   */
  keyColor?: string

  /**
   * Whether this item should be visually separated from the next one
   */
  separator?: boolean
}

export interface KeyValueProps {
  /**
   * Array of key-value pairs to display
   */
  items: KeyValueItem[]

  /**
   * Width of the key column (defaults to auto-calculated)
   */
  keyWidth?: number

  /**
   * Whether to show a title above the key-value pairs
   */
  title?: string

  /**
   * Optional icon to show next to the title
   */
  titleIcon?: string

  /**
   * Indentation level (0 = no indent, 1 = 2 spaces, 2 = 4 spaces, etc.)
   */
  indent?: number
}

/**
 * KeyValue component for displaying label-value pairs in a consistent format.
 * Replaces manual console.log formatting with aligned key-value output.
 *
 * @example
 * ```tsx
 * <KeyValue
 *   title="Safe Configuration"
 *   items={[
 *     { key: 'Chain', value: 'Ethereum Mainnet' },
 *     { key: 'Address', value: '0x123...abc' },
 *     { key: 'Threshold', value: '2/3', valueColor: theme.colors.success },
 *   ]}
 * />
 * ```
 */
export function KeyValue({
  items,
  keyWidth,
  title,
  titleIcon,
  indent = 0,
}: KeyValueProps): React.ReactElement {
  // Calculate max key width if not provided (including the colon)
  const maxKeyWidth =
    keyWidth || Math.max(...items.map((item) => item.key.length)) + 2

  const indentSpaces = ' '.repeat(indent * 2)

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          {titleIcon && <Text>{titleIcon} </Text>}
          <Text bold color={theme.colors.primary}>
            {title}
          </Text>
        </Box>
      )}
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <Box marginBottom={0}>
            {indent > 0 && <Text>{indentSpaces}</Text>}
            <Box width={maxKeyWidth} marginRight={1}>
              <Text color={item.keyColor || theme.colors.dim}>
                {item.key}:
              </Text>
            </Box>
            <Box>
              <Text color={item.valueColor}>{item.value}</Text>
            </Box>
          </Box>
          {item.separator && index < items.length - 1 && (
            <Box marginBottom={1} />
          )}
        </React.Fragment>
      ))}
    </Box>
  )
}
