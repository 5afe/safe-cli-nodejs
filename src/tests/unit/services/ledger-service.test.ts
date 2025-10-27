import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import {
  LedgerService,
  DERIVATION_PATHS,
  isValidDerivationPath,
} from '../../../services/ledger-service.js'

// Mock the Ledger imports
vi.mock('@ledgerhq/hw-transport-node-hid', () => ({
  default: {
    create: vi.fn(),
    list: vi.fn(),
  },
}))

vi.mock('@ledgerhq/hw-app-eth', () => ({
  default: vi.fn(),
}))

describe('LedgerService', () => {
  describe('isDeviceConnected', () => {
    it('should return true when device is connected', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      ;(TransportNodeHid.list as Mock).mockResolvedValue([{ deviceId: '123' }])

      const result = await LedgerService.isDeviceConnected()

      expect(result).toBe(true)
      expect(TransportNodeHid.list).toHaveBeenCalled()
    })

    it('should return false when no device is connected', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      ;(TransportNodeHid.list as Mock).mockResolvedValue([])

      const result = await LedgerService.isDeviceConnected()

      expect(result).toBe(false)
    })

    it('should return false when list throws error', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      ;(TransportNodeHid.list as Mock).mockRejectedValue(new Error('USB error'))

      const result = await LedgerService.isDeviceConnected()

      expect(result).toBe(false)
    })
  })

  describe('waitForDevice', () => {
    it('should resolve immediately if device is connected', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      ;(TransportNodeHid.list as Mock).mockResolvedValue([{ deviceId: '123' }])

      await expect(LedgerService.waitForDevice(1000)).resolves.toBeUndefined()
    })

    it('should timeout if device is not connected', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      ;(TransportNodeHid.list as Mock).mockResolvedValue([])

      await expect(LedgerService.waitForDevice(500)).rejects.toThrow(
        'Timeout waiting for Ledger device'
      )
    })
  })

  describe('connect and disconnect', () => {
    let service: LedgerService

    beforeEach(() => {
      service = new LedgerService()
    })

    it('should connect to Ledger device', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      const mockTransport = {
        close: vi.fn(),
      }
      ;(TransportNodeHid.create as Mock).mockResolvedValue(mockTransport)

      await service.connect()

      expect(TransportNodeHid.create).toHaveBeenCalled()
    })

    it('should not connect twice if already connected', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      const mockTransport = {
        close: vi.fn(),
      }
      ;(TransportNodeHid.create as Mock).mockResolvedValue(mockTransport)

      await service.connect()
      const firstCallCount = (TransportNodeHid.create as Mock).mock.calls.length

      await service.connect()
      const secondCallCount = (TransportNodeHid.create as Mock).mock.calls.length

      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should disconnect from device', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      const mockTransport = {
        close: vi.fn(),
      }
      ;(TransportNodeHid.create as Mock).mockResolvedValue(mockTransport)

      await service.connect()
      await service.disconnect()

      expect(mockTransport.close).toHaveBeenCalled()
    })

    it('should handle disconnect when not connected', async () => {
      await expect(service.disconnect()).resolves.toBeUndefined()
    })

    it('should throw error if connection fails', async () => {
      const TransportNodeHid = (await import('@ledgerhq/hw-transport-node-hid')).default
      ;(TransportNodeHid.create as Mock).mockRejectedValue(new Error('Connection failed'))

      await expect(service.connect()).rejects.toThrow('Failed to connect to Ledger device')
    })
  })
})

describe('DERIVATION_PATHS', () => {
  it('should generate Ledger Live path correctly', () => {
    expect(DERIVATION_PATHS.LEDGER_LIVE(0)).toBe("44'/60'/0'/0/0")
    expect(DERIVATION_PATHS.LEDGER_LIVE(5)).toBe("44'/60'/5'/0/0")
  })

  it('should generate Legacy path correctly', () => {
    expect(DERIVATION_PATHS.LEGACY(0)).toBe("44'/60'/0'/0")
    expect(DERIVATION_PATHS.LEGACY(10)).toBe("44'/60'/0'/10")
  })

  it('should return custom path as-is', () => {
    expect(DERIVATION_PATHS.CUSTOM("m/44'/60'/0'/0/0")).toBe("m/44'/60'/0'/0/0")
  })
})

describe('isValidDerivationPath', () => {
  it('should accept valid paths with m/ prefix', () => {
    expect(isValidDerivationPath("m/44'/60'/0'/0/0")).toBe(true)
    expect(isValidDerivationPath("m/44'/60'/1'/0/0")).toBe(true)
    expect(isValidDerivationPath("m/44'/60'/0'/0/1")).toBe(true)
  })

  it('should accept valid paths without m/ prefix', () => {
    expect(isValidDerivationPath("44'/60'/0'/0/0")).toBe(true)
    expect(isValidDerivationPath("44'/60'/5'/0/0")).toBe(true)
  })

  it('should accept paths with mixed hardened notation', () => {
    expect(isValidDerivationPath("44'/60'/0/0/0")).toBe(true)
    expect(isValidDerivationPath("44'/60'/0'/0'/0'")).toBe(true)
  })

  it('should reject invalid paths', () => {
    expect(isValidDerivationPath("43'/60'/0'/0/0")).toBe(false) // wrong purpose
    expect(isValidDerivationPath("44'/61'/0'/0/0")).toBe(false) // wrong coin type
    expect(isValidDerivationPath("m/44'/60'")).toBe(false) // too short
    expect(isValidDerivationPath('invalid')).toBe(false)
    expect(isValidDerivationPath('')).toBe(false)
  })
})
