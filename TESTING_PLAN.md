# Comprehensive Testing Plan - Safe CLI

## Executive Summary

This document outlines a comprehensive testing strategy for the Safe CLI project, covering unit tests, integration tests, end-to-end tests, and test automation. The goal is to achieve high test coverage while ensuring the reliability and security of wallet and transaction operations.

---

## Current Test Coverage

### Existing Tests

**Location:** `src/tests/integration/`

1. **Wallet Integration Tests** (`wallet.test.ts`)
   - Wallet import with valid/invalid private keys
   - Multiple wallet management
   - Wallet listing and active wallet indication
   - Wallet removal and persistence

2. **Config Integration Tests** (`config.test.ts`)
   - Chain management (add, update, remove, list)
   - Chain persistence across instances
   - Chain existence checking

3. **Account Integration Tests** (`account.test.ts`)
   - Safe creation and retrieval
   - Safe information updates
   - Multi-chain Safe management
   - Multi-sig configuration storage
   - Safe persistence

4. **Transaction Integration Tests** (`transaction.test.ts`)
   - Transaction creation and retrieval
   - Transaction filtering by Safe and chain
   - Signature management (add, deduplicate)
   - Status lifecycle management
   - Transaction persistence

### Coverage Gaps

- **No unit tests** for service layer
- **No unit tests** for utility functions
- **No tests** for CLI commands
- **No tests** for UI components
- **No end-to-end tests** for user workflows
- **No tests** for error handling and edge cases in services
- **No mocking** of external dependencies (Etherscan, Sourcify, Safe APIs)

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \      E2E Tests (5%)
      /    \     - Complete user workflows
     /------\    - CLI command execution
    /        \
   /   INTE-  \  Integration Tests (25%)
  /   GRATION \  - Storage persistence
 /     TESTS   \ - Service integration
