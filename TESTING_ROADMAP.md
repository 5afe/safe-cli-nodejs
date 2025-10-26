# Testing Implementation Roadmap - Safe CLI

## 📋 Executive Summary

This roadmap provides a phase-based implementation plan for achieving comprehensive test coverage of the Safe CLI project. The plan is structured into 4 main phases over 7 weeks, targeting 85%+ overall code coverage with emphasis on security-critical components.

**Total Duration:** 7 weeks
**Target Coverage:** 85%+ overall, 100% for critical components
**Team Size:** 1-2 developers (can be parallelized)

---

## 🎯 Objectives

1. ✅ Achieve 85%+ overall code coverage
2. ✅ 100% coverage for ValidationService
3. ✅ Implement unit tests for all 8 services
4. ✅ Expand integration test suite
5. ✅ Create E2E test framework
6. ✅ Set up automated CI/CD pipeline
7. ✅ Establish testing best practices

---

## 📊 Roadmap Overview

```
Week 1-2: Foundation & Critical Components
  ├─ Test infrastructure setup
  ├─ ValidationService (100% coverage)
  └─ Utility layer tests

Week 3-4: Core Services
  ├─ ABIService
  ├─ TransactionBuilder
  ├─ TxBuilderParser
  └─ ContractService

Week 5-6: Integration & API Layer
  ├─ SafeService
  ├─ TransactionService
  ├─ API Service
  └─ Command layer tests

Week 7: E2E & Finalization
  ├─ E2E test framework
  ├─ Critical user journeys
  └─ Documentation & CI/CD
```

---

## Phase 1: Foundation & Critical Components
**Duration:** Week 1-2 (10 working days)
**Priority:** 🔴 CRITICAL
**Team:** 1-2 developers

### Goals

- Set up comprehensive test infrastructure
- Achieve 100% coverage for security-critical ValidationService
- Complete all utility function tests
- Establish testing patterns and conventions

### Tasks

#### Week 1: Infrastructure Setup (5 days)

##### Day 1: Test Tooling & Setup
**Estimated Time:** 4-6 hours

- [ ] **Install additional test dependencies**
  ```bash
  npm install -D @faker-js/faker
  npm install -D @vitest/spy-on
  ```

- [ ] **Create test helper directory structure**
  ```
  src/test/
  ├── helpers/
  │   ├── mocks.ts (update existing)
  │   ├── factories.ts (new)
  │   └── setup.ts (new)
  └── fixtures/
      ├── addresses.ts (new)
      ├── abis.ts (new)
      ├── transactions.ts (new)
      └── chains.ts (new)
  ```

- [ ] **Create test fixtures** (`src/test/fixtures/`)
  - `addresses.ts` - Reusable test addresses
  - `abis.ts` - Mock ABIs for common contracts
  - `transactions.ts` - Sample transaction objects
  - `chains.ts` - Test chain configurations

- [ ] **Create factory functions** (`src/test/helpers/factories.ts`)
  - `createMockPublicClient()`
  - `createMockWalletClient()`
  - `createMockSafeSDK()`
  - `createMockSafeApiKit()`

- [ ] **Update vitest.config.ts**
  - Add coverage thresholds
  - Configure test file patterns
  - Set up test environment

**Deliverables:**
- ✅ Test infrastructure ready
- ✅ Helper functions available
- ✅ Fixtures created
- ✅ Mock factories implemented

---

##### Day 2-3: ValidationService Tests (Part 1)
**Estimated Time:** 10-12 hours

**File:** `src/tests/unit/services/validation-service.test.ts`

- [ ] **Basic validation methods**
  - `validateAddress()` / `assertAddress()` (20 test cases)
  - `validatePrivateKey()` / `assertPrivateKey()` (15 test cases)
  - `validateChainId()` (10 test cases)
  - `validateUrl()` (8 test cases)

- [ ] **Test cases to implement:**
  ```typescript
  describe('ValidationService', () => {
    describe('validateAddress / assertAddress', () => {
      // Valid cases
      it('should accept valid checksummed addresses')
      it('should accept lowercase addresses and checksum them')
      it('should accept uppercase addresses and checksum them')
      it('should handle mixed case addresses correctly')

      // Invalid cases
      it('should reject invalid hex strings')
      it('should reject addresses with invalid length (< 42 chars)')
      it('should reject addresses with invalid length (> 42 chars)')
      it('should reject addresses without 0x prefix')
      it('should reject non-hex characters')
      it('should reject empty string')
      it('should reject null')
      it('should reject undefined')

      // Mode testing
      it('should return error string in validate mode')
      it('should throw ValidationError in assert mode')
      it('should include field name in error message')
    })

    describe('validatePrivateKey / assertPrivateKey', () => {
      // Valid cases
      it('should accept 32-byte hex with 0x prefix')
      it('should accept 32-byte hex without 0x prefix')
      it('should normalize by adding 0x prefix')

      // Invalid cases
      it('should reject keys shorter than 64 chars')
      it('should reject keys longer than 64 chars')
      it('should reject non-hex strings')
      it('should reject empty string')
      it('should reject null/undefined')

      // Mode testing
      it('should return error string in validate mode')
      it('should throw ValidationError in assert mode')
    })
  })
  ```

**Deliverables:**
- ✅ 50+ test cases implemented
- ✅ ~50% ValidationService coverage

---

##### Day 4-5: ValidationService Tests (Part 2)
**Estimated Time:** 10-12 hours

- [ ] **Complex validation methods**
  - `validateThreshold()` (10 test cases)
  - `validateAddresses()` (15 test cases)
  - `validateOwnerAddress()` (8 test cases)
  - `validateNonOwnerAddress()` (6 test cases)
  - `validateJson()` / `assertJson()` (12 test cases)
  - `validatePassword()` (8 test cases)
  - `validatePasswordConfirmation()` (5 test cases)

