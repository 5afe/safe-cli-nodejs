import React from 'react'
import { Box, Text } from 'ink'
import { theme } from '../theme.js'

export interface ListProps<T> {
  /**
   * Items to display in the list
   */
  items: T[]

  /**
   * Function to render each item
   * Receives the item, index, and whether it's active
   */
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode

  /**
   * Optional ID of the currently active item
   */
  activeId?: string | number

  /**
   * Function to extract the ID from an item (required if activeId is provided)
   */
  getId?: (item: T) => string | number

  /**
   * Whether to show bullet markers
   */
  showMarkers?: boolean

  /**
   * Custom marker for active items
   */
  activeMarker?: string

  /**
   * Custom marker for inactive items
   */
  inactiveMarker?: string

  /**
   * Message to display when the list is empty
   */
  emptyMessage?: string

  /**
   * Spacing between items (0 = no spacing, 1 = default)
   */
  itemSpacing?: number
}

/**
 * List component for displaying items with optional bullet markers and active state.
 * Replaces manual console.log loops with declarative rendering.
 *
 * @example
 * ```tsx
 * <List
 *   items={wallets}
 *   activeId={activeWallet?.id}
 *   getId={(wallet) => wallet.id}
 *   renderItem={(wallet, index, isActive) => (
 *     <Box flexDirection="column">
 *       <Text bold={isActive}>{wallet.name}</Text>
 *       <Text color="dim">  {wallet.address}</Text>
 *     </Box>
 *   )}
 *   emptyMessage="No wallets found"
 * />
 * ```
 */
export function List<T>({
  items,
  renderItem,
  activeId,
  getId,
  showMarkers = true,
  activeMarker = theme.icons.activeBullet,
  inactiveMarker = theme.icons.inactiveBullet,
  emptyMessage = 'No items to display',
  itemSpacing = 1,
}: ListProps<T>): React.ReactElement {
  // Handle empty state
  if (items.length === 0) {
    return (
      <Box>
        <Text color={theme.colors.dim}>{emptyMessage}</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const itemId = getId ? getId(item) : index
        const isActive = activeId !== undefined && itemId === activeId
        const marker = isActive ? activeMarker : inactiveMarker
        const markerColor = isActive ? theme.colors.success : theme.colors.dim

        return (
          <Box key={index} marginBottom={itemSpacing}>
            {showMarkers && (
              <Box marginRight={1}>
                <Text color={markerColor}>{marker}</Text>
              </Box>
            )}
            <Box flexDirection="column">{renderItem(item, index, isActive)}</Box>
          </Box>
        )
      })}
    </Box>
  )
}
