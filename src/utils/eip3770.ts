import { isAddress, type Address } from 'viem'
import type { ChainConfig } from '../types/config.js'
import { SafeCLIError } from './errors.js'

/**
 * EIP-3770: Chain-specific addresses
 * Format: <shortName>:<address>
 * Example: eth:0x742d35Cc6634C0532925a3b844Bc454e4438f44e
 */

export interface ParsedEIP3770 {
  shortName: string
  address: Address
}

/**
 * Format an address according to EIP-3770
 */
export function formatEIP3770(shortName: string, address: Address): string {
  return `${shortName}:${address}`
}

/**
 * Parse an EIP-3770 formatted address
 */
export function parseEIP3770(eip3770Address: string): ParsedEIP3770 {
  const parts = eip3770Address.split(':')

  if (parts.length !== 2) {
    throw new SafeCLIError(
      `Invalid EIP-3770 address format. Expected <shortName>:<address>, got: ${eip3770Address}`
    )
  }

  const [shortName, address] = parts

  if (!shortName || shortName.trim() === '') {
    throw new SafeCLIError('Invalid EIP-3770 address: shortName cannot be empty')
  }

  if (!isAddress(address)) {
    throw new SafeCLIError(`Invalid EIP-3770 address: ${address} is not a valid Ethereum address`)
  }

  return {
    shortName,
    address: address as Address,
  }
}

/**
 * Check if a string is a valid EIP-3770 address format
 */
export function isEIP3770(value: string): boolean {
  try {
    parseEIP3770(value)
    return true
  } catch {
    return false
  }
}

/**
 * Get chain shortName from chainId using chain configs
 */
export function getShortNameFromChainId(
  chainId: string,
  chains: Record<string, ChainConfig>
): string {
  const chain = chains[chainId]
  if (!chain) {
    throw new SafeCLIError(`Chain with ID ${chainId} not found in configuration`)
  }
  return chain.shortName
}

/**
 * Get chainId from shortName using chain configs
 */
export function getChainIdFromShortName(
  shortName: string,
  chains: Record<string, ChainConfig>
): string {
  for (const [chainId, chain] of Object.entries(chains)) {
    if (chain.shortName === shortName) {
      return chainId
    }
  }
  throw new SafeCLIError(`Chain with shortName "${shortName}" not found in configuration`)
}

/**
 * Get chain config from shortName
 */
export function getChainByShortName(
  shortName: string,
  chains: Record<string, ChainConfig>
): ChainConfig {
  for (const chain of Object.values(chains)) {
    if (chain.shortName === shortName) {
      return chain
    }
  }
  throw new SafeCLIError(`Chain with shortName "${shortName}" not found in configuration`)
}

/**
 * Format Safe address with EIP-3770 using chain config
 */
export function formatSafeAddress(
  address: Address,
  chainId: string,
  chains: Record<string, ChainConfig>
): string {
  const shortName = getShortNameFromChainId(chainId, chains)
  return formatEIP3770(shortName, address)
}

/**
 * Parse Safe address and return chain and address
 * Supports both EIP-3770 format (shortName:address) and plain address
 */
export function parseSafeAddress(
  input: string,
  chains: Record<string, ChainConfig>,
  defaultChainId?: string
): { chainId: string; address: Address } {
  // Try EIP-3770 format first
  if (input.includes(':')) {
    const { shortName, address } = parseEIP3770(input)
    const chainId = getChainIdFromShortName(shortName, chains)
    return { chainId, address }
  }

  // Plain address - requires default chainId
  if (!defaultChainId) {
    throw new SafeCLIError(
      'Plain address provided without chain context. Use EIP-3770 format (shortName:address) or specify chain.'
    )
  }

  if (!isAddress(input)) {
    throw new SafeCLIError(`Invalid address: ${input}`)
  }

  return {
    chainId: defaultChainId,
    address: input as Address,
  }
}