- [ ] **Test cases to implement:**
  ```typescript
  describe('validateThreshold', () => {
    it('should accept threshold = 1 for 1 owner')
    it('should accept threshold = N for N owners')
    it('should accept threshold < owner count')
    it('should reject threshold = 0')
    it('should reject threshold > owner count')
    it('should reject negative thresholds')
    it('should reject non-numeric thresholds')
  })

  describe('validateAddresses', () => {
    it('should accept array of valid addresses')
    it('should checksum all addresses in array')
    it('should reject duplicate addresses')
    it('should reject duplicate addresses (case-insensitive)')
    it('should reject array with invalid address')
    it('should reject empty array when not allowed')
    it('should accept empty array when allowed')
    it('should provide indexed error messages')
    it('should handle null/undefined')
  })

  describe('validateOwnerAddress', () => {
    it('should accept address in owners list')
    it('should accept checksummed address in owners list')
    it('should reject address not in owners list')
    it('should reject when removal would violate threshold')
    it('should accept when threshold remains valid')
  })

  describe('validateJson', () => {
    it('should parse valid JSON string')
    it('should parse nested objects')
    it('should parse arrays')
    it('should preserve data types')
    it('should reject invalid JSON')
    it('should reject non-string input')
    it('should handle empty objects')
    it('should throw detailed parse errors')
  })
  ```

**Deliverables:**
- ✅ 100% ValidationService coverage
- ✅ All validation edge cases tested
- ✅ Comprehensive error scenario coverage

---

#### Week 2: Utility Layer (5 days)

##### Day 6-7: Utility Function Tests
**Estimated Time:** 10-12 hours

**Files to create:**
- `src/tests/unit/utils/validation.test.ts`
- `src/tests/unit/utils/ethereum.test.ts`
- `src/tests/unit/utils/eip3770.test.ts`
- `src/tests/unit/utils/errors.test.ts`

- [ ] **Validation utils** (if exists, 30 test cases)
  - Address validation helpers
  - Hex string validation
  - Type guards

- [ ] **Ethereum utils** (40 test cases)
  ```typescript
  describe('Ethereum Utils', () => {
    describe('Wei/ETH Conversion', () => {
      it('should convert ETH to Wei')
      it('should convert Wei to ETH')
      it('should handle decimal places correctly')
      it('should handle large numbers')
      it('should handle zero')
    })

    describe('Gas Calculations', () => {
      it('should calculate gas cost')
      it('should handle different gas prices')
      it('should format gas units')
    })

    describe('Address Formatting', () => {
      it('should format address for display')
      it('should truncate addresses')
      it('should add checksums')
    })
  })
  ```

- [ ] **EIP-3770 utils** (25 test cases)
  ```typescript
  describe('EIP-3770 Utils', () => {
    describe('parseEIP3770Address', () => {
      it('should parse "eth:0x123..." format')
      it('should parse "matic:0x456..." format')
      it('should handle address without prefix')
      it('should validate chain short names')
      it('should reject invalid formats')
    })

    describe('formatEIP3770Address', () => {
      it('should format address with chain prefix')
      it('should use correct chain short name')
      it('should handle unknown chains')
    })
  })
  ```

- [ ] **Error utils** (15 test cases)
  ```typescript
  describe('Error Utils', () => {
    describe('Custom Error Classes', () => {
      it('should create ValidationError')
      it('should create NetworkError')
      it('should preserve stack traces')
    })

    describe('Error Formatting', () => {
      it('should format error messages')
      it('should include context')
      it('should sanitize sensitive data')
    })
  })
  ```

**Deliverables:**
- ✅ 95%+ utility layer coverage
- ✅ All edge cases covered
- ✅ Clear test documentation

---

##### Day 8-10: Phase 1 Review & Documentation
**Estimated Time:** 6-8 hours

- [ ] **Run coverage reports**
  ```bash
  npm test -- --coverage
  ```

- [ ] **Review coverage gaps**
  - Identify any missing test cases
  - Add tests for uncovered branches
  - Ensure 100% ValidationService coverage

- [ ] **Create test documentation**
  - Document testing patterns used
  - Create test writing guide
  - Document mock usage patterns

- [ ] **Code review preparation**
  - Self-review all test code
  - Check for test smells
  - Ensure consistent naming

- [ ] **Create Phase 1 completion report**
  - Coverage achieved
  - Test count summary
  - Known issues/limitations
  - Recommendations for Phase 2

**Deliverables:**
- ✅ Phase 1 completion report
- ✅ Test documentation
- ✅ Coverage report
- ✅ Ready for code review

---

### Phase 1 Success Criteria

- [x] 100% coverage for ValidationService
- [x] 95%+ coverage for utility layer
- [x] Test infrastructure fully operational
- [x] Mock factories available and documented
- [x] Test fixtures comprehensive
- [x] All tests passing in CI
- [x] Code reviewed and approved

### Phase 1 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Complex validation logic harder to test than expected | Medium | Medium | Allocate buffer time on Days 9-10 |
| Missing utility functions not documented | Low | Low | Explore codebase thoroughly on Day 1 |
| Mock setup more complex than anticipated | Medium | Low | Consult Vitest docs, use simpler mocks if needed |

---

## Phase 2: Core Services
**Duration:** Week 3-4 (10 working days)
**Priority:** 🟠 HIGH
**Team:** 1-2 developers (can parallelize)

### Goals

- Test all core business logic services
- Achieve 90%+ coverage for parsing and building services
- Establish service mocking patterns
- Cover complex edge cases

### Tasks

#### Week 3: Parsing & ABI Services (5 days)

##### Day 11-12: TxBuilderParser Tests
**Estimated Time:** 10-12 hours

**File:** `src/tests/unit/services/tx-builder-parser.test.ts`

- [ ] **Format detection & validation** (20 test cases)
  ```typescript
  describe('TxBuilderParser', () => {
    describe('isTxBuilderFormat', () => {
      it('should detect valid Transaction Builder format')
      it('should check for version field')
      it('should check for chainId field')
      it('should check for transactions array')
      it('should check for meta field')
      it('should reject invalid formats')
      it('should handle missing fields')
    })

    describe('validate', () => {
      it('should validate complete JSON structure')
      it('should reject empty transaction arrays')
      it('should validate each transaction')
      it('should require "to" address')
      it('should require data or contractMethod')
      it('should validate contractMethod structure')
      it('should provide indexed error messages')
    })
  })
  ```

