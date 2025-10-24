import React, { useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Address } from 'viem'
import { Header, KeyValue, List } from '../components/index.js'
import { theme } from '../theme.js'

export interface TransactionStatusScreenProps {
  /**
   * Safe transaction hash
   */
  safeTxHash: string

  /**
   * Safe address (EIP-3770 format)
   */
  safeEip3770: string

  /**
   * Transaction destination address
   */
  to: string

  /**
   * Transaction value in wei
   */
  value: string

  /**
   * Transaction nonce
   */
  nonce: number

  /**
   * Transaction status
   */
  status: string

  /**
   * Signatures collected
   */
  signaturesCollected: number

  /**
   * Signatures required
   */
  signaturesRequired: number

  /**
   * List of signers
   */
  signers: Address[]

  /**
   * Safe owners
   */
  owners: Address[]

  /**
   * Blockchain transaction hash (if executed)
   */
  txHash?: string

  /**
   * Explorer URL (if available)
   */
  explorerUrl?: string

  /**
   * Optional callback when the screen is ready to exit
   */
  onExit?: () => void
}

/**
 * TransactionStatusScreen displays detailed transaction status information.
 * This replaces the console.log implementation in commands/tx/status.ts
 *
 * Features:
 * - Shows transaction details and signature progress
 * - Lists signers and awaiting owners
 * - Displays next steps based on status
 * - Shows execution details if available
 */
export function TransactionStatusScreen({
  safeTxHash,
  safeEip3770,
  to,
  value,
  nonce,
  status,
  signaturesCollected,
  signaturesRequired,
  signers,
  owners,
  txHash,
  explorerUrl,
  onExit,
}: TransactionStatusScreenProps): React.ReactElement {
  // Auto-exit after rendering
  useEffect(() => {
    if (onExit) {
      onExit()
    }
  }, [onExit])

  const isReadyToExecute = signaturesCollected >= signaturesRequired
  const unsignedOwners = owners.filter(
    (owner) => !signers.some((signer) => signer.toLowerCase() === owner.toLowerCase())
  )

  return (
    <Box flexDirection="column" paddingY={1}>
      <Header title="Transaction Status" />

      {/* Transaction details */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Transaction Details:
        </Text>
        <KeyValue
          items={[
            { key: 'Safe TX Hash', value: safeTxHash },
            { key: 'Safe', value: safeEip3770 },
            { key: 'To', value: to },
            { key: 'Value', value: `${value} wei` },
            { key: 'Nonce', value: nonce.toString() },
            { key: 'Status', value: status, valueColor: theme.colors.info },
          ]}
        />
      </Box>

      {/* Signature status */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Signature Status:
        </Text>
        <Box marginLeft={2}>
          {isReadyToExecute ? (
            <Text color={theme.colors.success}>
              ✓ {signaturesCollected}/{signaturesRequired} signatures collected - Ready to execute!
            </Text>
          ) : (
            <Text color={theme.colors.warning}>
              ⚠ {signaturesCollected}/{signaturesRequired} signatures collected - Need{' '}
              {signaturesRequired - signaturesCollected} more
            </Text>
          )}
        </Box>
      </Box>

      {/* Signatures collected */}
      {signers.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Signatures:
          </Text>
          <List
            items={signers.map((signer) => {
              const isOwner = owners.some((owner) => owner.toLowerCase() === signer.toLowerCase())
              return {
                label: signer,
                marker: isOwner ? '✓' : '✗',
                markerColor: isOwner ? theme.colors.success : theme.colors.error,
              }
            })}
          />
        </Box>
      )}

      {/* Awaiting signatures */}
      {unsignedOwners.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Awaiting signatures from:
          </Text>
          <List
            items={unsignedOwners.map((owner) => ({
              label: owner,
              marker: '○',
              markerColor: theme.colors.dim,
            }))}
          />
        </Box>
      )}

      {/* Next steps */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={theme.colors.primary}>
          Next steps:
        </Text>
        <Box marginLeft={2} flexDirection="column">
          {isReadyToExecute ? (
            <Text color={theme.colors.primary}>safe tx execute {safeTxHash}</Text>
          ) : (
            <>
              <Text color={theme.colors.primary}>safe tx sign {safeTxHash} (if you're an owner)</Text>
              <Text color={theme.colors.primary}>safe tx export {safeTxHash} (share with other owners)</Text>
            </>
          )}
        </Box>
      </Box>

      {/* Execution details */}
      {txHash && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color={theme.colors.primary}>
            Execution:
          </Text>
          <KeyValue
            items={[
              { key: 'TX Hash', value: txHash },
              ...(explorerUrl ? [{ key: 'Explorer', value: explorerUrl }] : []),
            ]}
          />
        </Box>
      )}

      {/* Success message */}
      <Box>
        <Text color={theme.colors.success}>Status displayed</Text>
      </Box>
    </Box>
  )
}
