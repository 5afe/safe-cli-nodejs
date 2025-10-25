import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { WalletStorageService } from '../../storage/wallet-store.js'
import { importWallet } from '../../commands/wallet/import.js'
import { listWallets } from '../../commands/wallet/list.js'
import { useWallet } from '../../commands/wallet/use.js'
import { removeWallet } from '../../commands/wallet/remove.js'
import { createTempDir, cleanupTempDir, TEST_PRIVATE_KEY, TEST_PASSWORD } from './test-helpers.js'

describe('Wallet Integration Tests', () => {
  let tempDir: string
  let walletStorage: WalletStorageService

  beforeEach(() => {
    tempDir = createTempDir()
    walletStorage = new WalletStorageService(tempDir)
    walletStorage.setPassword(TEST_PASSWORD)
  })

  afterEach(() => {
    cleanupTempDir(tempDir)
    vi.restoreAllMocks()
  })

  describe('importWallet', () => {
    it('should import a wallet with valid private key', () => {
      walletStorage.importWallet(TEST_PRIVATE_KEY, 'Test Wallet')

      const wallets = walletStorage.getAllWallets()
      expect(wallets).toHaveLength(1)
      expect(wallets[0].name).toBe('Test Wallet')
      expect(wallets[0].address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    })

    it('should reject invalid private key', () => {
      expect(() => {
        walletStorage.importWallet('invalid-key', 'Test Wallet')
      }).toThrow()
    })

    it('should import multiple wallets', () => {
      walletStorage.importWallet(TEST_PRIVATE_KEY, 'Wallet 1')
      walletStorage.importWallet(
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        'Wallet 2'
      )

      const wallets = walletStorage.getAllWallets()
      expect(wallets).toHaveLength(2)
    })
  })

  describe('listWallets', () => {
    it('should list all imported wallets', () => {
      walletStorage.importWallet(TEST_PRIVATE_KEY, 'Wallet 1')
      walletStorage.importWallet(
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
        'Wallet 2'
      )

      const wallets = walletStorage.getAllWallets()
      expect(wallets).toHaveLength(2)
      expect(wallets[0].name).toBe('Wallet 1')
      expect(wallets[1].name).toBe('Wallet 2')
    })

    it('should return empty array when no wallets exist', () => {
      const wallets = walletStorage.getAllWallets()
      expect(wallets).toHaveLength(0)
    })

    it('should indicate active wallet', () => {
      walletStorage.importWallet(TEST_PRIVATE_KEY, 'Wallet 1')
      walletStorage.setActiveWallet('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).not.toBeNull()
      expect(activeWallet?.name).toBe('Wallet 1')
    })
  })

  describe('useWallet', () => {
    it('should set wallet as active', () => {
      walletStorage.importWallet(TEST_PRIVATE_KEY, 'Test Wallet')
      walletStorage.setActiveWallet('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).not.toBeNull()
      expect(activeWallet?.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
    })

    it('should return null when no active wallet', () => {
      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).toBeNull()
    })

    it('should clear active wallet', () => {
      walletStorage.importWallet(TEST_PRIVATE_KEY, 'Test Wallet')
      walletStorage.setActiveWallet('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
      walletStorage.clearActiveWallet()

      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).toBeNull()
    })
  })

  describe('removeWallet', () => {
    it('should remove wallet by address', () => {
      walletStorage.importWallet(TEST_PRIVATE_KEY, 'Test Wallet')
      walletStorage.removeWallet('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

      const wallets = walletStorage.getAllWallets()
      expect(wallets).toHaveLength(0)
    })

    it('should clear active wallet if removed', () => {
      walletStorage.importWallet(TEST_PRIVATE_KEY, 'Test Wallet')
      walletStorage.setActiveWallet('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')
      walletStorage.removeWallet('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).toBeNull()
    })

    it('should not error when removing non-existent wallet', () => {
      expect(() => {
        walletStorage.removeWallet('0x0000000000000000000000000000000000000000')
      }).not.toThrow()
    })
  })
})