- [ ] **Transaction parsing** (30 test cases)
  ```typescript
  describe('parseTransaction', () => {
    it('should parse transaction with direct data')
    it('should parse transaction with contractMethod')
    it('should handle empty data (0x)')
    it('should encode contract methods')
    it('should handle methods with no params')
    it('should handle methods with multiple params')
    it('should preserve value amounts')
  })
  ```

- [ ] **Value parsing** (15 test cases)
  ```typescript
  describe('parseValue', () => {
    it('should parse address values')
    it('should parse uint as bigint')
    it('should parse int as bigint')
    it('should parse bool as boolean')
    it('should parse bytes as hex')
    it('should parse strings')
    it('should handle numeric strings')
    it('should handle edge cases (0, max values)')
  })
  ```

**Deliverables:**
- ✅ 95%+ TxBuilderParser coverage
- ✅ All format validation tested
- ✅ Edge cases covered

---

##### Day 13-15: ABIService Tests
**Estimated Time:** 12-14 hours

**File:** `src/tests/unit/services/abi-service.test.ts`

- [ ] **Setup HTTP mocks** (Day 13 morning)
  ```typescript
  // Mock fetch for Etherscan API
  global.fetch = vi.fn((url) => {
    if (url.includes('etherscan.io/api')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          status: '1',
          message: 'OK',
          result: [{ /* ABI */ }]
        })
      })
    }
    // Sourcify mock...
  })
  ```

- [ ] **ABI fetching tests** (35 test cases)
  ```typescript
  describe('ABIService', () => {
    describe('fetchABI', () => {
      describe('with Etherscan API key', () => {
        it('should fetch from Etherscan first')
        it('should handle successful Etherscan response')
        it('should fall back to Sourcify on Etherscan failure')
        it('should return null if both fail')
        it('should handle network timeouts')
        it('should handle rate limits')
      })

      describe('without Etherscan API key', () => {
        it('should fetch from Sourcify first')
        it('should fall back to Etherscan')
      })

      describe('proxy contracts', () => {
        it('should detect EIP-1967 proxies from Etherscan')
        it('should fetch implementation ABI')
        it('should merge proxy and implementation ABIs')
        it('should handle beacon proxies')
        it('should validate implementation addresses')
      })
    })
  })
  ```

- [ ] **Etherscan integration tests** (20 test cases)
  ```typescript
  describe('fetchFromEtherscan', () => {
    it('should transform explorer URL to API URL')
    it('should handle etherscan.io')
    it('should handle polygonscan.com')
    it('should handle arbiscan.io')
    it('should use V2 API with chainid')
    it('should extract implementation from response')
    it('should handle unverified contracts')
    it('should handle API errors')
    it('should timeout after 10 seconds')
  })
  ```

- [ ] **Sourcify integration tests** (15 test cases)
  ```typescript
  describe('fetchFromSourcify', () => {
    it('should try full_match first')
    it('should fall back to partial_match')
    it('should parse contract metadata')
    it('should extract ABI from metadata.json')
    it('should handle missing matches')
    it('should handle invalid JSON responses')
  })
  ```

- [ ] **Function extraction tests** (20 test cases)
  ```typescript
  describe('extractFunctions', () => {
    it('should extract state-changing functions')
    it('should exclude view functions')
    it('should exclude pure functions')
    it('should include payable functions')
    it('should handle empty ABIs')
  })

  describe('formatFunctionSignature', () => {
    it('should format with no parameters')
    it('should format with single parameter')
    it('should format with multiple parameters')
    it('should format arrays correctly')
    it('should format tuples correctly')
  })
  ```

**Deliverables:**
- ✅ 90%+ ABIService coverage
- ✅ HTTP mocks working correctly
- ✅ Proxy detection tested
- ✅ All API sources tested

---

#### Week 4: Transaction Builder & Contract Service (5 days)

##### Day 16-17: TransactionBuilder Tests
**Estimated Time:** 10-12 hours

**File:** `src/tests/unit/services/transaction-builder.test.ts`

- [ ] **Mock @clack/prompts**
  ```typescript
  import * as clack from '@clack/prompts'

  vi.mock('@clack/prompts', () => ({
    text: vi.fn(),
    confirm: vi.fn(),
    isCancel: vi.fn()
  }))
  ```

- [ ] **Parameter validation tests** (40 test cases)
  ```typescript
  describe('TransactionBuilder', () => {
    describe('validateParameter', () => {
      describe('address type', () => {
        it('should validate addresses')
        it('should checksum addresses')
        it('should reject invalid addresses')
      })

      describe('uint/int types', () => {
        it('should accept numeric strings')
        it('should accept bigint strings')
        it('should reject non-numeric')
        it('should handle uint8...uint256')
        it('should handle int8...int256')
        it('should validate ranges')
      })

      describe('bool type', () => {
        it('should accept "true"')
        it('should accept "false"')
        it('should accept case-insensitive')
        it('should reject other strings')
      })

      describe('bytes types', () => {
        it('should accept hex with 0x')
        it('should reject without 0x')
        it('should validate length for fixed bytes')
        it('should accept any length for dynamic bytes')
      })

      describe('array types', () => {
        it('should parse comma-separated')
        it('should validate each element')
        it('should handle nested arrays')
        it('should handle fixed-size arrays')
        it('should reject incorrect sizes')
      })

      describe('tuple types', () => {
        it('should validate components')
        it('should handle nested tuples')
      })
    })
  })
  ```

- [ ] **Parameter parsing tests** (25 test cases)
  ```typescript
  describe('parseParameter', () => {
    it('should parse address')
    it('should parse uint to bigint')
    it('should parse bool to boolean')
    it('should parse bytes to hex')
    it('should parse string')
    it('should parse arrays recursively')
    it('should handle empty arrays')
    it('should throw on invalid input')
  })
  ```

- [ ] **Function call building tests** (15 test cases)
  ```typescript
  describe('buildFunctionCall', () => {
    it('should collect parameters via prompts')
    it('should encode function data')
    it('should handle payable functions')
    it('should convert ETH to Wei')
    it('should handle cancelled prompts')
    it('should return encoded data')
  })
  ```

