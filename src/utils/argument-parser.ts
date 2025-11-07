import type { Address } from 'viem'
import { isAddress } from 'viem'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * Parse a password from various input methods
 * Priority: CLI flag > Environment variable > File > null (prompt)
 */
export interface PasswordOptions {
  password?: string
  passwordFile?: string
  passwordEnv?: string
}

/**
 * Parse owners argument which can be:
 * - JSON array: '["0xabc...", "0xdef..."]'
 * - Comma-separated: "0xabc...,0xdef..."
 * @returns Array of addresses
 */
export function parseOwnersArgument(value: string): Address[] {
  // Try parsing as JSON first
  if (value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) {
        throw new Error('Owners must be an array')
      }
      return parsed.map((addr) => {
        if (!isAddress(addr)) {
          throw new Error(`Invalid address: ${addr}`)
        }
        return addr as Address
      })
    } catch (error) {
      throw new Error(
        `Invalid JSON array for owners: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Parse as comma-separated
  const addresses = value
    .split(',')
    .map((addr) => addr.trim())
    .filter((addr) => addr.length > 0)

  if (addresses.length === 0) {
    throw new Error('No owners provided')
  }

  return addresses.map((addr) => {
    if (!isAddress(addr)) {
      throw new Error(`Invalid address: ${addr}`)
    }
    return addr as Address
  })
}

/**
 * Parse JSON argument which can be:
 * - JSON string: '{"key": "value"}'
 * - File path: @/path/to/file.json (prefixed with @)
 * @returns Parsed JSON object
 */
export function parseJsonArgument(value: string): unknown {
  // Check if it's a file path (starts with @)
  if (value.startsWith('@')) {
    const filePath = resolve(value.slice(1))
    try {
      const fileContent = readFileSync(filePath, 'utf-8')
      return JSON.parse(fileContent)
    } catch (error) {
      throw new Error(
        `Failed to read JSON from file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Parse as JSON string
  try {
    return JSON.parse(value)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Parse an address argument that can be:
 * - EIP-3770 format: "eth:0x123..."
 * - Plain address: "0x123..."
 * @returns Object with chainId (if EIP-3770) and address
 */
export interface ParsedAddress {
  address: Address
  chainId?: string
  shortName?: string
}

export function parseAddressArgument(value: string): ParsedAddress {
  // Check for EIP-3770 format
  if (value.includes(':')) {
    const [shortName, address] = value.split(':')
    if (!isAddress(address)) {
      throw new Error(`Invalid address: ${address}`)
    }
    return {
      shortName: shortName.trim(),
      address: address as Address,
    }
  }

  // Plain address
  if (!isAddress(value)) {
    throw new Error(`Invalid address: ${value}`)
  }

  return {
    address: value as Address,
  }
}

/**
 * Parse function signature and arguments for contract interactions
 * @param signature Function signature like "transfer(address,uint256)"
 * @param args JSON array of arguments
 * @returns Object with signature and parsed args
 */
export interface FunctionCall {
  signature: string
  args: unknown[]
}

export function parseFunctionCall(signature: string, argsJson?: string): FunctionCall {
  if (!argsJson) {
    return {
      signature,
      args: [],
    }
  }

  try {
    const args = JSON.parse(argsJson)
    if (!Array.isArray(args)) {
      throw new Error('Function arguments must be an array')
    }
    return {
      signature,
      args,
    }
  } catch (error) {
    throw new Error(
      `Invalid function arguments: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Parse a numeric value with support for different units
 * @param value String value to parse
 * @param allowDecimals Whether to allow decimal values
 * @returns Bigint value
 */
export function parseNumericArgument(value: string, allowDecimals = false): bigint {
  const trimmed = value.trim()

  if (!allowDecimals && trimmed.includes('.')) {
    throw new Error('Decimal values not allowed')
  }

  try {
    // If it contains a decimal, we need to handle it specially
    if (trimmed.includes('.')) {
      const [whole, fraction = ''] = trimmed.split('.')
      return BigInt(whole + fraction.padEnd(18, '0').slice(0, 18))
    }

    return BigInt(trimmed)
  } catch {
    throw new Error(`Invalid numeric value: ${trimmed}`)
  }
}

/**
 * Parse a chain ID or short name to chain ID
 * @param value Chain ID (number) or short name (string)
 * @returns Chain ID as string
 */
export function parseChainArgument(value: string): string {
  // If it's a number, return as-is
  if (/^\d+$/.test(value)) {
    return value
  }

  // Otherwise, it's a short name - we'll need to resolve it later
  return value
}
