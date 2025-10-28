import { isAddress, isHex, getAddress, type Address } from 'viem'
import { ValidationError } from '../utils/errors.js'
import { isEIP3770, parseEIP3770, getChainIdFromShortName } from '../utils/eip3770.js'
import type { ChainConfig } from '../types/config.js'

/**
 * Centralized validation service for all input validation across the CLI.
 *
 * This service provides two types of validation methods:
 * 1. `validate*()` - Returns error message string or undefined (for @clack/prompts)
 * 2. `assert*()` - Throws ValidationError (for business logic)
 */
export class ValidationService {
  /**
   * Validates an Ethereum address
   * @returns Error message or undefined if valid
   */
  validateAddress(value: unknown): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Address is required'
    }
    if (!isAddress(value)) {
      return 'Invalid Ethereum address'
    }
    return undefined
  }

  /**
   * Validates an Ethereum address with EIP-3770 support and chain verification
   * Accepts both plain addresses (0x...) and EIP-3770 format (shortName:0x...)
   * If EIP-3770 format is provided, validates that the chain prefix matches expectedChainId
   *
   * @param value - Address to validate (plain or EIP-3770 format)
   * @param expectedChainId - The chain ID that the address should be for
   * @param chains - Chain configurations to resolve shortNames
   * @returns Error message or undefined if valid
   */
  validateAddressWithChain(
    value: unknown,
    expectedChainId: string,
    chains: Record<string, ChainConfig>
  ): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Address is required'
    }

    // Check if it's EIP-3770 format
    if (isEIP3770(value)) {
      try {
        const { shortName, address } = parseEIP3770(value)

        // Resolve the chainId from the shortName
        const chainId = getChainIdFromShortName(shortName, chains)

        // Check if it matches the expected chain
        if (chainId !== expectedChainId) {
          const expectedChain = chains[expectedChainId]
          const providedChain = chains[chainId]
          const expectedName = expectedChain?.name || expectedChainId
          const providedName = providedChain?.name || chainId

          return `Chain mismatch: address is for ${providedName} (${shortName}:) but current Safe is on ${expectedName}`
        }

        // Validate the address part
        if (!isAddress(address)) {
          return 'Invalid Ethereum address'
        }

        return undefined
      } catch (error) {
        if (error instanceof Error) {
          return error.message
        }
        return 'Invalid EIP-3770 address format'
      }
    }

    // Plain address format - validate normally
    return this.validateAddress(value)
  }

  /**
   * Asserts an Ethereum address is valid and returns checksummed version
   * @throws ValidationError if invalid
   */
  assertAddress(value: string, fieldName = 'Address'): Address {
    const error = this.validateAddress(value)
    if (error) {
      throw new ValidationError(`${fieldName}: ${error}`)
    }
    try {
      return getAddress(value)
    } catch (error) {
      throw new ValidationError(
        `${fieldName}: Invalid address checksum - ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Asserts an Ethereum address is valid (with EIP-3770 support) and returns checksummed version
   * Strips the EIP-3770 prefix if present and validates chain match
   *
   * @param value - Address to validate (plain or EIP-3770 format)
   * @param expectedChainId - The chain ID that the address should be for
   * @param chains - Chain configurations to resolve shortNames
   * @param fieldName - Field name for error messages
   * @returns Checksummed address (without EIP-3770 prefix)
   * @throws ValidationError if invalid
   */
  assertAddressWithChain(
    value: string,
    expectedChainId: string,
    chains: Record<string, ChainConfig>,
    fieldName = 'Address'
  ): Address {
    const error = this.validateAddressWithChain(value, expectedChainId, chains)
    if (error) {
      throw new ValidationError(`${fieldName}: ${error}`)
    }

    // If EIP-3770 format, extract the address part
    let address: string
    if (isEIP3770(value)) {
      const parsed = parseEIP3770(value)
      address = parsed.address
    } else {
      address = value
    }

    try {
      return getAddress(address)
    } catch (error) {
      throw new ValidationError(
        `${fieldName}: Invalid address checksum - ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Validates a private key (64 hex characters with optional 0x prefix)
   * @returns Error message or undefined if valid
   */
  validatePrivateKey(value: unknown): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Private key is required'
    }
    const key = value.startsWith('0x') ? value.slice(2) : value
    if (!isHex(`0x${key}`) || key.length !== 64) {
      return 'Invalid private key format. Must be a 64-character hex string (with or without 0x prefix)'
    }
    return undefined
  }

  /**
   * Asserts a private key is valid and returns normalized version
   * @throws ValidationError if invalid
   */
  assertPrivateKey(value: string, fieldName = 'Private key'): `0x${string}` {
    const error = this.validatePrivateKey(value)
    if (error) {
      throw new ValidationError(`${fieldName}: ${error}`)
    }
    return value.startsWith('0x') ? (value as `0x${string}`) : (`0x${value}` as `0x${string}`)
  }

  /**
   * Validates a chain ID (positive integer)
   * @returns Error message or undefined if valid
   */
  validateChainId(value: unknown): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Chain ID is required'
    }
    const parsed = parseInt(value, 10)
    if (isNaN(parsed) || parsed <= 0) {
      return 'Chain ID must be a positive integer'
    }
    return undefined
  }

  /**
   * Asserts a chain ID is valid
   * @throws ValidationError if invalid
   */
  assertChainId(value: string, fieldName = 'Chain ID'): void {
    const error = this.validateChainId(value)
    if (error) {
      throw new ValidationError(`${fieldName}: ${error}`)
    }
  }

  /**
   * Validates a URL
   * @returns Error message or undefined if valid
   */
  validateUrl(value: unknown, required = true): string | undefined {
    if (!value || typeof value !== 'string') {
      return required ? 'URL is required' : undefined
    }
    try {
      new URL(value)
      return undefined
    } catch {
      return 'Invalid URL format'
    }
  }

  /**
   * Asserts a URL is valid
   * @throws ValidationError if invalid
   */
  assertUrl(value: string, fieldName = 'URL'): void {
    const error = this.validateUrl(value)
    if (error) {
      throw new ValidationError(`${fieldName}: ${error}`)
    }
  }

  /**
   * Validates a password (minimum length)
   * @returns Error message or undefined if valid
   */
  validatePassword(value: unknown, minLength = 8): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Password is required'
    }
    if (value.length < minLength) {
      return `Password must be at least ${minLength} characters`
    }
    return undefined
  }

  /**
   * Validates password confirmation matches
   * @returns Error message or undefined if valid
   */
  validatePasswordConfirmation(value: unknown, original: string): string | undefined {
    if (value !== original) {
      return 'Passwords do not match'
    }
    return undefined
  }

  /**
   * Validates a threshold value
   * @returns Error message or undefined if valid
   */
  validateThreshold(value: unknown, min = 1, max?: number): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Threshold is required'
    }
    const threshold = parseInt(value, 10)
    if (isNaN(threshold)) {
      return 'Threshold must be a number'
    }
    if (threshold < min) {
      return `Threshold must be at least ${min}`
    }
    if (max !== undefined && threshold > max) {
      return `Threshold cannot exceed ${max} (number of owners)`
    }
    return undefined
  }

  /**
   * Asserts a threshold is valid
   * @throws ValidationError if invalid
   */
  assertThreshold(value: number, min: number, max: number, fieldName = 'Threshold'): void {
    if (value < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`)
    }
    if (value > max) {
      throw new ValidationError(`${fieldName} cannot exceed ${max}`)
    }
  }

  /**
   * Validates a nonce value
   * @returns Error message or undefined if valid
   */
  validateNonce(value: unknown, currentNonce?: number): string | undefined {
    if (!value) {
      return undefined // Empty is OK (will use default)
    }
    if (typeof value !== 'string') {
      return 'Invalid nonce'
    }
    const nonce = parseInt(value, 10)
    if (isNaN(nonce) || nonce < 0) {
      return 'Nonce must be a non-negative number'
    }
    if (currentNonce !== undefined && nonce < currentNonce) {
      return `Nonce cannot be lower than current Safe nonce (${currentNonce})`
    }
    return undefined
  }

  /**
   * Validates a Wei value (string representing BigInt)
   * @returns Error message or undefined if valid
   */
  validateWeiValue(value: unknown): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Value is required'
    }
    try {
      BigInt(value)
      return undefined
    } catch {
      return 'Invalid number'
    }
  }

  /**
   * Validates hex data
   * @returns Error message or undefined if valid
   */
  validateHexData(value: unknown): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Data is required (use 0x for empty)'
    }
    if (!value.startsWith('0x')) {
      return 'Data must start with 0x'
    }
    if (value.length > 2 && !/^0x[0-9a-fA-F]*$/.test(value)) {
      return 'Data must be valid hex'
    }
    return undefined
  }

  /**
   * Validates a required text field
   * @returns Error message or undefined if valid
   */
  validateRequired(value: unknown, fieldName = 'Value'): string | undefined {
    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
      return `${fieldName} is required`
    }
    return undefined
  }

  /**
   * Validates an EIP-3770 short name (lowercase alphanumeric with hyphens)
   * @returns Error message or undefined if valid
   */
  validateShortName(value: unknown): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'Short name is required'
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      return 'Short name must be lowercase alphanumeric with hyphens'
    }
    return undefined
  }

  /**
   * Validates that an address is one of the provided owners
   * @returns Error message or undefined if valid
   */
  validateOwnerAddress(value: unknown, owners: Address[]): string | undefined {
    const addressError = this.validateAddress(value)
    if (addressError) return addressError

    const normalized = (value as string).toLowerCase()
    if (!owners.some((owner) => owner.toLowerCase() === normalized)) {
      return 'Address is not an owner of this Safe'
    }
    return undefined
  }

  /**
   * Validates that an address is NOT one of the provided owners
   * @returns Error message or undefined if valid
   */
  validateNonOwnerAddress(value: unknown, owners: Address[]): string | undefined {
    const addressError = this.validateAddress(value)
    if (addressError) return addressError

    const normalized = (value as string).toLowerCase()
    if (owners.some((owner) => owner.toLowerCase() === normalized)) {
      return 'Address is already an owner of this Safe'
    }
    return undefined
  }

  /**
   * Validates JSON string
   * @returns Error message or undefined if valid
   */
  validateJson(value: unknown): string | undefined {
    if (!value || typeof value !== 'string') {
      return 'JSON is required'
    }
    try {
      JSON.parse(value)
      return undefined
    } catch {
      return 'Invalid JSON format'
    }
  }

  /**
   * Asserts JSON is valid and returns parsed object
   * @throws ValidationError if invalid
   */
  assertJson<T = unknown>(value: string, fieldName = 'JSON'): T {
    const error = this.validateJson(value)
    if (error) {
      throw new ValidationError(`${fieldName}: ${error}`)
    }
    try {
      return JSON.parse(value) as T
    } catch (error) {
      throw new ValidationError(
        `${fieldName}: Parse error - ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Validates a positive integer
   * @returns Error message or undefined if valid
   */
  validatePositiveInteger(value: unknown, fieldName = 'Value'): string | undefined {
    if (!value) {
      return `${fieldName} is required`
    }
    const num = typeof value === 'string' ? parseInt(value, 10) : value
    if (typeof num !== 'number' || isNaN(num) || num <= 0 || !Number.isInteger(num)) {
      return `${fieldName} must be a positive integer`
    }
    return undefined
  }

  /**
   * Validates an array of addresses
   * @returns Error message or undefined if valid
   */
  validateAddresses(addresses: unknown[]): string | undefined {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return 'At least one address is required'
    }
    for (let i = 0; i < addresses.length; i++) {
      const error = this.validateAddress(addresses[i])
      if (error) {
        return `Address ${i + 1}: ${error}`
      }
    }
    // Check for duplicates
    const normalized = addresses.map((addr) => (addr as string).toLowerCase())
    const unique = new Set(normalized)
    if (unique.size !== normalized.length) {
      return 'Duplicate addresses are not allowed'
    }
    return undefined
  }

  /**
   * Asserts an array of addresses is valid and returns checksummed versions
   * @throws ValidationError if invalid
   */
  assertAddresses(addresses: string[], fieldName = 'Addresses'): Address[] {
    const error = this.validateAddresses(addresses)
    if (error) {
      throw new ValidationError(`${fieldName}: ${error}`)
    }
    return addresses.map((addr) => this.assertAddress(addr, fieldName))
  }
}

// Singleton instance
let validationService: ValidationService | null = null

export function getValidationService(): ValidationService {
  if (!validationService) {
    validationService = new ValidationService()
  }
  return validationService
}
