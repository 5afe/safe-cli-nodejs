# Phase 2: Service Layer Testing - Detailed Plan

**Phase:** 2 of 4
**Duration:** Week 3-4 (10-15 days estimated)
**Target Coverage:** 90% for all services
**Estimated Tests:** ~500 new tests
**Start Date:** TBD
**Status:** 📋 Planning

---

## Overview

Phase 2 focuses on testing the service layer - the core business logic of the Safe CLI. Services handle Safe creation, transaction management, contract interactions, ABI fetching, and API communication.

### Services to Test

1. **ValidationService** ✅ (Already complete - 94.02% coverage)
2. **SafeService** - Safe account creation and management
3. **TransactionService** - Transaction building, signing, execution
4. **ContractService** - Contract interaction and ABI handling
5. **ABIService** - ABI fetching from Etherscan/Sourcify
6. **APIService** - Safe Transaction Service API client
7. **TransactionBuilderService** - Transaction Builder JSON format
8. **TransactionStorageService** - Transaction persistence

---

## Phase 2 Goals

### Coverage Targets

| Service | Lines | Target Coverage | Estimated Tests |
|---------|-------|----------------|-----------------|
| SafeService | 227 | 90% | 80-100 |
| TransactionService | 378 | 90% | 100-120 |
| ContractService | 137 | 90% | 50-60 |
| ABIService | 325 | 85% | 80-100 |
| APIService | 135 | 90% | 50-60 |
| TransactionBuilderService | 180 | 90% | 60-70 |
| TransactionStorageService | 385 | 90% | 80-100 |
| **Total** | **1,767** | **90%** | **500-610** |

### Success Criteria

- [  ] 90% coverage for critical services
- [  ] 85% coverage for supporting services
- [  ] All tests passing (100%)
- [  ] Fast test execution (< 100ms total)
- [  ] Zero flaky tests
- [  ] Comprehensive mocking of external dependencies
- [  ] Integration tests for service interactions
- [  ] Documentation of complex scenarios

---

## Week 3: Core Services (Days 11-15)

### Day 11-12: SafeService Testing

**File:** `src/tests/unit/services/safe-service.test.ts`

**Estimated:** 80-100 tests | **Target Coverage:** 90%

#### Methods to Test

```typescript
// Safe Creation
createSafe(config: SafeCreationConfig): Promise<Safe>
deploySafe(safeAddress: Address): Promise<TransactionReceipt>
predictSafeAddress(config: SafeCreationConfig): Promise<Address>

// Safe Management
getSafe(address: Address): Promise<Safe | null>
getSafeInfo(address: Address): Promise<SafeInfo>
getOwners(safeAddress: Address): Promise<Address[]>
getThreshold(safeAddress: Address): Promise<number>
getNonce(safeAddress: Address): Promise<number>

// Owner Management
addOwner(safeAddress: Address, newOwner: Address, threshold?: number): Promise<Transaction>
removeOwner(safeAddress: Address, owner: Address, threshold?: number): Promise<Transaction>
swapOwner(safeAddress: Address, oldOwner: Address, newOwner: Address): Promise<Transaction>

// Threshold Management
changeThreshold(safeAddress: Address, newThreshold: number): Promise<Transaction>

// Module Management
enableModule(safeAddress: Address, moduleAddress: Address): Promise<Transaction>
disableModule(safeAddress: Address, moduleAddress: Address): Promise<Transaction>
```

#### Test Categories

**1. Safe Creation (25 tests)**
- Valid safe creation with different configurations
- Predict address before deployment
- Deploy safe after creation
- Handle deployment errors
- Test with different owner counts (1, 2, 5, 10)
- Test with different thresholds
- Test with fallback handler
- Test without fallback handler

**2. Safe Information Retrieval (20 tests)**
- Get safe info (owners, threshold, nonce)
- Handle non-existent safe
- Handle invalid addresses
- Cache safe information
- Refresh cached data

