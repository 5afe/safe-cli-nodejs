import type { ChainConfig } from '../../types/config.js'

/**
 * Test chain configurations
 */

export const TEST_CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    chainId: '1',
    name: 'Ethereum Mainnet',
    shortName: 'eth',
    rpcUrl: 'https://eth.llamarpc.com',
    currency: 'ETH',
    transactionServiceUrl: 'https://safe-transaction-mainnet.safe.global',
    explorer: 'https://etherscan.io',
  },
  sepolia: {
    chainId: '11155111',
    name: 'Sepolia',
    shortName: 'sep',
    rpcUrl: 'https://0xrpc.io/sep',
    currency: 'ETH',
    transactionServiceUrl: 'https://safe-transaction-sepolia.safe.global',
    explorer: 'https://sepolia.etherscan.io',
  },
  polygon: {
    chainId: '137',
    name: 'Polygon',
    shortName: 'matic',
    rpcUrl: 'https://polygon-rpc.com',
    currency: 'MATIC',
    transactionServiceUrl: 'https://safe-transaction-polygon.safe.global',
    explorer: 'https://polygonscan.com',
  },
  arbitrum: {
    chainId: '42161',
    name: 'Arbitrum One',
    shortName: 'arb1',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    currency: 'ETH',
    transactionServiceUrl: 'https://safe-transaction-arbitrum.safe.global',
    explorer: 'https://arbiscan.io',
  },
  optimism: {
    chainId: '10',
    name: 'Optimism',
    shortName: 'oeth',
    rpcUrl: 'https://mainnet.optimism.io',
    currency: 'ETH',
    transactionServiceUrl: 'https://safe-transaction-optimism.safe.global',
    explorer: 'https://optimistic.etherscan.io',
  },
  base: {
    chainId: '8453',
    name: 'Base',
    shortName: 'base',
    rpcUrl: 'https://mainnet.base.org',
    currency: 'ETH',
    transactionServiceUrl: 'https://safe-transaction-base.safe.global',
    explorer: 'https://basescan.org',
  },
  gnosis: {
    chainId: '100',
    name: 'Gnosis Chain',
    shortName: 'gno',
    rpcUrl: 'https://rpc.gnosischain.com',
    currency: 'xDAI',
    transactionServiceUrl: 'https://safe-transaction-gnosis-chain.safe.global',
    explorer: 'https://gnosisscan.io',
  },
  // Local test chain
  localhost: {
    chainId: '31337',
    name: 'Localhost',
    shortName: 'local',
    rpcUrl: 'http://127.0.0.1:8545',
    currency: 'ETH',
    explorer: 'http://localhost:8545',
  },
}

/**
 * Get test chain by name
 */
export function getTestChain(name: keyof typeof TEST_CHAINS): ChainConfig {
  return TEST_CHAINS[name]
}

/**
 * Get test chain by chain ID
 */
export function getTestChainById(chainId: string): ChainConfig | undefined {
  return Object.values(TEST_CHAINS).find((chain) => chain.chainId === chainId)
}

/**
 * Invalid chain configurations for negative testing
 */
export const INVALID_CHAINS = {
  missingChainId: {
    name: 'Invalid Chain',
    shortName: 'inv',
    rpcUrl: 'https://example.com',
    explorer: 'https://example.com',
  },
  missingRpcUrl: {
    chainId: '999',
    name: 'Invalid Chain',
    shortName: 'inv',
    explorer: 'https://example.com',
  },
  invalidRpcUrl: {
    chainId: '999',
    name: 'Invalid Chain',
    shortName: 'inv',
    rpcUrl: 'not-a-url',
    explorer: 'https://example.com',
  },
}