/--------------\
|              |
|     UNIT     | Unit Tests (70%)
|     TESTS    | - Services
|              | - Utils
|              | - Validation
|______________|
```

### Test Types

1. **Unit Tests (70% of test suite)**
   - Fast, isolated, no external dependencies
   - Mock all external services
   - Test individual functions and methods
   - Focus on business logic and edge cases

2. **Integration Tests (25% of test suite)**
   - Test component interactions
   - Test storage persistence
   - Test service orchestration
   - Limited external API calls (use test networks)

3. **End-to-End Tests (5% of test suite)**
   - Complete user workflows
   - CLI command execution
   - User interaction simulation
   - Real network interactions (testnet only)

---

## Detailed Testing Plan

### 1. Service Layer - Unit Tests

#### 1.1 ValidationService (`src/services/validation-service.ts`)

**Priority:** 🔴 **CRITICAL** - Security-critical component

**Test Cases:**

```typescript
describe('ValidationService', () => {
  describe('validateAddress / assertAddress', () => {
    it('should accept valid checksummed addresses')
    it('should accept valid lowercase addresses and checksum them')
    it('should reject invalid hex strings')
    it('should reject addresses with invalid length')
    it('should reject non-hex strings')
    it('should handle empty/null/undefined inputs')
    it('should throw ValidationError in assert mode')
    it('should return error string in validate mode')
  })

  describe('validatePrivateKey / assertPrivateKey', () => {
    it('should accept valid 32-byte hex private keys with 0x prefix')
    it('should accept valid private keys without 0x prefix')
    it('should reject keys with invalid length')
    it('should reject non-hex strings')
    it('should reject empty/null/undefined')
    it('should normalize private keys by adding 0x prefix')
  })

  describe('validateChainId', () => {
    it('should accept valid numeric chain IDs')
    it('should accept chain IDs as strings')
    it('should reject negative numbers')
    it('should reject non-numeric strings')
    it('should reject empty values')
  })

  describe('validateThreshold', () => {
    it('should accept threshold within owner range')
    it('should reject threshold = 0')
    it('should reject threshold > owner count')
    it('should reject negative thresholds')
    it('should handle edge case: threshold = owner count')
  })

  describe('validateAddresses', () => {
    it('should accept array of valid addresses')
    it('should reject array with duplicate addresses')
    it('should reject array with invalid addresses')
    it('should reject empty array when not allowed')
    it('should checksum all addresses in array')
    it('should provide detailed error messages with indexes')
  })

  describe('validateOwnerAddress', () => {
    it('should accept address in owners list')
    it('should reject address not in owners list')
    it('should reject when threshold would be violated')
  })

  describe('validateNonOwnerAddress', () => {
    it('should accept new addresses')
    it('should reject addresses already in owners list')
  })

  describe('validateJson / assertJson', () => {
    it('should parse valid JSON strings')
    it('should reject invalid JSON')
    it('should handle nested objects')
    it('should preserve data types')
  })

  describe('validateUrl', () => {
    it('should accept valid HTTP URLs')
    it('should accept valid HTTPS URLs')
    it('should reject invalid URLs')
    it('should reject non-URL strings')
  })

  describe('validatePassword', () => {
    it('should enforce minimum length')
    it('should accept valid passwords')
    it('should reject empty passwords')
  })

  describe('validatePasswordConfirmation', () => {
    it('should accept matching passwords')
    it('should reject non-matching passwords')
  })
})
```

**Mock Requirements:** None (pure validation logic)

**Coverage Goal:** 100%

---

#### 1.2 ABIService (`src/services/abi-service.ts`)

**Priority:** 🟠 **HIGH** - Core functionality for contract interaction

**Test Cases:**

```typescript
describe('ABIService', () => {
  describe('fetchABI', () => {
    describe('with Etherscan API key', () => {
      it('should fetch from Etherscan first')
      it('should fall back to Sourcify if Etherscan fails')
      it('should return null if both sources fail')
      it('should handle network timeouts')
      it('should handle API rate limits')
    })

    describe('without Etherscan API key', () => {
      it('should fetch from Sourcify first')
      it('should fall back to Etherscan if Sourcify fails')
    })

    describe('proxy contract handling', () => {
      it('should detect EIP-1967 proxies')
      it('should fetch implementation ABI for proxies')
      it('should merge proxy and implementation ABIs')
      it('should handle beacon proxies')
    })

    describe('error handling', () => {
      it('should handle unverified contracts')
      it('should handle network errors')
      it('should handle invalid responses')
    })
  })

  describe('fetchFromEtherscan', () => {
    it('should transform explorer URL to API URL')
    it('should handle subdomain variations')
    it('should use V2 API with chainid parameter')
    it('should extract proxy implementation address')
    it('should handle API errors gracefully')
    it('should timeout after configured duration')
  })

  describe('fetchFromSourcify', () => {
    it('should try full_match first')
    it('should fall back to partial_match')
    it('should parse contract metadata correctly')
    it('should extract ABI from metadata')
    it('should handle missing matches')
  })

  describe('extractFunctions', () => {
    it('should extract only state-changing functions')
    it('should exclude view functions')
    it('should exclude pure functions')
    it('should include payable functions')
  })

  describe('extractViewFunctions', () => {
    it('should extract only view functions')
    it('should extract pure functions')
    it('should exclude state-changing functions')
  })

  describe('formatFunctionSignature', () => {
    it('should format function with no parameters')
    it('should format function with single parameter')
    it('should format function with multiple parameters')
    it('should format function with complex types (arrays, tuples)')
  })
})
```

**Mock Requirements:**
- HTTP fetch (Etherscan and Sourcify APIs)
- Contract service for proxy detection

**Coverage Goal:** 90%

---

#### 1.3 TransactionBuilder (`src/services/transaction-builder.ts`)

**Priority:** 🟠 **HIGH** - User input handling

**Test Cases:**

```typescript
describe('TransactionBuilder', () => {
  describe('validateParameter', () => {
    describe('address type', () => {
      it('should accept valid addresses')
      it('should reject invalid addresses')
      it('should checksum addresses')
    })

    describe('uint/int types', () => {
      it('should accept valid numbers')
      it('should accept bigint strings')
      it('should reject non-numeric values')
      it('should handle different sizes (uint8, uint256, etc.)')
    })

    describe('bool type', () => {
      it('should accept "true" and "false"')
      it('should accept case-insensitive variations')
      it('should reject non-boolean strings')
    })

    describe('bytes types', () => {
      it('should accept valid hex strings')
      it('should require 0x prefix')
      it('should reject odd-length hex')
      it('should validate fixed-size bytes (bytes32, etc.)')
    })

    describe('string type', () => {
      it('should accept any string')
      it('should handle empty strings')
    })

    describe('array types', () => {
      it('should parse comma-separated values')
      it('should validate each element')
      it('should handle nested arrays')
      it('should handle fixed-size arrays')
    })

    describe('tuple types', () => {
      it('should validate tuple components')
      it('should handle nested tuples')
    })
  })

  describe('parseParameter', () => {
    it('should parse address type')
    it('should parse uint/int to bigint')
    it('should parse bool to boolean')
    it('should parse bytes to hex')
    it('should parse string as-is')
    it('should parse arrays recursively')
    it('should handle empty arrays')
  })

  describe('buildFunctionCall', () => {
    it('should collect all parameters')
    it('should encode function data')
    it('should handle payable functions')
    it('should convert ETH to Wei')
    it('should handle cancelled prompts')
  })
})
```

**Mock Requirements:**
- `@clack/prompts` for user input

**Coverage Goal:** 90%

---

#### 1.4 TxBuilderParser (`src/services/tx-builder-parser.ts`)

**Priority:** 🟠 **HIGH** - Data integrity critical

**Test Cases:**

```typescript
describe('TxBuilderParser', () => {
  describe('isTxBuilderFormat', () => {
    it('should detect valid Transaction Builder format')
    it('should reject invalid formats')
    it('should require all mandatory fields')
    it('should handle optional fields')
  })

  describe('validate', () => {
    it('should validate complete transaction builder JSON')
    it('should reject empty transaction arrays')
    it('should validate each transaction in array')
    it('should require "to" address in transactions')
    it('should require either "data" or "contractMethod"')
    it('should validate contractMethod structure')
  })

  describe('parseTransaction', () => {
    describe('with direct data', () => {
      it('should parse transaction with hex data')
      it('should handle empty data (0x)')
    })

    describe('with contractMethod', () => {
      it('should encode method from ABI and inputs')
      it('should handle methods with no parameters')
      it('should handle methods with multiple parameters')
      it('should handle different parameter types')
    })
  })

  describe('encodeContractMethod', () => {
    it('should generate ABI from method definition')
    it('should encode function with parameters')
    it('should match parameter order')
    it('should handle missing parameter values')
  })

  describe('parseValue', () => {
    it('should parse address values')
    it('should parse uint/int values as bigint')
    it('should parse bool values as boolean')
    it('should parse bytes as hex strings')
    it('should parse string values')
    it('should handle numeric strings')
  })

  describe('parse', () => {
    it('should parse complete Transaction Builder JSON')
    it('should handle multiple transactions')
    it('should preserve transaction order')
    it('should accumulate all values')
  })
})
```

**Mock Requirements:** None (pure parsing logic)

**Coverage Goal:** 95%

---

#### 1.5 ContractService (`src/services/contract-service.ts`)

**Priority:** 🟡 **MEDIUM** - Proxy detection logic

**Test Cases:**

```typescript
describe('ContractService', () => {
  describe('isContract', () => {
    it('should return true for contract addresses')
    it('should return false for EOAs')
    it('should return false for zero address')
    it('should handle RPC errors')
  })

  describe('getImplementationAddress', () => {
    describe('EIP-1967 implementation slot', () => {
      it('should extract implementation from storage')
      it('should return null if slot is empty')
      it('should validate extracted address is contract')
    })

    describe('EIP-1967 beacon slot', () => {
      it('should fall back to beacon slot')
      it('should call implementation() on beacon')
      it('should validate beacon implementation is contract')
    })

    describe('non-proxy contracts', () => {
      it('should return null for non-proxy contracts')
    })

    describe('error handling', () => {
      it('should handle storage read errors')
      it('should handle invalid storage data')
      it('should handle beacon call failures')
    })
  })
})
```

**Mock Requirements:**
- Viem public client (getCode, getStorageAt)

**Coverage Goal:** 90%

---

#### 1.6 SafeService (`src/services/safe-service.ts`)

**Priority:** 🔴 **CRITICAL** - Core Safe operations

**Test Cases:**

```typescript
describe('SafeService', () => {
  describe('createPredictedSafe', () => {
    it('should generate counterfactual Safe address')
    it('should use correct Safe version (1.4.1)')
    it('should handle different owner configurations')
    it('should handle different threshold values')
    it('should generate consistent addresses for same inputs')
  })

  describe('deploySafe', () => {
    it('should deploy Safe to predicted address')
    it('should wait for transaction confirmation')
    it('should return transaction hash')
    it('should handle deployment failures')
    it('should require private key')
    it('should handle insufficient gas')
  })

  describe('getSafeInfo', () => {
    describe('for deployed Safes', () => {
      it('should fetch owners')
      it('should fetch threshold')
      it('should fetch nonce')
      it('should fetch version')
      it('should fetch balance')
    })

    describe('for undeployed Safes', () => {
      it('should return empty owners array')
      it('should return zero threshold')
      it('should indicate undeployed status')
    })

    describe('error handling', () => {
      it('should handle RPC errors')
      it('should handle invalid Safe addresses')
    })
  })
})
```

**Mock Requirements:**
- Safe Protocol Kit
- Viem wallet/public clients

**Coverage Goal:** 85%

---

#### 1.7 TransactionService (`src/services/transaction-service.ts`)

**Priority:** 🔴 **CRITICAL** - Transaction lifecycle

**Test Cases:**

```typescript
describe('TransactionService', () => {
  describe('createTransaction', () => {
    it('should create transaction with metadata')
    it('should generate Safe transaction hash')
    it('should use current nonce')
    it('should handle custom gas parameters')
  })

  describe('signTransaction', () => {
    it('should sign transaction with private key')
    it('should extract signature from signed transaction')
    it('should preserve transaction metadata')
    it('should handle signing errors')
  })

  describe('executeTransaction', () => {
    it('should execute with sufficient signatures')
    it('should wait for confirmation')
    it('should return transaction hash')
    it('should reject if insufficient signatures')
    it('should handle execution errors')
  })

  describe('Safe state queries', () => {
    it('should get Safe threshold')
    it('should get Safe owners')
    it('should get Safe nonce')
    it('should handle undeployed Safes')
  })

  describe('Owner management transactions', () => {
    it('should create add owner transaction')
    it('should create remove owner transaction')
    it('should create change threshold transaction')
    it('should adjust threshold when removing owner')
  })
})
```

**Mock Requirements:**
- Safe Protocol Kit
- Viem clients

**Coverage Goal:** 85%

---

#### 1.8 SafeTransactionServiceAPI (`src/services/api-service.ts`)

**Priority:** 🟡 **MEDIUM** - External API integration

**Test Cases:**

```typescript
describe('SafeTransactionServiceAPI', () => {
  describe('proposeTransaction', () => {
    it('should submit transaction with signature')
    it('should require Transaction Service URL')
    it('should checksum addresses')
    it('should default missing gas parameters')
    it('should handle API errors')
  })

  describe('confirmTransaction', () => {
    it('should add signature to existing transaction')
    it('should handle already signed transactions')
  })

  describe('getPendingTransactions', () => {
    it('should fetch unsigned transactions')
    it('should fetch partially signed transactions')
    it('should exclude executed transactions')
  })

  describe('getAllTransactions', () => {
    it('should fetch all transaction history')
    it('should handle pagination')
  })

  describe('getTransaction', () => {
    it('should fetch specific transaction by hash')
    it('should return null for non-existent transactions (404)')
    it('should throw for other errors')
  })
})
```

**Mock Requirements:**
- Safe API Kit
- HTTP responses

**Coverage Goal:** 85%

---

### 2. Utility Layer - Unit Tests

#### 2.1 Validation Utils (`src/utils/validation.ts`)

**Priority:** 🔴 **CRITICAL**

**Test Cases:**
- Address validation and checksumming
- Private key format validation
- Hex string validation
- Type guards

**Coverage Goal:** 100%

---

#### 2.2 Ethereum Utils (`src/utils/ethereum.ts`)

**Priority:** 🟠 **HIGH**

**Test Cases:**
- Wei/ETH conversions
- Gas calculations
- Address formatting
- Chain ID handling

**Coverage Goal:** 95%

---

#### 2.3 EIP-3770 Utils (`src/utils/eip3770.ts`)

**Priority:** 🟡 **MEDIUM**

**Test Cases:**
- EIP-3770 address parsing (e.g., `eth:0x123...`)
- Address formatting with chain prefix
- Chain short name resolution

**Coverage Goal:** 95%

---

#### 2.4 Error Utils (`src/utils/errors.ts`)

**Priority:** 🟡 **MEDIUM**

**Test Cases:**
- Custom error class creation
- Error message formatting
- Error type detection

**Coverage Goal:** 90%

---

### 3. Storage Layer - Integration Tests

**Current Status:** ✅ Already well covered

**Recommendations:**
- Add tests for concurrent access scenarios
- Add tests for storage corruption recovery
- Add tests for migration between versions

---

### 4. Command Layer - Integration Tests

**Priority:** 🟠 **HIGH**

**Test Structure:**

```typescript
describe('Commands', () => {
  describe('Config Commands', () => {
    it('should initialize config with default chains')
    it('should add custom chain')
    it('should remove chain')
    it('should list all chains')
  })

  describe('Wallet Commands', () => {
    it('should import wallet')
    it('should list wallets')
    it('should switch active wallet')
    it('should remove wallet')
  })

  describe('Account Commands', () => {
    it('should create new Safe')
    it('should deploy predicted Safe')
    it('should open existing Safe')
    it('should show Safe info')
    it('should add owner')
    it('should remove owner')
    it('should change threshold')
  })

  describe('Transaction Commands', () => {
    it('should create transaction')
    it('should sign transaction')
    it('should execute transaction')
    it('should list transactions')
    it('should show transaction status')
    it('should export transaction')
    it('should import transaction')
    it('should push transaction to service')
    it('should pull transactions from service')
  })
})
```

**Mock Requirements:**
- User input prompts
- Services (use spies to verify calls)

**Coverage Goal:** 80%

---

### 5. End-to-End Tests

**Priority:** 🟡 **MEDIUM**

**Test Scenarios:**

```typescript
describe('E2E Workflows', () => {
  describe('Setup Workflow', () => {
    it('should complete first-time setup: config init → wallet import → account create')
  })

  describe('Send ETH Workflow', () => {
    it('should create → sign → execute simple transfer')
  })

  describe('Contract Interaction Workflow', () => {
    it('should create contract call → sign → execute')
  })

  describe('Multi-sig Coordination Workflow', () => {
    it('should create → push → sign by multiple owners → execute')
  })

  describe('Owner Management Workflow', () => {
    it('should add owner → increase threshold → remove owner')
  })
})
```

**Test Environment:**
- Use local testnet (Hardhat/Anvil)
- Deploy test Safe contracts
- Use test wallets with known private keys

**Coverage Goal:** 5-10 critical user journeys

---

## Test Implementation Plan

### Phase 1: Foundation (Week 1-2)
**Priority:** 🔴 **CRITICAL**

1. ✅ Set up test infrastructure
   - ✅ Vitest already configured
   - Add test helper utilities
   - Configure mocking strategies

2. 🔴 **ValidationService unit tests** (100% coverage)
   - Most critical for security
   - Pure functions, easy to test
   - Blocks other tests

3. 🔴 **Utility layer unit tests** (95% coverage)
   - Small, focused functions
   - No external dependencies
   - Quick wins

### Phase 2: Core Services (Week 3-4)
**Priority:** 🟠 **HIGH**

1. **ABIService unit tests** (90% coverage)
2. **TransactionBuilder unit tests** (90% coverage)
3. **TxBuilderParser unit tests** (95% coverage)
4. **ContractService unit tests** (90% coverage)

### Phase 3: Integration Layer (Week 5-6)
**Priority:** 🟠 **HIGH**

1. **SafeService unit tests** (85% coverage)
2. **TransactionService unit tests** (85% coverage)
3. **SafeTransactionServiceAPI unit tests** (85% coverage)
4. **Command layer integration tests** (80% coverage)

### Phase 4: E2E Tests (Week 7)
**Priority:** 🟡 **MEDIUM**

1. Set up local testnet environment
2. Implement critical user journey tests
3. Add CI/CD integration

---

## Testing Tools & Libraries

### Current Stack
- ✅ **Vitest** - Test runner
- ✅ **@vitest/coverage-v8** - Coverage reporting
- ✅ **@vitest/ui** - Test UI

### Recommended Additions

1. **Testing Utilities**
   ```bash
   npm install -D @vitest/spy-on
   ```
   - For mocking and spying on services

2. **Fake Data Generation**
   ```bash
   npm install -D @faker-js/faker
   ```
   - Generate realistic test data (addresses, keys, etc.)

3. **Local Blockchain**
   ```bash
   npm install -D anvil @viem/anvil
   ```
   - For E2E testing with real blockchain interactions

4. **Snapshot Testing**
   - Already supported by Vitest
   - Use for ABI parsing, JSON formats

---

## Mocking Strategy

### Service Mocks

Create mock factories for external dependencies:

```typescript
// src/test/helpers/mocks.ts

