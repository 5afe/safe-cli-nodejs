#!/usr/bin/env node
/**
 * Component Demo - Demonstrates all UI components
 * Run with: tsx src/ui/examples/component-demo.tsx
 *
 * This file is for development/testing only and showcases:
 * - Header component
 * - Table component
 * - List component
 * - KeyValue component
 * - StatusBadge component
 * - Spinner component
 * - WelcomeScreen
 */

import React from 'react'
import { Box, Text } from 'ink'
import { renderScreen } from '../render.js'
import { Header, Table, List, KeyValue, StatusBadge, Spinner } from '../components/index.js'
import { WelcomeScreen } from '../screens/index.js'
import { theme } from '../theme.js'

interface DemoItem {
  id: number
  name: string
  value: number
  status: string
}

function ComponentDemo(): React.ReactElement {
  // Sample data for demonstrations
  const tableData: DemoItem[] = [
    { id: 1, name: 'Item Alpha', value: 100, status: 'active' },
    { id: 2, name: 'Item Beta', value: 250, status: 'pending' },
    { id: 3, name: 'Item Gamma', value: 75, status: 'active' },
  ]

  const listData = [
    { id: 'wallet-1', name: 'Main Wallet', address: '0x1234...5678' },
    { id: 'wallet-2', name: 'Trading Wallet', address: '0xabcd...efgh' },
    { id: 'wallet-3', name: 'Cold Storage', address: '0x9999...0000' },
  ]

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header Demo */}
      <Header title="Component Library Demo" icon="🎨" />
      <Box marginBottom={1} />

      {/* StatusBadge Demo */}
      <Box flexDirection="column" marginBottom={2}>
        <Text bold color={theme.colors.primary}>
          Status Badges:
        </Text>
        <Box marginBottom={1} />
        <StatusBadge type="success" message="Operation completed successfully" />
        <StatusBadge type="error" message="Failed to connect to network" />
        <StatusBadge type="warning" message="Your balance is low" />
        <StatusBadge type="info" message="Processing transaction..." />
      </Box>

      {/* Table Demo */}
      <Box flexDirection="column" marginBottom={2}>
        <Header title="Table Component" />
        <Table
          columns={[
            { header: 'ID', accessor: (row) => row.id, width: 5, align: 'right' },
            { header: 'Name', accessor: (row) => row.name, width: 15 },
            { header: 'Value', accessor: (row) => row.value, align: 'right' },
            { header: 'Status', accessor: (row) => row.status, color: theme.colors.success },
          ]}
          data={tableData}
        />
      </Box>

      {/* List Demo */}
      <Box flexDirection="column" marginBottom={2}>
        <Header title="List Component" />
        <List
          items={listData}
          activeId="wallet-2"
          getId={(item) => item.id}
          renderItem={(item, _index, isActive) => (
            <Box flexDirection="column">
              <Text bold={isActive} color={isActive ? theme.colors.success : undefined}>
                {item.name}
              </Text>
              <Text color={theme.colors.dim}>  Address: {item.address}</Text>
            </Box>
          )}
        />
      </Box>

      {/* KeyValue Demo */}
      <Box flexDirection="column" marginBottom={2}>
        <KeyValue
          title="Configuration Details"
          titleIcon={theme.icons.safe}
          items={[
            { key: 'Chain', value: 'Ethereum Mainnet' },
            { key: 'Network ID', value: '1', valueColor: theme.colors.primary },
            { key: 'RPC URL', value: 'https://eth.llamarpc.com' },
            { key: 'Status', value: 'Connected', valueColor: theme.colors.success, separator: true },
            { key: 'Block Number', value: '19234567' },
            { key: 'Gas Price', value: '25 gwei' },
          ]}
        />
      </Box>

      {/* Spinner Demo */}
      <Box flexDirection="column" marginBottom={2}>
        <Header title="Spinner Component" />
        <Spinner message="Loading data from blockchain..." />
      </Box>

      {/* Empty List Demo */}
      <Box flexDirection="column" marginBottom={2}>
        <Header title="Empty List" />
        <List
          items={[]}
          renderItem={() => null}
          emptyMessage="No wallets found. Import one to get started."
        />
      </Box>
    </Box>
  )
}

// Main execution
async function main() {
  console.log('=== Component Demo ===\n')

  await renderScreen(ComponentDemo, {})

  console.log('\n=== WelcomeScreen Demo ===\n')

  await renderScreen(WelcomeScreen, {})

  console.log('\n=== Demo Complete ===')
}

main().catch(console.error)
