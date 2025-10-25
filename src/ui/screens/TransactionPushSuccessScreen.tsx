import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import { Header, KeyValue, List } from '../components/index.js'
import { theme } from '../theme.js'
import type { Address } from 'viem'

export interface TransactionPushSuccessScreenProps {
  /**
   * Transaction hash (safeTxHash)
   */
  safeTxHash: string

  /**
   * Safe address in EIP-3770 format
   */
  safeEip3770: string

  /**
   * Push mode: 'proposed' for new transaction, 'updated' for adding signatures
   */
  mode: 'proposed' | 'updated'

  /**
   * List of signer addresses that were pushed
   */
  signers: Address[]

  /**
   * Safe Wallet app URL for viewing the transaction
   */
  serviceUrl: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionPushSuccessScreen displays success message after pushing to Safe API.
 * This replaces the console.log implementation in commands/tx/push.ts
 *
 * Features:
 * - Shows transaction hash and Safe
 * - Displays mode (proposed new or updated existing)
 * - Lists pushed signers
 * - Shows Safe Wallet app URL
 */
export function TransactionPushSuccessScreen({
  safeTxHash,
  safeEip3770,
  mode,
  signers,
  serviceUrl,
  onExit,
}: TransactionPushSuccessScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const modeText = mode === 'proposed' ? 'Transaction Proposed' : 'Signatures Added'
  const modeColor = mode === 'proposed' ? theme.colors.success : theme.colors.info

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Push Complete" icon={theme.icons.success} />

      <Box flexDirection="column" marginBottom={1}>
        <KeyValue
          items={[
            { key: 'Safe TX Hash', value: safeTxHash, valueColor: theme.colors.primary },
            { key: 'Safe', value: safeEip3770 },
            { key: 'Status', value: modeText, valueColor: modeColor },
          ]}
        />
      </Box>

      {/* Pushed signers */}
      {signers.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Pushed {signers.length} signature{signers.length !== 1 ? 's' : ''}:
          </Text>
          <List
            items={signers.map((signer) => ({
              label: signer,
              icon: theme.icons.success,
              iconColor: theme.colors.success,
            }))}
            renderItem={(item) => (
              <Text>
                <Text color={item.iconColor}>{item.icon}</Text> {item.label}
              </Text>
            )}
          />
        </Box>
      )}

      {/* Service URL */}
      <Box flexDirection="column">
        <Text color={theme.colors.dim}>View in Safe Wallet:</Text>
        <Text color={theme.colors.info}>{serviceUrl}</Text>
      </Box>
    </Box>
  )
}
