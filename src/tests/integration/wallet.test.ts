import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { WalletStorageService } from '../../storage/wallet-store.js'
import { TEST_PRIVATE_KEY, TEST_PASSWORD } from './test-helpers.js'

describe('Wallet Integration Tests', () => {
  let walletStorage: WalletStorageService

  beforeEach(() => {
    walletStorage = new WalletStorageService()
    walletStorage.setPassword(TEST_PASSWORD)

    // Clear active wallet and all existing wallets
    try {
      const wallets = walletStorage.getAllWallets()
      // Remove each wallet
      for (const wallet of wallets) {
        try {
          walletStorage.removeWallet(wallet.id)
        } catch {
          // Ignore errors during cleanup
        }
      }
    } catch {
      // Ignore if no wallets exist
    }
  })

  afterEach(() => {
    // Cleanup - remove all wallets
    try {
      const wallets = walletStorage.getAllWallets()
      for (const wallet of wallets) {
        try {
          walletStorage.removeWallet(wallet.id)
        } catch {
          // Ignore errors during cleanup
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('importWallet', () => {
    it('should import a wallet with valid private key', async () => {
      const wallet = await walletStorage.importWallet('Test Wallet', TEST_PRIVATE_KEY)

      expect(wallet).toBeDefined()
      expect(wallet.name).toBe('Test Wallet')
      expect(wallet.address).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266')

      const wallets = walletStorage.getAllWallets()
      expect(wallets).toHaveLength(1)
    })

    it('should reject invalid private key', async () => {
      await expect(async () => {
        await walletStorage.importWallet('Test Wallet', 'invalid-key')
      }).rejects.toThrow()
    })

    it('should import multiple wallets', async () => {
      await walletStorage.importWallet('Wallet 1', TEST_PRIVATE_KEY)
      await walletStorage.importWallet(
        'Wallet 2',
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
      )

      const wallets = walletStorage.getAllWallets()
      expect(wallets).toHaveLength(2)
      expect(wallets.map((w) => w.name)).toContain('Wallet 1')
      expect(wallets.map((w) => w.name)).toContain('Wallet 2')
    })
  })

  describe('listWallets', () => {
    it('should list all imported wallets', async () => {
      await walletStorage.importWallet('Wallet 1', TEST_PRIVATE_KEY)
      await walletStorage.importWallet(
        'Wallet 2',
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
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

    it('should indicate active wallet', async () => {
      const wallet = await walletStorage.importWallet('Wallet 1', TEST_PRIVATE_KEY)
      walletStorage.setActiveWallet(wallet.id)

      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).not.toBeNull()
      expect(activeWallet?.name).toBe('Wallet 1')
    })
  })

  describe('useWallet', () => {
    it('should set wallet as active', async () => {
      const wallet = await walletStorage.importWallet('Test Wallet', TEST_PRIVATE_KEY)
      walletStorage.setActiveWallet(wallet.id)

      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).not.toBeNull()
      expect(activeWallet?.address).toBe(wallet.address)
    })

    it('should return null when no active wallet', () => {
      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).toBeNull()
    })

    it('should clear active wallet when last wallet is removed', async () => {
      const wallet = await walletStorage.importWallet('Test Wallet', TEST_PRIVATE_KEY)
      walletStorage.setActiveWallet(wallet.id)
      walletStorage.removeWallet(wallet.id)

      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).toBeNull()
    })
  })

  describe('removeWallet', () => {
    it('should remove wallet by address', async () => {
      const wallet = await walletStorage.importWallet('Test Wallet', TEST_PRIVATE_KEY)
      walletStorage.removeWallet(wallet.id)

      const wallets = walletStorage.getAllWallets()
      expect(wallets).toHaveLength(0)
    })

    it('should update active wallet when removed', async () => {
      const wallet = await walletStorage.importWallet('Test Wallet', TEST_PRIVATE_KEY)
      walletStorage.setActiveWallet(wallet.id)

      const walletsBefore = walletStorage.getAllWallets()
      walletStorage.removeWallet(wallet.id)
      const walletsAfter = walletStorage.getAllWallets()

      // Should have one less wallet
      expect(walletsAfter.length).toBe(walletsBefore.length - 1)

      // If no wallets remain, active should be null
      if (walletsAfter.length === 0) {
        expect(walletStorage.getActiveWallet()).toBeNull()
      }
    })

    it('should not error when removing non-existent wallet', () => {
      expect(() => {
        walletStorage.removeWallet('nonexistent-id')
      }).not.toThrow()
    })
  })

  describe('Wallet Persistence', () => {
    it('should persist wallet across instances', async () => {
      const wallet = await walletStorage.importWallet('Test Wallet', TEST_PRIVATE_KEY)

      // Create new instance
      const newWalletStorage = new WalletStorageService()
      newWalletStorage.setPassword(TEST_PASSWORD)

      const wallets = newWalletStorage.getAllWallets()
      const foundWallet = wallets.find((w) => w.address === wallet.address)

      expect(foundWallet).toBeDefined()
      expect(foundWallet?.name).toBe('Test Wallet')

      // Cleanup
      newWalletStorage.removeWallet(wallet.id)
    })
  })
})
