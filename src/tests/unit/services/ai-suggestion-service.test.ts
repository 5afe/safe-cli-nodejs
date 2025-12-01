import { describe, it, expect, beforeEach } from 'vitest'
import { AISuggestionService } from '../../../services/ai-suggestion-service.js'

describe('AISuggestionService', () => {
  let service: AISuggestionService

  beforeEach(() => {
    service = new AISuggestionService()
  })

  describe('maskAddresses', () => {
    it('should mask a single Ethereum address', () => {
      const input = 'send 0x1234567890abcdef1234567890abcdef12345678 100'
      const result = service.maskAddresses(input)
      expect(result).toBe('send 0xAAAA 100')
    })

    it('should mask multiple different addresses with unique placeholders', () => {
      const input =
        'transfer 0x1111111111111111111111111111111111111111 to 0x2222222222222222222222222222222222222222'
      const result = service.maskAddresses(input)
      expect(result).toBe('transfer 0xAAAA to 0xBBBB')
    })

    it('should use the same placeholder for repeated addresses', () => {
      const input =
        'from 0x1234567890abcdef1234567890abcdef12345678 to 0x9999999999999999999999999999999999999999 via 0x1234567890abcdef1234567890abcdef12345678'
      const result = service.maskAddresses(input)
      expect(result).toBe('from 0xAAAA to 0xBBBB via 0xAAAA')
    })

    it('should mask short hex values starting with 0x', () => {
      const input = 'value 0x123 and 0xabc'
      const result = service.maskAddresses(input)
      expect(result).toBe('value 0xAAAA and 0xBBBB')
    })

    it('should return input unchanged if no addresses', () => {
      const input = 'wallet list'
      const result = service.maskAddresses(input)
      expect(result).toBe('wallet list')
    })

    it('should handle empty string', () => {
      const input = ''
      const result = service.maskAddresses(input)
      expect(result).toBe('')
    })

    it('should handle many addresses and cycle through placeholders', () => {
      const addresses = Array.from(
        { length: 5 },
        (_, i) => `0x${(i + 1).toString().repeat(40).slice(0, 40)}`
      )
      const input = addresses.join(' ')
      const result = service.maskAddresses(input)
      expect(result).toBe('0xAAAA 0xBBBB 0xCCCC 0xDDDD 0xEEEE')
    })
  })

  describe('unmaskAddresses', () => {
    it('should unmask a single address', () => {
      const originalInput = 'send 0x1234567890abcdef1234567890abcdef12345678 100'
      service.maskAddresses(originalInput)

      const aiResponse = 'You should use: safe tx create --to 0xAAAA --value 100'
      const result = service.unmaskAddresses(aiResponse)
      expect(result).toBe(
        'You should use: safe tx create --to 0x1234567890abcdef1234567890abcdef12345678 --value 100'
      )
    })

    it('should unmask multiple addresses', () => {
      const originalInput =
        'transfer 0x1111111111111111111111111111111111111111 to 0x2222222222222222222222222222222222222222'
      service.maskAddresses(originalInput)

      const aiResponse = 'Try: safe tx create from 0xAAAA to 0xBBBB'
      const result = service.unmaskAddresses(aiResponse)
      expect(result).toBe(
        'Try: safe tx create from 0x1111111111111111111111111111111111111111 to 0x2222222222222222222222222222222222222222'
      )
    })

    it('should handle case-insensitive placeholder matching', () => {
      const originalInput = 'send 0x1234567890abcdef1234567890abcdef12345678 100'
      service.maskAddresses(originalInput)

      const aiResponse = 'Use 0xaaaa or 0xAAAA'
      const result = service.unmaskAddresses(aiResponse)
      expect(result).toBe(
        'Use 0x1234567890abcdef1234567890abcdef12345678 or 0x1234567890abcdef1234567890abcdef12345678'
      )
    })

    it('should return response unchanged if no placeholders to unmask', () => {
      service.maskAddresses('wallet list') // No addresses masked

      const aiResponse = 'Try: safe wallet list'
      const result = service.unmaskAddresses(aiResponse)
      expect(result).toBe('Try: safe wallet list')
    })

    it('should handle response with no matching placeholders', () => {
      const originalInput = 'send 0x1234567890abcdef1234567890abcdef12345678 100'
      service.maskAddresses(originalInput)

      const aiResponse = 'Invalid command, try safe --help'
      const result = service.unmaskAddresses(aiResponse)
      expect(result).toBe('Invalid command, try safe --help')
    })
  })

  describe('mask and unmask roundtrip', () => {
    it('should correctly roundtrip a complex command', () => {
      const originalInput =
        'account add-owner sep:0xAbCdEf1234567890AbCdEf1234567890AbCdEf12 0x9876543210fedcba9876543210fedcba98765432'
      const masked = service.maskAddresses(originalInput)

      expect(masked).not.toContain('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12')
      expect(masked).not.toContain('0x9876543210fedcba9876543210fedcba98765432')
      expect(masked).toContain('0xAAAA')
      expect(masked).toContain('0xBBBB')

      const aiResponse = `It looks like you want to add an owner. Try:
safe account add-owner sep:0xAAAA 0xBBBB --threshold 2`

      const unmasked = service.unmaskAddresses(aiResponse)
      expect(unmasked).toContain('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12')
      expect(unmasked).toContain('0x9876543210fedcba9876543210fedcba98765432')
    })

    it('should preserve non-address parts of the command', () => {
      const originalInput = 'tx create --to 0x1234567890123456789012345678901234567890 --value 1000'
      const masked = service.maskAddresses(originalInput)

      expect(masked).toBe('tx create --to 0xAAAA --value 1000')

      const aiResponse = 'Use: safe tx create --to 0xAAAA --value 1000 --data 0x'
      const unmasked = service.unmaskAddresses(aiResponse)

      expect(unmasked).toContain('0x1234567890123456789012345678901234567890')
      expect(unmasked).toContain('--value 1000')
    })
  })

  describe('getAvailableTools', () => {
    it('should return an array', async () => {
      const tools = await service.getAvailableTools()
      expect(Array.isArray(tools)).toBe(true)
    })
  })
})