export const mockPublicClient = () => ({
  getCode: vi.fn(),
  getStorageAt: vi.fn(),
  getBalance: vi.fn(),
  // ...
})

export const mockSafeApiKit = () => ({
  proposeTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  getTransaction: vi.fn(),
  // ...
})

export const mockSafeSDK = () => ({
  predictSafeAddress: vi.fn(),
  createTransaction: vi.fn(),
  signTransaction: vi.fn(),
  // ...
})
```

### HTTP Mocks

For Etherscan and Sourcify API calls:

```typescript
import { vi } from 'vitest'

global.fetch = vi.fn((url) => {
  if (url.includes('etherscan')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockEtherscanResponse)
    })
  }
  // ...
})
```

---

## Coverage Goals

### Target Coverage by Component

| Component | Unit Test Coverage | Integration Test Coverage |
|-----------|-------------------|--------------------------|
| ValidationService | 100% | N/A |
| Utilities | 95% | N/A |
| ABIService | 90% | N/A |
| TransactionBuilder | 90% | N/A |
| TxBuilderParser | 95% | N/A |
| ContractService | 90% | N/A |
| SafeService | 85% | 15% |
| TransactionService | 85% | 15% |
| API Service | 85% | 15% |
| Storage Layer | N/A | 95% (already achieved) |
| Commands | 20% | 80% |
| UI Components | 0% | 0% (manual testing) |

### Overall Coverage Goal

- **Total Code Coverage:** 85%+
- **Critical Path Coverage:** 95%+
- **Security-Critical Components:** 100%

---

## Test Data Management

### Test Fixtures

Create reusable test fixtures:

```typescript
// src/test/fixtures/addresses.ts
export const TEST_ADDRESSES = {
  owner1: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  owner2: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  safe: '0x1234567890123456789012345678901234567890',
  // ...
}