**3. Owner Management (25 tests)**
- Add owner (single, multiple)
- Remove owner (with threshold adjustment)
- Swap owner (replace)
- Add owner with threshold change
- Remove owner with automatic threshold reduction
- Edge cases: add existing owner, remove non-owner
- Minimum owners validation (can't remove last owner)

**4. Threshold Management (10 tests)**
- Change threshold within valid range [1, owners.length]
- Reject threshold > owners
- Reject threshold < 1
- Validate threshold after owner changes

**5. Module Management (10 tests)**
- Enable module
- Disable module
- Check if module is enabled
- Handle already enabled module
- Handle non-existent module

**6. Error Handling (10 tests)**
- RPC failures
- Invalid Safe addresses
- Unauthorized operations
- Network errors
- Safe SDK errors

#### Mocking Strategy

```typescript
// Mock Safe SDK
const mockSafeSDK = createMockSafeSDK({
  getAddress: vi.fn().mockResolvedValue('0xsafe'),
  getOwners: vi.fn().mockResolvedValue(['0xowner1', '0xowner2']),
  getThreshold: vi.fn().mockResolvedValue(1),
  getNonce: vi.fn().mockResolvedValue(0),
  createTransaction: vi.fn().mockResolvedValue(mockTx),
})

// Mock Viem PublicClient
const mockPublicClient = createMockPublicClient({
  readContract: vi.fn().mockResolvedValue(['0xowner1', '0xowner2']),
  simulateContract: vi.fn().mockResolvedValue({ result: true }),
})

// Mock Viem WalletClient
const mockWalletClient = createMockWalletClient({
  sendTransaction: vi.fn().mockResolvedValue('0xtxhash'),
  waitForTransactionReceipt: vi.fn().mockResolvedValue(mockReceipt),
})
```

---

### Day 13-14: TransactionService Testing

**File:** `src/tests/unit/services/transaction-service.test.ts`

**Estimated:** 100-120 tests | **Target Coverage:** 90%

#### Methods to Test

```typescript
// Transaction Building
createTransaction(params: TransactionParams): Promise<Transaction>
buildTransactionData(target: Address, data: Hex): Hex
estimateGas(transaction: Transaction): Promise<bigint>
estimateSafeTxGas(transaction: Transaction): Promise<bigint>

// Transaction Signing
signTransaction(transaction: Transaction, signer: Wallet): Promise<Signature>
addSignature(transaction: Transaction, signature: Signature): Transaction
getSignersNeeded(transaction: Transaction): number
hasEnoughSignatures(transaction: Transaction): boolean

// Transaction Execution
executeTransaction(transaction: Transaction): Promise<TransactionReceipt>
simulateTransaction(transaction: Transaction): Promise<SimulationResult>
proposeTransaction(transaction: Transaction): Promise<string>

// Transaction Status
getTransaction(txHash: string): Promise<Transaction | null>
getTransactionStatus(txHash: string): Promise<TransactionStatus>
waitForExecution(txHash: string): Promise<TransactionReceipt>
```

#### Test Categories

**1. Transaction Building (30 tests)**
- Create simple ETH transfer
- Create contract call transaction
- Build multi-send transaction
- Estimate gas correctly
- Estimate safe tx gas
- Build transaction data (encoding)
- Handle complex contract calls
- Test with different operation types (call vs delegatecall)

**2. Transaction Signing (25 tests)**
- Sign with single signer
- Sign with multiple signers
- Add signatures incrementally
- Check if enough signatures
- Get signers still needed
- Verify signature validity
- Handle duplicate signatures
- Handle invalid signatures

**3. Transaction Execution (20 tests)**
- Execute with enough signatures
- Reject without enough signatures
- Simulate before execution
- Handle execution failures
- Parse execution logs
- Verify transaction receipt
- Test with different gas strategies

**4. Transaction Status (15 tests)**
- Get transaction by hash
- Get transaction status (pending, executed, failed)
- Wait for execution (async)
- Poll for status changes
- Handle non-existent transaction

**5. Multi-Send Transactions (15 tests)**
- Create batch transactions
- Encode multi-send data
- Decode multi-send data
- Execute batch atomically
- Handle partial failures

**6. Error Handling (15 tests)**
- Insufficient signatures
- Invalid transaction data
- RPC failures
- Execution reverts
- Timeout handling

#### Mocking Strategy

```typescript
// Mock transaction data
const mockTransaction: Transaction = {
  to: TEST_ADDRESSES.safe1,
  value: parseEther('1'),
  data: '0x',
  operation: OperationType.Call,
  nonce: 0,
  signatures: [],
}

// Mock Safe SDK transaction methods
const mockSafeSDK = createMockSafeSDK({
  createTransaction: vi.fn().mockResolvedValue(mockSafeTx),
  signTransaction: vi.fn().mockResolvedValue(mockSignature),
  executeTransaction: vi.fn().mockResolvedValue(mockReceipt),
  isValidSignature: vi.fn().mockResolvedValue(true),
})
```

---

### Day 15: ContractService Testing

**File:** `src/tests/unit/services/contract-service.test.ts`

**Estimated:** 50-60 tests | **Target Coverage:** 90%

#### Methods to Test

```typescript
// Contract Interaction
readContract(address: Address, abi: Abi, functionName: string, args?: unknown[]): Promise<unknown>
writeContract(address: Address, abi: Abi, functionName: string, args?: unknown[]): Promise<Hex>
simulateContract(address: Address, abi: Abi, functionName: string, args?: unknown[]): Promise<SimulationResult>

// Contract Information
getCode(address: Address): Promise<Hex>
isContract(address: Address): Promise<boolean>
isProxy(address: Address): Promise<boolean>
getImplementation(proxyAddress: Address): Promise<Address | null>

// Event Handling
getEvents(address: Address, abi: Abi, eventName: string, filters?: EventFilters): Promise<Event[]>
watchEvent(address: Address, abi: Abi, eventName: string, callback: EventCallback): Unwatch
```

#### Test Categories

**1. Contract Reading (15 tests)**
- Read contract with valid ABI
- Read different data types (uint, address, bool, bytes)
- Handle view functions
- Handle pure functions
- Handle revert errors
- Cache read results

**2. Contract Writing (15 tests)**
- Write to contract
- Estimate gas for writes
- Handle transaction failures
- Parse transaction receipt
- Verify events emitted

**3. Contract Simulation (10 tests)**
- Simulate contract calls
- Detect reverts before sending
- Get revert reasons
- Test different scenarios

**4. Contract Detection (10 tests)**
- Check if address is contract
- Detect proxy contracts (EIP-1967, EIP-1822)
- Get implementation address
- Handle EOAs
- Handle non-existent addresses

**5. Event Handling (10 tests)**
- Get historical events
- Filter events by parameters
- Watch for new events
- Unwatch events
- Parse event data

#### Mocking Strategy

```typescript
// Mock contract reads
const mockPublicClient = createMockPublicClient({
  readContract: vi.fn().mockResolvedValue(BigInt(100)),
  getCode: vi.fn().mockResolvedValue('0x123456'),
  getLogs: vi.fn().mockResolvedValue([mockLog]),
})

// Mock contract writes
const mockWalletClient = createMockWalletClient({
  writeContract: vi.fn().mockResolvedValue('0xtxhash'),
  simulateContract: vi.fn().mockResolvedValue({ result: true }),
})
```

---

## Week 4: Supporting Services (Days 16-20)

### Day 16-17: ABIService Testing

**File:** `src/tests/unit/services/abi-service.test.ts`

**Estimated:** 80-100 tests | **Target Coverage:** 85%

#### Methods to Test

```typescript
// ABI Fetching
fetchABI(address: Address, chainId: string): Promise<Abi>
fetchFromEtherscan(address: Address, chainId: string): Promise<Abi | null>
fetchFromSourceify(address: Address, chainId: string): Promise<Abi | null>

// ABI Caching
cacheABI(address: Address, chainId: string, abi: Abi): void
getCachedABI(address: Address, chainId: string): Abi | null
clearCache(address?: Address): void

// ABI Validation
validateABI(abi: unknown): boolean
parseABI(abiString: string): Abi
```

#### Test Categories

**1. Etherscan Fetching (30 tests)**
- Fetch verified contract ABI
- Handle unverified contracts
- Handle API rate limits
- Handle API errors
- Parse Etherscan response
- Different contract types (regular, proxy)
- Test with different chain IDs
- API key handling

**2. Sourcify Fetching (25 tests)**
- Fetch from Sourcify API
- Handle not found contracts
- Handle network errors
- Parse Sourcify response
- Full match vs partial match

**3. Fallback Strategy (15 tests)**
- Try Etherscan first, fallback to Sourcify
- Try Sourcify if Etherscan fails
- Return null if both fail
- Cache successful results

**4. ABI Caching (15 tests)**
- Cache after fetching
- Return cached ABI on subsequent calls
- Clear cache
- Cache per address + chain
- Cache expiration (if implemented)

**5. ABI Validation (15 tests)**
- Validate valid ABIs
- Reject invalid ABIs
- Parse ABI strings
- Handle malformed JSON

#### Mocking Strategy

```typescript
// Mock HTTP responses
const mockEtherscanResponse = {
  status: '1',
  message: 'OK',
  result: JSON.stringify(ERC20_ABI),
}

const mockSourceifyResponse = {
  files: {
    'metadata.json': JSON.stringify({ output: { abi: ERC20_ABI } }),
  },
}

// Mock fetch (or axios/node-fetch)
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockEtherscanResponse),
})
```

---

### Day 18: APIService Testing

**File:** `src/tests/unit/services/api-service.test.ts`

**Estimated:** 50-60 tests | **Target Coverage:** 90%

#### Methods to Test

```typescript
// Safe Information
getSafe(chainId: string, safeAddress: Address): Promise<SafeInfo>
getSafesByOwner(chainId: string, ownerAddress: Address): Promise<SafeInfo[]>

// Transaction History
getTransactions(chainId: string, safeAddress: Address): Promise<Transaction[]>
getTransaction(chainId: string, safeTxHash: string): Promise<Transaction>
proposeTransaction(chainId: string, safeAddress: Address, transaction: Transaction): Promise<string>
getConfirmations(chainId: string, safeTxHash: string): Promise<Confirmation[]>
addConfirmation(chainId: string, safeTxHash: string, signature: Signature): Promise<void>

// Balances and Tokens
getBalances(chainId: string, safeAddress: Address): Promise<Balance[]>
getTokens(chainId: string, safeAddress: Address): Promise<Token[]>
```

#### Test Categories

**1. Safe Information (15 tests)**
- Get safe details
- Get safes by owner
- Handle non-existent safe
- Handle network errors
- Parse API response

**2. Transaction History (20 tests)**
- Get all transactions
- Get transaction by hash
- Filter by status (pending, executed)
- Pagination
- Sort by date

**3. Transaction Proposals (15 tests)**
- Propose new transaction
- Add confirmation
- Get confirmations
- Verify signature format
- Handle API errors

**4. Balances and Tokens (10 tests)**
- Get ETH balance
- Get token balances (ERC20, ERC721)
- Format balances correctly
- Handle unknown tokens

#### Mocking Strategy

```typescript
// Mock Safe Transaction Service API
const mockAPIResponse = {
  address: TEST_ADDRESSES.safe1,
  owners: [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2],
  threshold: 1,
  nonce: 0,
}

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockAPIResponse),
})
```

---

### Day 19-20: Transaction Builder & Storage Testing

#### TransactionBuilderService (Day 19)

**File:** `src/tests/unit/services/transaction-builder-service.test.ts`

**Estimated:** 60-70 tests | **Target Coverage:** 90%

**Methods:**
- `parseTransactionBuilder(json: string): Transaction`
- `buildTransactionBuilder(transaction: Transaction): string`
- `validateTransactionBuilder(json: string): boolean`

**Test Categories:**
1. Parsing Transaction Builder JSON (25 tests)
2. Building Transaction Builder JSON (20 tests)
3. Validation (15 tests)
4. Round-trip conversion (10 tests)

#### TransactionStorageService (Day 19-20)

**File:** `src/tests/unit/services/transaction-storage-service.test.ts`

**Estimated:** 80-100 tests | **Target Coverage:** 90%

**Methods:**
- `saveTransaction(transaction: Transaction): Promise<void>`
- `getTransaction(id: string): Promise<Transaction | null>`
- `listTransactions(safeAddress?: Address): Promise<Transaction[]>`
- `updateTransaction(id: string, updates: Partial<Transaction>): Promise<void>`
- `deleteTransaction(id: string): Promise<void>`

**Test Categories:**
1. Save transactions (20 tests)
2. Retrieve transactions (20 tests)
3. List transactions (15 tests)
4. Update transactions (15 tests)
5. Delete transactions (10 tests)
6. Filtering and sorting (20 tests)

---

## Fixtures and Mocks for Phase 2

### New Fixtures Needed

#### Transaction Fixtures (`fixtures/transactions.ts`)

Already created in Phase 1, may need extensions:
- Simple ETH transfers
- Contract calls
- Multi-send batches
- Different operation types
- Signed vs unsigned
- Different statuses

#### Safe Fixtures (`fixtures/safes.ts`)

New fixture file needed:
```typescript
export const TEST_SAFES = {
  deployed: {
    address: '0x1234...',
    owners: [TEST_ADDRESSES.owner1, TEST_ADDRESSES.owner2],
    threshold: 1,
    nonce: 0,
  },
  predicted: {
    // Not yet deployed
  },
  multiSig: {
    // 3/5 multi-sig
  },
}
```

#### API Response Fixtures (`fixtures/api-responses.ts`)

New fixture file needed:
```typescript
export const MOCK_API_RESPONSES = {
  etherscan: {
    getABI: { /* ... */ },
    getTransactions: { /* ... */ },
  },
  sourcify: {
    getMetadata: { /* ... */ },
  },
  safeTxService: {
    getSafe: { /* ... */ },
    getTransactions: { /* ... */ },
  },
}
```

### Mock Factory Extensions

Extend `helpers/factories.ts` with:
- `createMockHTTPClient()` - For API mocking
- `createMockSafeAPIClient()` - Specific to Safe Transaction Service
- `createMockEtherscanClient()` - Etherscan API mocking

---

## Testing Strategy

### Unit vs Integration Tests

**Unit Tests (70%)**
- Test individual service methods in isolation
- Mock all external dependencies
- Fast execution (< 5ms per test)

**Integration Tests (30%)**
- Test service interactions
- Example: SafeService → ContractService → Viem
- Example: TransactionService → SafeService → APIService
- Slower execution (10-50ms per test)

### Mocking External Dependencies

All external dependencies must be mocked:

1. **Viem Clients** - Already have factories
2. **Safe SDK** - Already have factories
3. **HTTP APIs** - Need to add fetch/axios mocks
4. **File System** - For storage services
5. **Environment Variables** - API keys, config

### Coverage Measurement

```bash
# Run service tests only
npm test -- src/tests/unit/services --coverage

# Run specific service
npm test -- src/tests/unit/services/safe-service.test.ts --coverage

# Generate HTML report
npm test -- src/tests/unit/services --coverage
open coverage/index.html
```

---

## Success Criteria

### Per-Service Criteria

For each service, we must achieve:

- [  ] 90%+ line coverage (85% for complex services)
- [  ] 90%+ branch coverage
- [  ] 90%+ function coverage
- [  ] All public methods tested
- [  ] Error handling tested
- [  ] Edge cases covered
- [  ] Fast execution (< 10ms per service suite)

### Phase 2 Overall Criteria

- [  ] 500+ tests implemented
- [  ] 90% average coverage across all services
- [  ] Zero flaky tests
- [  ] Complete mocking of external dependencies
- [  ] Integration tests for critical workflows
- [  ] Documentation of complex test scenarios
- [  ] Reusable fixtures and mocks

---

## Estimated Timeline

### Optimistic (High Efficiency)

| Days | Services | Tests | Coverage |
|------|----------|-------|----------|
| 11-12 | SafeService | 80-100 | 90% |
| 13-14 | TransactionService | 100-120 | 90% |
| 15 | ContractService | 50-60 | 90% |
| 16-17 | ABIService | 80-100 | 85% |
| 18 | APIService | 50-60 | 90% |
| 19-20 | Builder & Storage | 140-170 | 90% |
| **Total** | **7 services** | **500-610** | **90%** |

**Estimated Time:** 10-15 hours (with 500% efficiency from Phase 1)

### Conservative (Standard Efficiency)

| Week | Days | Services | Tests | Coverage |
|------|------|----------|-------|----------|
| 3 | 11-15 | SafeService, TransactionService, ContractService | 230-280 | 90% |
| 4 | 16-20 | ABIService, APIService, Builder, Storage | 270-330 | 90% |
| **Total** | **10 days** | **7 services** | **500-610** | **90%** |

**Estimated Time:** 50-70 hours (standard pace)

---

## Risks and Mitigation

### Risk 1: Complex Mocking

**Risk:** Services have many external dependencies (Viem, Safe SDK, HTTP APIs)

**Mitigation:**
- Build on Phase 1 mock factories
- Create comprehensive mock responses
- Use real API responses as templates
- Document mocking patterns

### Risk 2: Async Test Complexity

**Risk:** Services are heavily async, may lead to flaky tests

**Mitigation:**
- Always use async/await properly
- Mock timers for time-dependent tests
- Avoid `setTimeout` in tests
- Use Vitest's `waitFor` utilities

### Risk 3: Integration Test Scope

**Risk:** Integration tests may become too broad and slow

**Mitigation:**
- Keep integration tests focused
- Mock external APIs even in integration tests
- Limit integration tests to critical workflows
- Aim for < 100ms per integration test

### Risk 4: API Response Changes

**Risk:** External APIs may change format, breaking tests

**Mitigation:**
- Use real API response examples as fixtures
- Version API response fixtures
- Document API versions tested against
- Add validation for response formats

---

## Next Steps

1. **Review this plan** with team/stakeholders
2. **Prepare fixtures** for Phase 2
3. **Extend mock factories** with HTTP/API mocking
4. **Start with SafeService** (Day 11-12)
5. **Iterate and refine** based on discoveries

---

## Questions to Answer Before Starting

1. Do we need to test against real APIs for some tests?
2. Should we create separate integration test files?
3. What is the preferred HTTP mocking library (node-fetch, axios, native fetch)?
4. Are there known issues with current services that tests should cover?
5. Should we test against specific Safe SDK versions?

---

**Status:** 📋 Planning Complete - Ready to Start
**Prerequisites:** Phase 1 Complete ✅
**Next Action:** Begin Day 11 - SafeService Testing

---

**Last Updated:** 2025-10-26
**Created By:** Claude Code AI Assistant
**Phase:** 2 of 4