**Deliverables:**
- ✅ 90%+ TransactionBuilder coverage
- ✅ All Solidity types tested
- ✅ Prompt mocking working
- ✅ Edge cases covered

---

##### Day 18-19: ContractService Tests
**Estimated Time:** 8-10 hours

**File:** `src/tests/unit/services/contract-service.test.ts`

- [ ] **Mock viem clients**
  ```typescript
  const mockPublicClient = {
    getCode: vi.fn(),
    getStorageAt: vi.fn(),
    readContract: vi.fn()
  }
  ```

- [ ] **Contract detection tests** (15 test cases)
  ```typescript
  describe('ContractService', () => {
    describe('isContract', () => {
      it('should return true for contracts')
      it('should return false for EOAs')
      it('should return false for zero address')
      it('should handle RPC errors gracefully')
    })
  })
  ```

- [ ] **Proxy detection tests** (30 test cases)
  ```typescript
  describe('getImplementationAddress', () => {
    describe('EIP-1967 implementation slot', () => {
      it('should read from implementation slot')
      it('should extract address from storage')
      it('should validate address is contract')
      it('should return null for empty slot')
      it('should handle invalid storage data')
    })

    describe('EIP-1967 beacon slot', () => {
      it('should fall back to beacon slot')
      it('should call implementation() on beacon')
      it('should validate beacon implementation')
      it('should handle beacon call failures')
    })

    describe('non-proxy contracts', () => {
      it('should return null for regular contracts')
    })

    describe('error handling', () => {
      it('should handle storage read errors')
      it('should handle all-zero storage')
      it('should catch and return null on errors')
    })
  })
  ```

**Deliverables:**
- ✅ 90%+ ContractService coverage
- ✅ EIP-1967 logic tested
- ✅ Proxy detection reliable
- ✅ Error handling verified

---

##### Day 20: Phase 2 Review & Documentation
**Estimated Time:** 6-8 hours

- [ ] **Run coverage reports**
  ```bash
  npm test -- src/tests/unit/services --coverage
  ```

- [ ] **Review coverage**
  - Check all services meet 90% target
  - Add tests for missed branches
  - Verify mock coverage

- [ ] **Update documentation**
  - Document service testing patterns
  - Update test writing guide
  - Document HTTP mocking approach

- [ ] **Create Phase 2 completion report**
  - Coverage by service
  - Test statistics
  - Challenges encountered
  - Recommendations for Phase 3

**Deliverables:**
- ✅ Phase 2 completion report
- ✅ Updated documentation
- ✅ All Phase 2 tests passing

---

### Phase 2 Success Criteria

- [x] 90%+ coverage for all 4 core services
- [x] HTTP mocking strategy established
- [x] Prompt mocking working
- [x] All edge cases covered
- [x] Tests passing in CI
- [x] Code reviewed

### Phase 2 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| HTTP mocking more complex than expected | Medium | Medium | Use simpler mock patterns, consult Vitest docs |
| ABIService has undocumented behaviors | Medium | Low | Review actual API responses, add integration tests |
| Transaction Builder edge cases | Low | Medium | Test with real-world transaction data |

---

## Phase 3: Integration & API Layer
**Duration:** Week 5-6 (10 working days)
**Priority:** 🟠 HIGH
**Team:** 1-2 developers

### Goals

- Test Safe SDK integration services
- Test transaction lifecycle
- Add command layer integration tests
- Achieve 85%+ coverage for integration services

### Tasks

#### Week 5: Safe & Transaction Services (5 days)

##### Day 21-22: SafeService Tests
**Estimated Time:** 10-12 hours

**File:** `src/tests/unit/services/safe-service.test.ts`

- [ ] **Mock Safe Protocol Kit**
  ```typescript
  const mockSafeSDK = {
    predictSafeAddress: vi.fn(),
    getAddress: vi.fn(),
    getOwners: vi.fn(),
    getThreshold: vi.fn(),
    getNonce: vi.fn(),
    getContractVersion: vi.fn()
  }

  vi.mock('@safe-global/protocol-kit', () => ({
    Safe: vi.fn(() => mockSafeSDK)
  }))
  ```

- [ ] **Safe creation tests** (25 test cases)
  ```typescript
  describe('SafeService', () => {
    describe('createPredictedSafe', () => {
      it('should generate counterfactual address')
      it('should use Safe version 1.4.1')
      it('should handle single owner')
      it('should handle multiple owners')
      it('should handle different thresholds')
      it('should return consistent addresses')
      it('should validate inputs')
    })
  })
  ```

- [ ] **Safe deployment tests** (20 test cases)
  ```typescript
  describe('deploySafe', () => {
    it('should deploy to predicted address')
    it('should wait for confirmation')
    it('should return transaction hash')
    it('should require private key')
    it('should handle deployment failures')
    it('should handle insufficient gas')
    it('should handle nonce errors')
  })
  ```

- [ ] **Safe info tests** (20 test cases)
  ```typescript
  describe('getSafeInfo', () => {
    describe('deployed Safes', () => {
      it('should fetch owners')
      it('should fetch threshold')
      it('should fetch nonce')
      it('should fetch version')
      it('should fetch balance')
      it('should detect deployment status')
    })

    describe('undeployed Safes', () => {
      it('should return empty owners')
      it('should return zero threshold')
      it('should indicate undeployed')
    })

    describe('error handling', () => {
      it('should handle RPC errors')
      it('should handle invalid addresses')
      it('should handle network timeouts')
    })
  })
  ```

**Deliverables:**
- ✅ 85%+ SafeService coverage
- ✅ Safe SDK mocking working
- ✅ All Safe operations tested

---

##### Day 23-24: TransactionService Tests
**Estimated Time:** 12-14 hours

**File:** `src/tests/unit/services/transaction-service.test.ts`

- [ ] **Transaction creation tests** (25 test cases)
  ```typescript
  describe('TransactionService', () => {
    describe('createTransaction', () => {
      it('should create transaction with metadata')
      it('should generate Safe tx hash')
      it('should use current nonce')
      it('should handle custom gas params')
      it('should validate inputs')
      it('should handle simple transfers')
      it('should handle contract calls')
    })
  })
  ```

