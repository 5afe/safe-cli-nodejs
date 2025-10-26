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
    transactionServiceUrl: 'https://safe-transaction-mainnet.safe.global',
    explorerUrl: 'https://etherscan.io',
  },
  sepolia: {
    chainId: '11155111',
    name: 'Sepolia',
    shortName: 'sep',
    rpcUrl: 'https://rpc.sepolia.org',
    transactionServiceUrl: 'https://safe-transaction-sepolia.safe.global',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  polygon: {
    chainId: '137',
    name: 'Polygon',
    shortName: 'matic',
    rpcUrl: 'https://polygon-rpc.com',
    transactionServiceUrl: 'https://safe-transaction-polygon.safe.global',
    explorerUrl: 'https://polygonscan.com',
  },
  arbitrum: {
    chainId: '42161',
    name: 'Arbitrum One',
    shortName: 'arb1',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    transactionServiceUrl: 'https://safe-transaction-arbitrum.safe.global',
    explorerUrl: 'https://arbiscan.io',
  },
  optimism: {
    chainId: '10',
    name: 'Optimism',
    shortName: 'oeth',
    rpcUrl: 'https://mainnet.optimism.io',
    transactionServiceUrl: 'https://safe-transaction-optimism.safe.global',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  base: {
    chainId: '8453',
    name: 'Base',
    shortName: 'base',
    rpcUrl: 'https://mainnet.base.org',
    transactionServiceUrl: 'https://safe-transaction-base.safe.global',
    explorerUrl: 'https://basescan.org',
  },
  gnosis: {
    chainId: '100',
    name: 'Gnosis Chain',
    shortName: 'gno',
    rpcUrl: 'https://rpc.gnosischain.com',
    transactionServiceUrl: 'https://safe-transaction-gnosis-chain.safe.global',
    explorerUrl: 'https://gnosisscan.io',
  },
  // Local test chain
  localhost: {
    chainId: '31337',
    name: 'Localhost',
    shortName: 'local',
    rpcUrl: 'http://127.0.0.1:8545',
    explorerUrl: 'http://localhost:8545',
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
    explorerUrl: 'https://example.com',
  },
  missingRpcUrl: {
    chainId: '999',
    name: 'Invalid Chain',
    shortName: 'inv',
    explorerUrl: 'https://example.com',
  },
  invalidRpcUrl: {
    chainId: '999',
    name: 'Invalid Chain',
    shortName: 'inv',
    rpcUrl: 'not-a-url',
    explorerUrl: 'https://example.com',
  },
}
