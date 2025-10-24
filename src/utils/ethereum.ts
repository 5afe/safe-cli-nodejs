import { getAddress, type Address } from 'viem'

export function checksumAddress(address: string): Address {
  return getAddress(address)
}

export function shortenAddress(address: string, chars = 4): string {
  const parsed = checksumAddress(address)
  return `${parsed.substring(0, chars + 2)}...${parsed.substring(42 - chars)}`
}

export function formatEther(value: bigint, decimals = 4): string {
  const eth = Number(value) / 1e18
  return eth.toFixed(decimals)
}

export function parseEther(value: string): bigint {
  const parts = value.split('.')
  const whole = parts[0] || '0'
  const fraction = (parts[1] || '0').padEnd(18, '0').slice(0, 18)
  return BigInt(whole + fraction)
}
