import { isAddress, isHex } from 'viem'

export function isValidAddress(address: string): boolean {
  return isAddress(address)
}

export function isValidPrivateKey(privateKey: string): boolean {
  // Remove 0x prefix if present
  const key = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
  // Check if it's a valid hex string of 64 characters (32 bytes)
  return isHex(`0x${key}`) && key.length === 64
}

export function isValidChainId(chainId: string): boolean {
  const parsed = parseInt(chainId, 10)
  return !isNaN(parsed) && parsed > 0
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function normalizePrivateKey(privateKey: string): `0x${string}` {
  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  return key as `0x${string}`
}
