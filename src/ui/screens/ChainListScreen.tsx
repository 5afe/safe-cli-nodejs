import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header } from '../components/index.js'
import { theme } from '../theme.js'
import type { ChainConfig } from '../../types/config.js'

export interface ChainListScreenProps {
  /**
   * List of configured chains
   */
  chains: ChainConfig[]

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * ChainListScreen displays all configured chains.
 * This replaces the console.log implementation in commands/config/chains.ts
 *
 * Features:
 * - Shows all chain details
 * - Clean, consistent formatting
 */
export function ChainListScreen({ chains, onExit }: ChainListScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  if (chains.length === 0) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Header title="Configured Chains" />
        <Box marginBottom={1}>
          <Text color={theme.colors.dim}>No chains configured</Text>
        </Box>
        <Box>
          <Text color={theme.colors.info}>Use "safe config chains add" to add a chain</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Configured Chains" />

      {/* Chain list */}
      <Box flexDirection="column" marginBottom={1}>
        {chains.map((chain, index) => (
          <Box key={chain.chainId} flexDirection="column" marginBottom={index < chains.length - 1 ? 1 : 0}>
            <Box>
              <Text color={theme.colors.primary}>● </Text>
              <Text bold>{chain.name} </Text>
              <Text color={theme.colors.dim}>(Chain ID: {chain.chainId})</Text>
            </Box>
            <Box marginLeft={2} flexDirection="column">
              <Box>
                <Text color={theme.colors.dim}>Short name: </Text>
                <Text color={theme.colors.primary}>{chain.shortName}</Text>
              </Box>
              <Box>
                <Text color={theme.colors.dim}>RPC: </Text>
                <Text>{chain.rpcUrl}</Text>
              </Box>
              {chain.explorer && (
                <Box>
                  <Text color={theme.colors.dim}>Explorer: </Text>
                  <Text>{chain.explorer}</Text>
                </Box>
              )}
              <Box>
                <Text color={theme.colors.dim}>Currency: </Text>
                <Text>{chain.currency}</Text>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Summary */}
      <Box>
        <Text color={theme.colors.success}>Total: {chains.length} chain(s) configured</Text>
      </Box>
    </Box>
  )
}
