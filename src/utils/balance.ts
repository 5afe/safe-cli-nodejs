import { createPublicClient, http, type Address, formatEther } from 'viem'
import type { ChainConfig } from '../types/config.js'

/**
 * Fetch ETH balance for an address
 * @param address Ethereum address
 * @param chain Chain configuration
 * @returns Balance in ETH as a formatted string
 */
export async function getBalance(address: Address, chain: ChainConfig): Promise<string> {
  try {
    const client = createPublicClient({
      chain: {
        id: parseInt(chain.chainId, 10),
        name: chain.name,
        nativeCurrency: {
          name: chain.currency,
          symbol: chain.currency,
          decimals: 18,
        },
        rpcUrls: {
          default: { http: [chain.rpcUrl] },
          public: { http: [chain.rpcUrl] },
        },
      },
      transport: http(chain.rpcUrl),
    })

    const balance = await client.getBalance({ address })
    return formatEther(balance)
  } catch {
    return '0'
  }
}

/**
 * Format balance for display
 * @param balance Balance in ETH (as string)
 * @param currency Currency symbol (e.g., "ETH", "MATIC")
 * @param maxDecimals Maximum decimal places to show (default: 4)
 * @returns Formatted balance string
 */
export function formatBalance(balance: string, currency: string, maxDecimals: number = 4): string {
  const num = parseFloat(balance)

  if (num === 0) {
    return `0 ${currency}`
  }

  // For very small amounts, show more decimals
  if (num < 0.0001) {
    return `${num.toFixed(8)} ${currency}`
  }

  // For normal amounts, limit decimals
  const formatted = num.toFixed(maxDecimals)

  // Remove trailing zeros
  const trimmed = formatted.replace(/\.?0+$/, '')

  return `${trimmed} ${currency}`
}

/**
 * Fetch balances for multiple addresses on a single chain
 * @param addresses Array of Ethereum addresses
 * @param chain Chain configuration
 * @returns Map of address to balance
 */
export async function getBalances(
  addresses: Address[],
  chain: ChainConfig
): Promise<Map<Address, string>> {
  const balances = new Map<Address, string>()

  try {
    const client = createPublicClient({
      chain: {
        id: parseInt(chain.chainId, 10),
        name: chain.name,
        nativeCurrency: {
          name: chain.currency,
          symbol: chain.currency,
          decimals: 18,
        },
        rpcUrls: {
          default: { http: [chain.rpcUrl] },
          public: { http: [chain.rpcUrl] },
        },
      },
      transport: http(chain.rpcUrl),
    })

    // Fetch all balances in parallel
    const balancePromises = addresses.map((address) =>
      client.getBalance({ address }).catch(() => BigInt(0))
    )

    const results = await Promise.all(balancePromises)

    addresses.forEach((address, index) => {
      balances.set(address, formatEther(results[index]))
    })
  } catch {
    // If batch fetch fails, set all to "0"
    addresses.forEach((address) => {
      balances.set(address, '0')
    })
  }

  return balances
}
