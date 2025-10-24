import { vi } from 'vitest'
import type { ConfigStore } from '../../storage/config-store.js'
import type { WalletStore } from '../../storage/wallet-store.js'
import type { SafeStore } from '../../storage/safe-store.js'

/**
 * Mock implementations for storage layers
 */

export function createMockConfigStore(): any {
  return {
    getConfig: vi.fn().mockReturnValue({
      chains: {
        '1': {
          chainId: '1',
          name: 'Ethereum',
          rpcUrl: 'https://eth.llamarpc.com',
          currency: 'ETH',
          explorer: 'https://etherscan.io',
        },
        '11155111': {
          chainId: '11155111',
          name: 'Sepolia',
          rpcUrl: 'https://rpc.sepolia.org',
          currency: 'ETH',
          explorer: 'https://sepolia.etherscan.io',
        },
      },
      preferences: {
        autoUpdate: true,
      },
    }),
    getAllChains: vi.fn().mockReturnValue({
      '1': {
        chainId: '1',
        name: 'Ethereum',
        rpcUrl: 'https://eth.llamarpc.com',
        currency: 'ETH',
        explorer: 'https://etherscan.io',
      },
      '11155111': {
        chainId: '11155111',
        name: 'Sepolia',
        rpcUrl: 'https://rpc.sepolia.org',
        currency: 'ETH',
        explorer: 'https://sepolia.etherscan.io',
      },
    }),
    getChain: vi.fn().mockImplementation((chainId: string) => {
      const chains: any = {
        '1': {
          chainId: '1',
          name: 'Ethereum',
          rpcUrl: 'https://eth.llamarpc.com',
          currency: 'ETH',
          explorer: 'https://etherscan.io',
        },
        '11155111': {
          chainId: '11155111',
          name: 'Sepolia',
          rpcUrl: 'https://rpc.sepolia.org',
          currency: 'ETH',
          explorer: 'https://sepolia.etherscan.io',
        },
      }
      return chains[chainId]
    }),
    setChain: vi.fn(),
    deleteChain: vi.fn(),
    chainExists: vi.fn().mockReturnValue(false),
    getPreferences: vi.fn().mockReturnValue({ autoUpdate: true }),
    setPreference: vi.fn(),
    getConfigPath: vi.fn().mockReturnValue('/mock/config/path'),
  }
}

export function createMockWalletStorage(): any {
  return {
    importWallet: vi.fn(),
    getAllWallets: vi.fn().mockReturnValue([]),
    getActiveWallet: vi.fn().mockReturnValue(null),
    setActiveWallet: vi.fn(),
    removeWallet: vi.fn(),
    getPrivateKey: vi.fn(),
    setPassword: vi.fn(),
    getWallet: vi.fn(),
  }
}

export function createMockSafeStorage(): any {
  return {
    createSafe: vi.fn(),
    getAllSafes: vi.fn().mockReturnValue([]),
    getSafe: vi.fn(),
    getSafesByChain: vi.fn().mockReturnValue([]),
    getActiveSafe: vi.fn().mockReturnValue(undefined),
    setActiveSafe: vi.fn(),
    clearActiveSafe: vi.fn(),
    updateSafe: vi.fn(),
    removeSafe: vi.fn(),
    safeExists: vi.fn().mockReturnValue(false),
    getStorePath: vi.fn().mockReturnValue('/mock/safe/path'),
  }
}

/**
 * Mock @clack/prompts functions
 */
export function mockPrompts() {
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    cancel: vi.fn(),
    isCancel: vi.fn().mockReturnValue(false),
    text: vi.fn(),
    password: vi.fn(),
    confirm: vi.fn(),
    select: vi.fn(),
    multiselect: vi.fn(),
    spinner: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
    }),
    log: {
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
      message: vi.fn(),
    },
  }
}

/**
 * Mock console.log to capture output
 */
export function mockConsole() {
  const logs: string[] = []
  const originalLog = console.log

  console.log = vi.fn((...args: any[]) => {
    logs.push(args.map((a) => String(a)).join(' '))
  })

  return {
    logs,
    restore: () => {
      console.log = originalLog
    },
    getLogs: () => logs,
    clearLogs: () => {
      logs.length = 0
    },
  }
}