- [ ] **Transaction signing tests** (20 test cases)
  ```typescript
  describe('signTransaction', () => {
    it('should sign with private key')
    it('should extract signature')
    it('should preserve metadata')
    it('should handle signing errors')
    it('should validate transaction data')
    it('should require private key')
  })
  ```

- [ ] **Transaction execution tests** (25 test cases)
  ```typescript
  describe('executeTransaction', () => {
    it('should execute with sufficient signatures')
    it('should wait for confirmation')
    it('should return tx hash')
    it('should reject insufficient signatures')
    it('should handle execution errors')
    it('should handle gas estimation')
    it('should handle nonce issues')
  })
  ```

- [ ] **Owner management tests** (20 test cases)
  ```typescript
  describe('Owner Management', () => {
    describe('createAddOwnerTransaction', () => {
      it('should create add owner tx')
      it('should validate new owner')
      it('should generate correct data')
    })

    describe('createRemoveOwnerTransaction', () => {
      it('should create remove owner tx')
      it('should validate owner exists')
      it('should adjust threshold if needed')
      it('should prevent invalid threshold')
    })

    describe('createChangeThresholdTransaction', () => {
      it('should create threshold change tx')
      it('should validate new threshold')
    })
  })
  ```

**Deliverables:**
- ✅ 85%+ TransactionService coverage
- ✅ Full transaction lifecycle tested
- ✅ Owner management tested

---

##### Day 25: SafeTransactionServiceAPI Tests
**Estimated Time:** 8-10 hours

**File:** `src/tests/unit/services/api-service.test.ts`

- [ ] **Mock Safe API Kit**
  ```typescript
  const mockApiKit = {
    proposeTransaction: vi.fn(),
    confirmTransaction: vi.fn(),
    getTransaction: vi.fn(),
    getPendingTransactions: vi.fn(),
    getAllTransactions: vi.fn()
  }

  vi.mock('@safe-global/api-kit', () => ({
    SafeApiKit: vi.fn(() => mockApiKit)
  }))
  ```

- [ ] **API integration tests** (40 test cases)
  ```typescript
  describe('SafeTransactionServiceAPI', () => {
    describe('proposeTransaction', () => {
      it('should submit with signature')
      it('should require tx service URL')
      it('should checksum addresses')
      it('should default gas params to 0')
      it('should handle API errors')
      it('should handle rate limits')
    })

    describe('confirmTransaction', () => {
      it('should add signature')
      it('should handle already signed')
      it('should handle not found')
    })

    describe('getPendingTransactions', () => {
      it('should fetch unsigned txs')
      it('should fetch partial signed')
      it('should exclude executed')
    })

    describe('getTransaction', () => {
      it('should fetch by hash')
      it('should return null for 404')
      it('should throw for other errors')
    })
  })
  ```

**Deliverables:**
- ✅ 85%+ API service coverage
- ✅ All API methods tested
- ✅ Error handling verified

---

#### Week 6: Command Layer Integration Tests (5 days)

##### Day 26-27: Config & Wallet Command Tests
**Estimated Time:** 10-12 hours

**Files to create:**
- `src/tests/integration/commands/config-commands.test.ts`
- `src/tests/integration/commands/wallet-commands.test.ts`

- [ ] **Config command tests** (30 test cases)
  ```typescript
  describe('Config Commands', () => {
    describe('config init', () => {
      it('should initialize with default chains')
      it('should prompt for API keys')
      it('should save configuration')
      it('should not overwrite existing config')
    })

    describe('config show', () => {
      it('should display current config')
      it('should show all chains')
      it('should show API key status (without revealing keys)')
    })

    describe('config chains', () => {
      it('should list all configured chains')
      it('should add new chain')
      it('should remove chain')
      it('should validate chain data')
      it('should prevent duplicate chain IDs')
    })
  })
  ```

- [ ] **Wallet command tests** (35 test cases)
  ```typescript
  describe('Wallet Commands', () => {
    describe('wallet import', () => {
      it('should import with private key')
      it('should encrypt with password')
      it('should validate private key')
      it('should set as active if first')
      it('should prevent duplicate imports')
    })

    describe('wallet list', () => {
      it('should list all wallets')
      it('should indicate active wallet')
      it('should show addresses')
      it('should handle no wallets')
    })

    describe('wallet use', () => {
      it('should switch active wallet')
      it('should validate wallet exists')
      it('should update config')
    })

    describe('wallet remove', () => {
      it('should remove wallet')
      it('should update active if needed')
      it('should confirm deletion')
    })
  })
  ```

**Deliverables:**
- ✅ Config command integration tests
- ✅ Wallet command integration tests
- ✅ User flow validated

---

##### Day 28-29: Account & Transaction Command Tests
**Estimated Time:** 12-14 hours

**Files to create:**
- `src/tests/integration/commands/account-commands.test.ts`
- `src/tests/integration/commands/tx-commands.test.ts`

- [ ] **Account command tests** (45 test cases)
  ```typescript
  describe('Account Commands', () => {
    describe('account create', () => {
      it('should create predicted Safe')
      it('should prompt for owners')
      it('should prompt for threshold')
      it('should save Safe config')
      it('should validate inputs')
    })

    describe('account deploy', () => {
      it('should deploy Safe to chain')
      it('should verify deployment')
      it('should handle deployment errors')
    })

    describe('account open', () => {
      it('should add existing Safe')
      it('should validate Safe exists on chain')
      it('should fetch Safe info')
    })

    describe('account info', () => {
      it('should display Safe details')
      it('should show owners')
      it('should show threshold')
      it('should show balance')
    })

    describe('account add-owner', () => {
      it('should create add owner transaction')
      it('should validate new owner')
      it('should prompt for signing')
    })

    describe('account remove-owner', () => {
      it('should create remove owner transaction')
      it('should adjust threshold if needed')
      it('should validate threshold remains valid')
    })

    describe('account change-threshold', () => {
      it('should create threshold change transaction')
      it('should validate new threshold')
    })
  })
  ```