// src/test/fixtures/abis.ts
export const MOCK_ABIS = {
  erc20: [...],
  multisig: [...],
  // ...
}

// src/test/fixtures/transactions.ts
export const MOCK_TRANSACTIONS = {
  simpleTransfer: {...},
  contractCall: {...},
  // ...
}
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 85" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 85% threshold"
            exit 1
          fi
```

---

## Test Maintenance

### Best Practices

1. **Keep tests DRY**
   - Use shared fixtures and helpers
   - Create reusable test utilities

2. **Test behavior, not implementation**
   - Focus on public API
   - Avoid testing internal details

3. **Write descriptive test names**
   - Use `should` statements
   - Be specific about what's being tested

4. **One assertion per test (when possible)**
   - Makes failures easier to diagnose
   - Improves test clarity

5. **Clean up after tests**
   - Use `beforeEach` and `afterEach`
   - Reset mocks between tests
   - Clean up storage/state

6. **Mock external dependencies**
   - Network calls
   - Blockchain interactions
   - File system operations

7. **Test edge cases**
   - Empty inputs
   - Null/undefined values
   - Maximum values
   - Error conditions

---

## Security Testing

### Additional Security Tests

1. **Input Validation**
   - SQL injection attempts (if applicable)
   - XSS attempts in string fields
   - Buffer overflow attempts
   - Invalid hex strings

2. **Cryptographic Operations**
   - Private key handling (never logged/exposed)
   - Encryption/decryption correctness
   - Signature verification

3. **Transaction Safety**
   - Nonce handling
   - Replay attack prevention
   - Signature verification

---

## Performance Testing

### Performance Benchmarks

```typescript
describe('Performance', () => {
  it('should validate 1000 addresses in < 100ms', async () => {
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      validationService.validateAddress(TEST_ADDRESS)
    }
    const duration = performance.now() - start
    expect(duration).toBeLessThan(100)
  })

  it('should parse complex ABI in < 50ms', () => {
    // ...
  })
})
```

---

## Documentation

### Test Documentation Requirements

1. **Test Plan (this document)**
   - Overview of testing strategy
   - Coverage goals
   - Test organization

2. **Test README**
   - How to run tests
   - How to write new tests
   - Testing conventions

3. **In-Code Documentation**
   - Document complex test setups
   - Explain non-obvious assertions
   - Document mocking strategies

---

## Success Metrics

### Definition of Done

- ✅ 85%+ overall code coverage
- ✅ 100% coverage for ValidationService
- ✅ All critical paths tested
- ✅ All services have unit tests
- ✅ All commands have integration tests
- ✅ CI/CD pipeline runs all tests
- ✅ Coverage reports generated automatically
- ✅ No regression in existing tests

### Review Cadence

- **Weekly:** Review test coverage reports
- **Per PR:** Require tests for new features
- **Monthly:** Review and update test plan
- **Quarterly:** Performance test review

---

## Next Steps

1. **Immediate (Week 1)**
   - Review and approve this testing plan
   - Set up additional test tooling
   - Create test helper utilities
   - Begin ValidationService unit tests

2. **Short-term (Weeks 2-4)**
   - Complete Phase 1 (Foundation)
   - Complete Phase 2 (Core Services)
   - Set up CI/CD pipeline

3. **Medium-term (Weeks 5-7)**
   - Complete Phase 3 (Integration Layer)
   - Complete Phase 4 (E2E Tests)
   - Achieve 85% coverage goal

4. **Long-term (Ongoing)**
   - Maintain test suite
   - Add tests for new features
   - Monitor coverage trends
   - Regular test review and refactoring

---

## Appendix

### Test File Structure

```
src/
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── validation-service.test.ts
│   │   │   ├── abi-service.test.ts
│   │   │   ├── transaction-builder.test.ts
│   │   │   ├── tx-builder-parser.test.ts
│   │   │   ├── contract-service.test.ts
│   │   │   ├── safe-service.test.ts
│   │   │   ├── transaction-service.test.ts
│   │   │   └── api-service.test.ts
│   │   └── utils/
│   │       ├── validation.test.ts
│   │       ├── ethereum.test.ts
│   │       ├── eip3770.test.ts
│   │       └── errors.test.ts
│   ├── integration/
│   │   ├── wallet.test.ts ✅ (exists)
│   │   ├── config.test.ts ✅ (exists)
│   │   ├── account.test.ts ✅ (exists)
│   │   ├── transaction.test.ts ✅ (exists)
│   │   └── commands/
│   │       ├── config-commands.test.ts
│   │       ├── wallet-commands.test.ts
│   │       ├── account-commands.test.ts
│   │       └── tx-commands.test.ts
│   ├── e2e/
│   │   ├── setup-workflow.test.ts
│   │   ├── send-eth-workflow.test.ts
│   │   ├── contract-interaction-workflow.test.ts
│   │   └── multisig-workflow.test.ts
│   ├── fixtures/
│   │   ├── addresses.ts
│   │   ├── abis.ts
│   │   ├── transactions.ts
│   │   └── chains.ts
│   └── helpers/
│       ├── mocks.ts ✅ (exists)
│       ├── test-helpers.ts ✅ (exists)
│       ├── factories.ts
│       └── setup.ts
```

### Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Safe Core SDK Documentation](https://docs.safe.global/safe-core-aa-sdk/protocol-kit)
- [Viem Testing Guide](https://viem.sh/docs/actions/test/introduction.html)

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Author:** Claude Code
**Status:** Draft for Review
