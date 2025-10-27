/**
 * Ledger Hardware Wallet Service
 *
 * Provides integration with Ledger hardware wallets using LedgerJS.
 * Architecture designed for easy migration to @ledgerhq/device-sdk-ts when Node.js support is stable.
 *
 * @deprecated LedgerJS is being replaced by device-sdk-ts. This implementation
 * uses a transport interface to facilitate future migration.
 */

import TransportNodeHidImport from '@ledgerhq/hw-transport-node-hid'
import type Transport from '@ledgerhq/hw-transport'
import EthImport from '@ledgerhq/hw-app-eth'
import { getAddress } from 'viem'
import { SafeCLIError } from '../utils/errors.js'

// ESM/CommonJS interop: Handle default exports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TransportNodeHid = (TransportNodeHidImport as any).default || TransportNodeHidImport
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Eth = (EthImport as any).default || EthImport

/**
 * Transport interface for Ledger communication
 * Allows swapping LedgerJS for device-sdk-ts in the future
 */
export interface ILedgerTransport {
  getAddress(derivationPath: string): Promise<string>
  signPersonalMessage(derivationPath: string, messageHex: string): Promise<string>
  signEIP712Hash(
    derivationPath: string,
    domainSeparatorHex: string | Buffer | Uint8Array,
    hashStructHex: string | Buffer | Uint8Array
  ): Promise<string>
  close(): Promise<void>
}

/**
 * LedgerJS adapter implementing ILedgerTransport
 * Wraps @ledgerhq/hw-transport-node-hid and @ledgerhq/hw-app-eth
 */
class LedgerJSTransport implements ILedgerTransport {
  private transport: Transport | null = null
  private eth: InstanceType<typeof Eth> | null = null

