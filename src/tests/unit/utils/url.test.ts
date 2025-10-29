import { describe, it, expect } from 'vitest'
import { convertToStagingUrl } from '../../../utils/url.js'

describe('convertToStagingUrl', () => {
  describe('when useStaging is false', () => {
    it('should return the original URL unchanged', () => {
      const url = 'https://safe-transaction-mainnet.safe.global'
      expect(convertToStagingUrl(url, false)).toBe(url)
    })

    it('should handle URLs with different networks', () => {
      const urls = [
        'https://safe-transaction-sepolia.safe.global',
        'https://safe-transaction-polygon.safe.global',
        'https://safe-transaction-arbitrum.safe.global',
      ]

      urls.forEach((url) => {
        expect(convertToStagingUrl(url, false)).toBe(url)
      })
    })
  })

  describe('when useStaging is true', () => {
    it('should convert safe.global to staging.5afe.dev', () => {
      const url = 'https://safe-transaction-mainnet.safe.global'
      const expected = 'https://safe-transaction-mainnet.staging.5afe.dev'
      expect(convertToStagingUrl(url, true)).toBe(expected)
    })

    it('should handle URLs with different networks', () => {
      const testCases = [
        {
          input: 'https://safe-transaction-sepolia.safe.global',
          expected: 'https://safe-transaction-sepolia.staging.5afe.dev',
        },
        {
          input: 'https://safe-transaction-polygon.safe.global',
          expected: 'https://safe-transaction-polygon.staging.5afe.dev',
        },
        {
          input: 'https://safe-transaction-arbitrum.safe.global',
          expected: 'https://safe-transaction-arbitrum.staging.5afe.dev',
        },
      ]

      testCases.forEach(({ input, expected }) => {
        expect(convertToStagingUrl(input, true)).toBe(expected)
      })
    })

    it('should handle URLs with subdomain correctly', () => {
      const url = 'https://api.safe.global/v1/chains'
      const expected = 'https://api.staging.5afe.dev/v1/chains'
      expect(convertToStagingUrl(url, true)).toBe(expected)
    })

    it('should not affect URLs without safe.global', () => {
      const url = 'https://example.com/api/endpoint'
      expect(convertToStagingUrl(url, true)).toBe(url)
    })
  })
})