- [ ] **Transaction command tests** (50 test cases)
  ```typescript
  describe('Transaction Commands', () => {
    describe('tx create', () => {
      it('should create simple transfer')
      it('should create contract call')
      it('should fetch ABI for contracts')
      it('should build function call interactively')
      it('should save transaction locally')
    })

    describe('tx sign', () => {
      it('should sign transaction')
      it('should add signature to storage')
      it('should validate transaction exists')
    })

    describe('tx execute', () => {
      it('should execute with sufficient signatures')
      it('should reject insufficient signatures')
      it('should wait for confirmation')
      it('should update transaction status')
    })

    describe('tx list', () => {
      it('should list all transactions')
      it('should filter by Safe')
      it('should filter by status')
      it('should show signature count')
    })

    describe('tx status', () => {
      it('should show current status')
      it('should show signatures')
      it('should indicate if executable')
    })

    describe('tx export', () => {
      it('should export as JSON')
      it('should include all metadata')
      it('should include signatures')
    })

    describe('tx import', () => {
      it('should import from JSON')
      it('should validate format')
      it('should merge signatures')
    })

    describe('tx push', () => {
      it('should upload to transaction service')
      it('should require service URL')
      it('should handle API errors')
    })

    describe('tx pull', () => {
      it('should download pending transactions')
      it('should merge with local storage')
      it('should handle conflicts')
    })
  })
  ```

**Deliverables:**
- ✅ Account command integration tests
- ✅ Transaction command integration tests
- ✅ Complete command coverage

---

##### Day 30: Phase 3 Review & Documentation
**Estimated Time:** 6-8 hours

- [ ] **Run full test suite**
  ```bash
  npm test -- --coverage
  ```

- [ ] **Coverage analysis**
  - Verify 85%+ overall coverage
  - Check all services meet targets
  - Identify remaining gaps

- [ ] **Integration test review**
  - Verify command tests work end-to-end
  - Check for test isolation issues
  - Review test performance

- [ ] **Create Phase 3 completion report**
  - Coverage by component
  - Integration test coverage
  - Command test coverage
  - Known issues
  - Phase 4 preparation

**Deliverables:**
- ✅ Phase 3 completion report
- ✅ Full coverage report
- ✅ Ready for Phase 4

---

### Phase 3 Success Criteria

- [x] 85%+ coverage for all 3 integration services
- [x] All command layer integration tests implemented
- [x] 80%+ command coverage
- [x] All tests passing
- [x] Overall coverage 75%+
- [x] Code reviewed

### Phase 3 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Safe SDK mocking challenges | High | Medium | Use spy patterns, minimal mocking, integration tests |
| Command tests slow | Medium | Medium | Use beforeAll for setup, optimize fixtures |
| Test interdependencies | Medium | Low | Ensure proper cleanup, use isolated storage |

---

## Phase 4: E2E Tests & Finalization
**Duration:** Week 7 (5 working days)
**Priority:** 🟡 MEDIUM
**Team:** 1 developer

### Goals

- Create E2E test framework
- Test critical user workflows
- Set up CI/CD automation
- Achieve 85%+ overall coverage
- Complete documentation

### Tasks

#### Week 7: E2E & CI/CD (5 days)

##### Day 31-32: E2E Test Framework Setup
**Estimated Time:** 10-12 hours

- [ ] **Install E2E dependencies**
  ```bash
  npm install -D anvil @viem/anvil
  npm install -D @safe-global/protocol-kit-test-utils
  ```

- [ ] **Create E2E test infrastructure**
  ```typescript
  // src/tests/e2e/setup.ts

  import { startAnvil, deployContracts } from './helpers'

  export async function setupE2EEnvironment() {
    // Start local blockchain
    const anvil = await startAnvil()

    // Deploy Safe contracts
    const contracts = await deployContracts(anvil)

    // Setup test wallets
    const wallets = await setupTestWallets()

    return { anvil, contracts, wallets }
  }
  ```

- [ ] **Create E2E test helpers**
  ```typescript
  // src/tests/e2e/helpers/cli-runner.ts

  export async function runCommand(command: string, inputs: string[]) {
    // Execute CLI command
    // Mock user inputs
    // Capture output
    // Return results
  }

  export async function expectOutput(
    command: string,
    expectedText: string
  ) {
    // Run command and verify output
  }
  ```

**Deliverables:**
- ✅ E2E infrastructure ready
- ✅ Local testnet working
- ✅ CLI command runner implemented
- ✅ Test helpers created

---

##### Day 33-34: E2E User Journey Tests
**Estimated Time:** 10-12 hours

**File:** `src/tests/e2e/user-journeys.test.ts`

- [ ] **Setup workflow** (1 test, ~30 min)
  ```typescript
  describe('E2E: First-Time Setup', () => {
    it('should complete setup: init → import wallet → create Safe', async () => {
      // 1. config init
      await runCommand('safe config init', [])

      // 2. wallet import
      await runCommand('safe wallet import', [
        'Test Wallet',
        TEST_PRIVATE_KEY,
        TEST_PASSWORD
      ])

      // 3. account create
      await runCommand('safe account create', [
        'My Safe',
        '1', // threshold
        TEST_ADDRESS // owner
      ])

      // Verify Safe created
      const safes = await getSafes()
      expect(safes).toHaveLength(1)
    })
  })
  ```

- [ ] **Send ETH workflow** (1 test, ~30 min)
  ```typescript
  describe('E2E: Send ETH', () => {
    it('should create → sign → execute simple transfer', async () => {
      // Deploy Safe first
      await deploySafe()

      // Fund Safe
      await fundSafe('1.0')

      // Create transaction
      await runCommand('safe tx create', [
        SAFE_ADDRESS,
        RECIPIENT_ADDRESS,
        '0.5', // amount in ETH
        '0x' // data
      ])

      // Sign
      await runCommand('safe tx sign', [TX_HASH])

      // Execute
      await runCommand('safe tx execute', [TX_HASH])

      // Verify balance changed
      const balance = await getBalance(RECIPIENT_ADDRESS)
      expect(balance).toBe('0.5')
    })
  })
  ```

