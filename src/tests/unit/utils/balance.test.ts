import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getBalance, getBalances, formatBalance } from '../../../utils/balance.js'
import type { Address } from 'viem'
import type { ChainConfig } from '../../../types/config.js'

// Mock viem
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    createPublicClient: vi.fn(),
    http: vi.fn(),
    formatEther: vi.fn((value: bigint) => {
      // Simple mock implementation
      return (Number(value) / 1e18).toString()
    }),
  }
})

describe('Balance Utils', () => {
  const mockChain: ChainConfig = {
    chainId: '1',
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    currency: 'ETH',
    explorerUrl: 'https://etherscan.io',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBalance', () => {
    it('should fetch balance for an address', async () => {
      const { createPublicClient } = await import('viem')
      const mockGetBalance = vi.fn().mockResolvedValue(BigInt(1000000000000000000)) // 1 ETH

      ;(createPublicClient as any).mockReturnValue({
        getBalance: mockGetBalance,
      })

      const address = '0x1234567890123456789012345678901234567890' as Address
      const balance = await getBalance(address, mockChain)

      expect(mockGetBalance).toHaveBeenCalledWith({ address })
      expect(balance).toBe('1')
    })

    it('should handle zero balance', async () => {
      const { createPublicClient } = await import('viem')
      const mockGetBalance = vi.fn().mockResolvedValue(BigInt(0))

      ;(createPublicClient as any).mockReturnValue({
        getBalance: mockGetBalance,
      })

      const address = '0x1234567890123456789012345678901234567890' as Address
      const balance = await getBalance(address, mockChain)

      expect(balance).toBe('0')
    })

    it('should handle errors gracefully by returning 0', async () => {
      const { createPublicClient } = await import('viem')
      const mockGetBalance = vi.fn().mockRejectedValue(new Error('RPC error'))

      ;(createPublicClient as any).mockReturnValue({
        getBalance: mockGetBalance,
      })

      const address = '0x1234567890123456789012345678901234567890' as Address
      const balance = await getBalance(address, mockChain)

      // getBalance catches errors and returns '0' instead of throwing
      expect(balance).toBe('0')
    })
  })

  describe('getBalances', () => {
    it('should fetch balances for multiple addresses', async () => {
      const { createPublicClient } = await import('viem')
      const mockGetBalance = vi
        .fn()
        .mockResolvedValueOnce(BigInt(1000000000000000000)) // 1 ETH
        .mockResolvedValueOnce(BigInt(2000000000000000000)) // 2 ETH

      ;(createPublicClient as any).mockReturnValue({
        getBalance: mockGetBalance,
      })

      const addresses = [
        '0x1234567890123456789012345678901234567890' as Address,
        '0x0987654321098765432109876543210987654321' as Address,
      ]

      const balances = await getBalances(addresses, mockChain)

      expect(balances.size).toBe(2)
      expect(balances.get(addresses[0])).toBe('1')
      expect(balances.get(addresses[1])).toBe('2')
    })

    it('should handle empty address list', async () => {
      const balances = await getBalances([], mockChain)

      expect(balances.size).toBe(0)
    })

    it('should handle partial failures by returning 0 for failed addresses', async () => {
      const { createPublicClient } = await import('viem')
      const mockGetBalance = vi
        .fn()
        .mockResolvedValueOnce(BigInt(1000000000000000000)) // 1 ETH
        .mockRejectedValueOnce(new Error('RPC error')) // Failure

      ;(createPublicClient as any).mockReturnValue({
        getBalance: mockGetBalance,
      })

      const addresses = [
        '0x1234567890123456789012345678901234567890' as Address,
        '0x0987654321098765432109876543210987654321' as Address,
      ]

      const balances = await getBalances(addresses, mockChain)

      expect(balances.size).toBe(2)
      expect(balances.get(addresses[0])).toBe('1')
      expect(balances.get(addresses[1])).toBe('0') // Failed address gets 0
    })
  })

  describe('formatBalance', () => {
    it('should format balance with default decimals', () => {
      expect(formatBalance('1.23456789', 'ETH')).toBe('1.2346 ETH')
      expect(formatBalance('10.5', 'ETH')).toBe('10.5 ETH')
      expect(formatBalance('0.1234', 'ETH')).toBe('0.1234 ETH')
    })

    it('should remove trailing zeros', () => {
      expect(formatBalance('1.0000', 'ETH')).toBe('1 ETH')
      expect(formatBalance('1.5000', 'ETH')).toBe('1.5 ETH')
      expect(formatBalance('0.1000', 'ETH')).toBe('0.1 ETH')
    })

    it('should handle zero balance', () => {
      expect(formatBalance('0', 'ETH')).toBe('0 ETH')
      expect(formatBalance('0.0000', 'ETH')).toBe('0 ETH')
    })

    it('should handle very small amounts with more decimals', () => {
      expect(formatBalance('0.000001', 'ETH')).toBe('0.00000100 ETH')
      expect(formatBalance('0.00000123456', 'ETH')).toBe('0.00000123 ETH')
    })

    it('should handle large amounts', () => {
      expect(formatBalance('1000000', 'ETH')).toBe('1000000 ETH')
      expect(formatBalance('1234567.89', 'ETH')).toBe('1234567.89 ETH')
    })

    it('should respect custom maxDecimals', () => {
      expect(formatBalance('1.23456789', 'ETH', 2)).toBe('1.23 ETH')
      expect(formatBalance('1.23456789', 'ETH', 6)).toBe('1.234568 ETH')
      expect(formatBalance('0.000001', 'ETH', 8)).toBe('0.00000100 ETH')
    })

    it('should handle different currency symbols', () => {
      expect(formatBalance('1.5', 'MATIC')).toBe('1.5 MATIC')
      expect(formatBalance('100', 'USDC')).toBe('100 USDC')
    })

    it('should handle integer balance strings', () => {
      expect(formatBalance('5', 'ETH')).toBe('5 ETH')
      expect(formatBalance('100', 'ETH')).toBe('100 ETH')
    })

    it('should handle scientific notation', () => {
      expect(formatBalance('1e-6', 'ETH')).toBe('0.00000100 ETH') // < 0.0001 uses 8 decimals
      expect(formatBalance('1e6', 'ETH')).toBe('1000000 ETH')
    })
  })
})
