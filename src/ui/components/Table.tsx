import React from 'react'
import { Box, Text } from 'ink'
import { theme } from '../theme.js'

export interface TableColumn<T> {
  /**
   * Column header text
   */
  header: string

  /**
   * Function to extract the cell value from a row
   */
  accessor: (row: T) => string | number | React.ReactNode

  /**
   * Optional column width (defaults to auto)
   */
  width?: number

  /**
   * Optional text alignment (defaults to 'left')
   */
  align?: 'left' | 'right' | 'center'

  /**
   * Optional color for the column values
   */
  color?: string
}

export interface TableProps<T> {
  /**
   * Column definitions
   */
  columns: TableColumn<T>[]

  /**
   * Data rows to display
   */
  data: T[]

  /**
   * Whether to show the header row
   */
  showHeader?: boolean
}

/**
 * Helper function to convert value to string for width calculation
 */
function toString(value: string | number | React.ReactNode): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return '' // React nodes don't have a reliable string length
}

/**
 * Helper function to align text within a given width
 */
function alignText(text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const textLength = text.length
  if (textLength >= width) return text

  const padding = width - textLength
  switch (align) {
    case 'right':
      return ' '.repeat(padding) + text
    case 'center': {
      const leftPadding = Math.floor(padding / 2)
      const rightPadding = padding - leftPadding
      return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding)
    }
    case 'left':
    default:
      return text + ' '.repeat(padding)
  }
}

/**
 * Table component for displaying tabular data with aligned columns.
 * Replaces manual console.log formatting with aligned output.
 *
 * @example
 * ```tsx
 * <Table
 *   columns={[
 *     { header: 'Name', accessor: (row) => row.name },
 *     { header: 'Address', accessor: (row) => row.address, width: 42 },
 *     { header: 'Balance', accessor: (row) => row.balance, align: 'right' },
 *   ]}
 *   data={accounts}
 * />
 * ```
 */
export function Table<T>({
  columns,
  data,
  showHeader = true,
}: TableProps<T>): React.ReactElement {
  // Calculate column widths if not specified
  const columnWidths = columns.map((column) => {
    if (column.width) return column.width

    // Calculate width based on header and data
    const headerLength = column.header.length
    const maxDataLength = Math.max(
      ...data.map((row) => {
        const value = column.accessor(row)
        return toString(value).length
      }),
      0
    )

    return Math.max(headerLength, maxDataLength) + 2 // Add padding
  })

  return (
    <Box flexDirection="column">
      {showHeader && (
        <Box marginBottom={1}>
          {columns.map((column, index) => {
            const width = columnWidths[index]
            const alignedHeader = alignText(column.header, width, 'left')
            return (
              <Box key={index} width={width} marginRight={1}>
                <Text bold color={theme.colors.primary}>
                  {alignedHeader}
                </Text>
              </Box>
            )
          })}
        </Box>
      )}
      {data.map((row, rowIndex) => (
        <Box key={rowIndex}>
          {columns.map((column, colIndex) => {
            const width = columnWidths[colIndex]
            const value = column.accessor(row)
            const stringValue = toString(value)
            const alignedValue = alignText(stringValue, width, column.align)

            return (
              <Box key={colIndex} width={width} marginRight={1}>
                <Text color={column.color}>{alignedValue}</Text>
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}