- [ ] **Contract interaction workflow** (1 test, ~45 min)
  ```typescript
  describe('E2E: Contract Interaction', () => {
    it('should create → sign → execute contract call', async () => {
      // Deploy test ERC20
      const token = await deployERC20()

      // Create transaction (transfer tokens)
      await runCommand('safe tx create', [
        SAFE_ADDRESS,
        token.address,
        '0', // no ETH
        'transfer', // function
        RECIPIENT_ADDRESS, // to
        '1000000000000000000' // amount
      ])

      // Sign and execute
      await runCommand('safe tx sign', [TX_HASH])
      await runCommand('safe tx execute', [TX_HASH])

      // Verify token transfer
      const balance = await token.balanceOf(RECIPIENT_ADDRESS)
      expect(balance).toBe('1000000000000000000')
    })
  })
  ```

- [ ] **Multi-sig coordination workflow** (1 test, ~60 min)
  ```typescript
  describe('E2E: Multi-sig Coordination', () => {
    it('should coordinate: create → push → sign (2 owners) → execute', async () => {
      // Create 2-of-2 Safe
      await createMultisigSafe([OWNER1, OWNER2], 2)

      // Owner 1: Create and push
      await switchWallet(OWNER1)
      await runCommand('safe tx create', [...])
      await runCommand('safe tx sign', [TX_HASH])
      await runCommand('safe tx push', [TX_HASH])

      // Owner 2: Pull and sign
      await switchWallet(OWNER2)
      await runCommand('safe tx pull')
      await runCommand('safe tx sign', [TX_HASH])
      await runCommand('safe tx push', [TX_HASH])

      // Execute (either owner)
      await runCommand('safe tx execute', [TX_HASH])

      // Verify executed
      const tx = await getTransaction(TX_HASH)
      expect(tx.status).toBe('executed')
    })
  })
  ```

- [ ] **Owner management workflow** (1 test, ~45 min)
  ```typescript
  describe('E2E: Owner Management', () => {
    it('should add owner → increase threshold → remove owner', async () => {
      // Add owner
      await runCommand('safe account add-owner', [
        SAFE_ADDRESS,
        NEW_OWNER_ADDRESS
      ])

      // Sign and execute
      await signAndExecute(TX_HASH)

      // Verify owner added
      const owners = await getSafeOwners(SAFE_ADDRESS)
      expect(owners).toContain(NEW_OWNER_ADDRESS)

      // Change threshold
      await runCommand('safe account change-threshold', [
        SAFE_ADDRESS,
        '2'
      ])
      await signAndExecute(TX_HASH)

      // Remove owner
      await runCommand('safe account remove-owner', [
        SAFE_ADDRESS,
        NEW_OWNER_ADDRESS
      ])
      await signAndExecute(TX_HASH)

      // Verify changes
      const finalOwners = await getSafeOwners(SAFE_ADDRESS)
      expect(finalOwners).not.toContain(NEW_OWNER_ADDRESS)
      const threshold = await getSafeThreshold(SAFE_ADDRESS)
      expect(threshold).toBe(1)
    })
  })
  ```

**Deliverables:**
- ✅ 5 critical user journeys tested
- ✅ End-to-end flows validated
- ✅ Real blockchain interactions tested

---

##### Day 35: CI/CD Pipeline Setup
**Estimated Time:** 6-8 hours

- [ ] **Create GitHub Actions workflow**

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-and-integration:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --run --coverage

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          echo "Coverage: $COVERAGE%"
          if (( $(echo "$COVERAGE < 85" | bc -l) )); then
            echo "❌ Coverage $COVERAGE% is below 85% threshold"
            exit 1
          fi
          echo "✅ Coverage meets 85% threshold"

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          fail_ci_if_error: true

      - name: Archive test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            coverage/
            test-results/

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: unit-and-integration

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Anvil
        run: |
          curl -L https://foundry.paradigm.xyz | bash
          foundryup

      - name: Build CLI
        run: npm run build

      - name: Run E2E tests
        run: npm test -- src/tests/e2e --run
        env:
          CI: true

      - name: Archive E2E results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: e2e-results
          path: test-results/e2e/
```

- [ ] **Configure branch protection rules**
  - Require tests to pass before merging
  - Require 85%+ coverage
  - Require code review

- [ ] **Set up Codecov**
  - Create Codecov account
  - Add repository
  - Configure coverage thresholds
  - Add badge to README

**Deliverables:**
- ✅ CI/CD pipeline working
- ✅ Automated test execution
- ✅ Coverage reporting automated
- ✅ Branch protection configured

---

##### Day 36: Documentation & Final Review
**Estimated Time:** 6-8 hours

- [ ] **Create test documentation**

**File:** `TESTING.md`

```markdown
# Testing Guide

## Running Tests

### All tests
\`\`\`bash
npm test
\`\`\`

### Unit tests only
\`\`\`bash
npm test -- src/tests/unit
\`\`\`

### Integration tests only
\`\`\`bash
npm test -- src/tests/integration
\`\`\`

### E2E tests
\`\`\`bash
npm test -- src/tests/e2e
\`\`\`

### With coverage
\`\`\`bash
npm test -- --coverage
\`\`\`

### Watch mode
\`\`\`bash
npm test -- --watch
\`\`\`

### UI mode
\`\`\`bash
npm run test:ui
\`\`\`

## Writing Tests

### Test Structure
[Guidelines...]

### Mocking Guidelines
[Patterns...]

### Best Practices
[List...]

## Coverage Requirements

- Overall: 85%+
- ValidationService: 100%
- Core services: 90%+
- Integration services: 85%+
```

- [ ] **Update main README**
  - Add testing section
  - Add coverage badge
  - Link to TESTING.md

- [ ] **Create final project report**

**File:** `TESTING_COMPLETION_REPORT.md`

```markdown
# Testing Implementation - Final Report

## Summary

- Total tests: XXX
- Total coverage: XX%
- Duration: 7 weeks
- Status: ✅ Complete

## Coverage by Component

| Component | Coverage | Tests | Status |
|-----------|----------|-------|--------|
| ValidationService | 100% | XX | ✅ |
| Utilities | 95% | XX | ✅ |
| Core Services | 90% | XX | ✅ |
| ...

## Achievements

- [x] 85%+ overall coverage
- [x] All critical paths tested
- [x] CI/CD automated
- ...

## Known Limitations

...

## Recommendations

...
```

