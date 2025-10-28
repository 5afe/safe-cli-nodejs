import { beforeEach, afterEach, describe, it, expect } from 'vitest'
import { WalletStorageService } from '../../storage/wallet-store.js'
import { TEST_PRIVATE_KEY, TEST_PASSWORD } from './test-helpers.js'
import { createTestStorage } from '../helpers/test-storage.js'

describe('Wallet Integration Tests', () => {
  let walletStorage: WalletStorageService
  let testStorage: ReturnType<typeof createTestStorage>

  beforeEach(() => {
    // Create isolated test storage - NEVER touches user's actual config!
    testStorage = createTestStorage('wallet-integration')

    // Create wallet storage with isolated directory
    walletStorage = new WalletStorageService({ cwd: testStorage.configDir })
    walletStorage.setPassword(TEST_PASSWORD)
  })

  afterEach(() => {
    // Cleanup test directories
    testStorage.cleanup()
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

      // Create new instance pointing to same test directory
      const newWalletStorage = new WalletStorageService({ cwd: testStorage.configDir })
      newWalletStorage.setPassword(TEST_PASSWORD)

      const wallets = newWalletStorage.getAllWallets()
      const foundWallet = wallets.find((w) => w.address === wallet.address)

      expect(foundWallet).toBeDefined()
      expect(foundWallet?.name).toBe('Test Wallet')

      // Cleanup
      newWalletStorage.removeWallet(wallet.id)
    })
  })

  describe('importLedgerWallet', () => {
    it('should import a Ledger wallet', async () => {
      const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' // Valid checksum address
      const derivationPath = "44'/60'/0'/0/0"

      const wallet = await walletStorage.importLedgerWallet('Ledger 1', address, derivationPath)

      expect(wallet).toBeDefined()
      expect(wallet.type).toBe('ledger')
      expect(wallet.name).toBe('Ledger 1')
      expect(wallet.address).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
      expect(wallet.derivationPath).toBe(derivationPath)
      expect(wallet.id).toBeDefined()
      expect(wallet.createdAt).toBeDefined()
    })

    it('should checksum the address', async () => {
      const address = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' // lowercase
      const derivationPath = "44'/60'/0'/0/0"

      const wallet = await walletStorage.importLedgerWallet('Ledger 2', address, derivationPath)

      expect(wallet.address).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8') // checksummed
    })

    it('should throw error for invalid address', async () => {
      const invalidAddress = 'invalid-address'
      const derivationPath = "44'/60'/0'/0/0"

      await expect(
        walletStorage.importLedgerWallet('Ledger 3', invalidAddress, derivationPath)
      ).rejects.toThrow()
    })

    it('should prevent importing duplicate Ledger wallet', async () => {
      const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      const derivationPath = "44'/60'/0'/0/0"

      await walletStorage.importLedgerWallet('Ledger 1', address, derivationPath)

      await expect(
        walletStorage.importLedgerWallet('Ledger Duplicate', address, derivationPath)
      ).rejects.toThrow('already exists')
    })

    it('should not store private key for Ledger wallet', async () => {
      const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      const derivationPath = "44'/60'/0'/0/0"

      const wallet = await walletStorage.importLedgerWallet('Ledger 1', address, derivationPath)

      // Attempt to get private key should throw
      expect(() => walletStorage.getPrivateKey(wallet.id)).toThrow(
        'Cannot get private key for Ledger wallet'
      )
    })

    it('should set Ledger wallet as active', async () => {
      const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
      const derivationPath = "44'/60'/0'/0/0"

      const wallet = await walletStorage.importLedgerWallet('Ledger 1', address, derivationPath)

      const activeWallet = walletStorage.getActiveWallet()
      expect(activeWallet).toBeDefined()
      expect(activeWallet?.id).toBe(wallet.id)
    })
  })

  describe('Mixed wallet types', () => {
    it('should handle both private-key and Ledger wallets', async () => {
      const pkWallet = await walletStorage.importWallet('PK Wallet', TEST_PRIVATE_KEY)
      const ledgerWallet = await walletStorage.importLedgerWallet(
        'Ledger Wallet',
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        "44'/60'/0'/0/0"
      )

      const wallets = walletStorage.getAllWallets()

      expect(wallets).toHaveLength(2)

      const pkFound = wallets.find((w) => w.id === pkWallet.id)
      const ledgerFound = wallets.find((w) => w.id === ledgerWallet.id)

      expect(pkFound?.type).toBe('private-key')
      expect(ledgerFound?.type).toBe('ledger')
    })

    it('should get private key only for private-key wallets', async () => {
      const pkWallet = await walletStorage.importWallet('PK Wallet', TEST_PRIVATE_KEY)
      const ledgerWallet = await walletStorage.importLedgerWallet(
        'Ledger Wallet',
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        "44'/60'/0'/0/0"
      )

      // Should work for private-key wallet
      const privateKey = walletStorage.getPrivateKey(pkWallet.id)
      expect(privateKey).toBeDefined()

      // Should throw for Ledger wallet
      expect(() => walletStorage.getPrivateKey(ledgerWallet.id)).toThrow(
        'Cannot get private key for Ledger wallet'
      )
    })
  })
})