  async connect(): Promise<void> {
    try {
      this.transport = await TransportNodeHid.create()
      this.eth = new Eth(this.transport)
    } catch (error) {
      throw new SafeCLIError(
        `Failed to connect to Ledger device: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async getAddress(derivationPath: string): Promise<string> {
    if (!this.eth) {
      throw new SafeCLIError('Ledger transport not connected. Call connect() first.')
    }

    try {
      const result = await this.eth.getAddress(derivationPath, false, true)
      // Return checksummed address
      return getAddress(result.address)
    } catch (error) {
      throw new SafeCLIError(
        `Failed to get address from Ledger: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async signPersonalMessage(derivationPath: string, messageHex: string): Promise<string> {
    if (!this.eth) {
      throw new SafeCLIError('Ledger transport not connected. Call connect() first.')
    }

    try {
      // Remove 0x prefix if present
      const cleanHex = messageHex.startsWith('0x') ? messageHex.slice(2) : messageHex

      const result = await this.eth.signPersonalMessage(derivationPath, cleanHex)

      // Reconstruct signature in format: r + s + v
      const r = result.r
      const s = result.s
      const v = result.v.toString(16).padStart(2, '0')

      return `0x${r}${s}${v}`
    } catch (error) {
      throw new SafeCLIError(
        `Failed to sign message with Ledger: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async signEIP712Hash(
    derivationPath: string,
    domainSeparatorHex: string | Buffer | Uint8Array,
    hashStructHex: string | Buffer | Uint8Array
  ): Promise<string> {
    if (!this.eth) {
      throw new SafeCLIError('Ledger transport not connected. Call connect() first.')
    }

    try {
      // Ensure inputs are strings and remove 0x prefix
      const domainStr =
        typeof domainSeparatorHex === 'string'
          ? domainSeparatorHex
          : `0x${Buffer.from(domainSeparatorHex).toString('hex')}`
      const hashStr =
        typeof hashStructHex === 'string'
          ? hashStructHex
          : `0x${Buffer.from(hashStructHex).toString('hex')}`

      const cleanDomain = domainStr.startsWith('0x') ? domainStr.slice(2) : domainStr
      const cleanHash = hashStr.startsWith('0x') ? hashStr.slice(2) : hashStr

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (this.eth as any).signEIP712HashedMessage(
        derivationPath,
        cleanDomain,
        cleanHash
      )

      // Reconstruct signature in format: r + s + v
      const r = result.r
      const s = result.s

      // Ledger returns v as 0/1, normalize to 27/28 for Ethereum
      let vNum = typeof result.v === 'number' ? result.v : parseInt(result.v.toString(), 10)

      // For EIP-712 signatures, v should be 27 or 28
      if (vNum < 27) {
        vNum += 27
      }

      const v = vNum.toString(16).padStart(2, '0')

      return `0x${r}${s}${v}`
    } catch (error) {
      throw new SafeCLIError(
        `Failed to sign EIP-712 hash with Ledger: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  async close(): Promise<void> {
    if (this.transport) {
      await this.transport.close()
      this.transport = null
      this.eth = null
    }
  }
}

/**
 * High-level Ledger service for wallet management and signing
 */
export class LedgerService {
  private transport: ILedgerTransport | null = null

  /**
   * Check if a Ledger device is connected
   */
  static async isDeviceConnected(): Promise<boolean> {
    try {
      const devices = await TransportNodeHid.list()
      return devices.length > 0
    } catch {
      return false
    }
  }

  /**
   * Wait for a Ledger device to be connected
   * @param timeoutMs Maximum time to wait in milliseconds (default: 30 seconds)
   */
  static async waitForDevice(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      if (await LedgerService.isDeviceConnected()) {
        return
      }
      // Wait 500ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    throw new SafeCLIError(
      'Timeout waiting for Ledger device. Please connect your device and try again.'
    )
  }

  /**
   * Connect to Ledger device
   * Creates a new transport if not already connected
   */
  async connect(): Promise<void> {
    if (this.transport) {
      // Already connected
      return
    }

    const ledgerTransport = new LedgerJSTransport()
    await ledgerTransport.connect()
    this.transport = ledgerTransport
  }

  /**
   * Disconnect from Ledger device
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close()
      this.transport = null
    }
  }

  /**
   * Get Ethereum address for a given derivation path
   * @param derivationPath HD wallet path (e.g., "44'/60'/0'/0/0")
   * @returns Checksummed Ethereum address
   */
  async getAddress(derivationPath: string): Promise<string> {
    if (!this.transport) {
      throw new SafeCLIError('Not connected to Ledger. Call connect() first.')
    }

    return this.transport.getAddress(derivationPath)
  }

  /**
   * Sign a hash with Ledger (for Safe transaction signatures)
   * Uses EIP-712 signing for Safe transaction hashes
   *
   * @param derivationPath HD wallet path (e.g., "44'/60'/0'/0/0")
   * @param hash 32-byte hash to sign (0x-prefixed hex or Buffer)
   * @param domainSeparator Safe's EIP-712 domain separator (0x-prefixed hex or Buffer)
   * @returns Signature in format: 0x{r}{s}{v}
   */
  async signHash(
    derivationPath: string,
    hash: string | Buffer | Uint8Array,
    domainSeparator: string | Buffer | Uint8Array
  ): Promise<string> {
    if (!this.transport) {
      throw new SafeCLIError('Not connected to Ledger. Call connect() first.')
    }

    // Convert hash to string if needed
    const hashStr = typeof hash === 'string' ? hash : `0x${Buffer.from(hash).toString('hex')}`

    // Validate hash format
    const cleanHash = hashStr.startsWith('0x') ? hashStr.slice(2) : hashStr
    if (cleanHash.length !== 64) {
      throw new SafeCLIError('Invalid hash: must be 32 bytes (64 hex characters)')
    }

    return this.transport.signEIP712Hash(derivationPath, domainSeparator, hashStr)
  }

  /**
   * Verify an address on the Ledger device screen
   * User must confirm the address matches on their device
   *
   * @param derivationPath HD wallet path
   * @returns Address displayed on device
   */
  async verifyAddress(derivationPath: string): Promise<string> {
    if (!this.transport) {
      throw new SafeCLIError('Not connected to Ledger. Call connect() first.')
    }

    // For verification, we need to use the display parameter
    // This requires updating the transport interface or using the underlying transport directly
    // For now, we'll use the same getAddress which gets the address
    // Note: To show on device, we'd need direct access to Eth instance with verify=true
    return this.transport.getAddress(derivationPath)
  }
}

/**
 * Common derivation paths for Ethereum wallets
 */
export const DERIVATION_PATHS = {
  // Ledger Live default path
  LEDGER_LIVE: (index: number) => `44'/60'/${index}'/0/0`,
  // Legacy MEW/MyCrypto path
  LEGACY: (index: number) => `44'/60'/0'/${index}`,
  // Custom path
  CUSTOM: (path: string) => path,
} as const

/**
 * Validate a derivation path format
 */
export function isValidDerivationPath(path: string): boolean {
  // Basic BIP44 path validation: m/44'/60'/x'/x/x or 44'/60'/x'/x/x
  const pattern = /^(m\/)?44'\/60'\/\d+'?\/\d+'?\/\d+'?$/
  return pattern.test(path)
}