- [ ] **Final code review**
  - Review all test code
  - Check for code smells
  - Verify documentation
  - Test CI/CD pipeline

- [ ] **Run full test suite**
  ```bash
  npm run typecheck
  npm run lint
  npm test -- --coverage
  ```

**Deliverables:**
- ✅ Complete test documentation
- ✅ Updated README
- ✅ Final completion report
- ✅ All tests passing
- ✅ Coverage targets met

---

### Phase 4 Success Criteria

- [x] E2E framework implemented
- [x] 5+ critical user journeys tested
- [x] CI/CD pipeline operational
- [x] 85%+ overall coverage achieved
- [x] Documentation complete
- [x] All tests passing in CI
- [x] Final review completed

### Phase 4 Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Anvil setup issues | Medium | Low | Use Docker alternative, detailed setup docs |
| E2E tests flaky | Medium | Medium | Add retries, proper cleanup, longer timeouts |
| CI/CD configuration issues | High | Low | Test locally with act, thorough documentation |

---

## Progress Tracking

### Weekly Checklist

Use this checklist to track progress:

#### Week 1
- [ ] Day 1: Test tooling setup
- [ ] Day 2-3: ValidationService (Part 1)
- [ ] Day 4-5: ValidationService (Part 2)

#### Week 2
- [ ] Day 6-7: Utility tests
- [ ] Day 8-10: Phase 1 review

#### Week 3
- [ ] Day 11-12: TxBuilderParser tests
- [ ] Day 13-15: ABIService tests

#### Week 4
- [ ] Day 16-17: TransactionBuilder tests
- [ ] Day 18-19: ContractService tests
- [ ] Day 20: Phase 2 review

#### Week 5
- [ ] Day 21-22: SafeService tests
- [ ] Day 23-24: TransactionService tests
- [ ] Day 25: API service tests

#### Week 6
- [ ] Day 26-27: Config & Wallet commands
- [ ] Day 28-29: Account & TX commands
- [ ] Day 30: Phase 3 review

#### Week 7
- [ ] Day 31-32: E2E framework
- [ ] Day 33-34: E2E journeys
- [ ] Day 35: CI/CD setup
- [ ] Day 36: Documentation & review

---

## Key Metrics

### Coverage Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Overall Coverage | 85% | -% | 🟡 In Progress |
| ValidationService | 100% | -% | 🟡 Phase 1 |
| Core Services | 90% | -% | 🟡 Phase 2 |
| Integration Services | 85% | -% | 🟡 Phase 3 |
| Command Layer | 80% | -% | 🟡 Phase 3 |

### Test Count

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| Unit Tests | 800+ | 0 | 🟡 In Progress |
| Integration Tests | 200+ | 4 | 🟡 Expanding |
| E2E Tests | 5+ | 0 | 🟡 Phase 4 |
| **Total** | **1000+** | **4** | 🟡 In Progress |

---

## Resource Requirements

### Team

- **1-2 developers** (can work in parallel on Phases 2-3)
- **Part-time code reviewer** (end of each phase)

### Tools & Services

- ✅ Vitest (already installed)
- ✅ Coverage reporting (already installed)
- ⬜ Codecov account (free for open source)
- ⬜ GitHub Actions (included with GitHub)
- ⬜ Local blockchain (Anvil, free)

### Time Investment

- **Total:** 7 weeks (~280 hours)
- **Average:** 8 hours/day
- **Buffer:** 10-15% for unexpected issues

---

## Risk Management

### High-Level Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Scope creep | Medium | High | Strict phase boundaries, defer non-critical tests |
| Complex mocking | Medium | Medium | Start simple, iterate, use integration tests when needed |
| Flaky E2E tests | Medium | Medium | Proper setup/teardown, timeouts, retries |
| CI/CD issues | Low | High | Test locally first, thorough documentation |
| Coverage not met | Low | High | Weekly reviews, adjust strategy early |

---

## Communication Plan

### Phase Completion

After each phase:
1. Run full test suite
2. Generate coverage report
3. Create phase completion document
4. Schedule code review
5. Update roadmap progress

### Weekly Status

Every Friday:
- Coverage metrics
- Tests implemented
- Blockers/challenges
- Next week plan

---

## Success Definition

The testing implementation will be considered **successful** when:

- ✅ 85%+ overall code coverage achieved
- ✅ 100% coverage for ValidationService
- ✅ All critical user paths have E2E tests
- ✅ CI/CD pipeline is operational and passing
- ✅ All tests are passing consistently
- ✅ Test documentation is complete
- ✅ Team can maintain tests independently

---

## Next Steps

### Immediate Actions (This Week)

1. **Review and approve this roadmap**
   - Stakeholder signoff
   - Confirm timeline
   - Allocate resources

2. **Begin Phase 1**
   - Install dependencies
   - Create test infrastructure
   - Start ValidationService tests

3. **Set up tracking**
   - Create project board
   - Set up weekly check-ins
   - Configure metrics dashboard

### Long-term Maintenance

After completion:
- Maintain 85%+ coverage for new code
- Add tests for new features
- Regular test review (quarterly)
- Update documentation as needed

---

## Appendix

### Useful Commands

```bash
# Run specific test file
npm test -- src/tests/unit/services/validation-service.test.ts

# Run tests matching pattern
npm test -- --grep "validateAddress"

# Run with verbose output
npm test -- --reporter=verbose

# Generate HTML coverage report
npm test -- --coverage --coverage.reporter=html

# Run in watch mode for specific file
npm test -- src/tests/unit/services/validation-service.test.ts --watch

# Check coverage without running tests
npm run typecheck && npm test -- --coverage --run
```

### Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Safe Core SDK](https://docs.safe.global/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Roadmap Version:** 1.0
**Last Updated:** 2025-10-26
**Status:** 🟡 Ready to Begin
**Next Milestone:** Phase 1 - Week 1
