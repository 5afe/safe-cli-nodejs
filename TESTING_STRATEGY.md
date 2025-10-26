# Testing Strategy

This document outlines the testing approach for the Safe CLI project.

## Test Pyramid

```
        ┌─────────────┐
        │   E2E CLI   │  ← Tests actual CLI interface
        ├─────────────┤
        │ Integration │  ← Tests services with real blockchain
        ├─────────────┤
        │    Unit     │  ← Tests individual functions
        └─────────────┘
```

## Test Types

### 1. Unit Tests (`src/tests/unit/**/*.test.ts`)

**Purpose:** Test individual functions and modules in isolation

**Location:** `src/tests/unit/`

**What they test:**
- Utility functions (validation, formatting, errors)
- Individual service methods with mocks
- Pure business logic

**Characteristics:**
- Fast execution (< 1 second)
- No external dependencies
- Use mocks and stubs
- Run on every commit (pre-commit hook)
- Run in CI on every PR

**Example:**
```typescript
// src/tests/unit/utils/validation.test.ts
it('should validate Ethereum address', () => {
  expect(validateAddress('0x...')).toBe(undefined)
  expect(validateAddress('invalid')).toContain('Invalid')
})
```

**Run command:**
```bash
npm test  # Runs all unit tests by default
```

### 2. Integration Tests (`src/tests/integration/integration-*.test.ts`)

**Purpose:** Test services and workflows with real blockchain and APIs

**Location:** `src/tests/integration/`

**What they test:**
- Full Safe workflow on Sepolia testnet
- ABI fetching from Etherscan
- Transaction Service push/pull/sync
- Complete service interactions

**Characteristics:**
- Slower execution (5-15 minutes total)
- Requires blockchain access (Sepolia)
- Requires API keys
- Uses real Safe SDK
- Excluded from default test runs
- Run manually or in dedicated CI workflow

**Test Suites:**

#### a. Full Workflow (`integration-full-workflow.test.ts`)
Tests complete Safe CLI workflow:
1. Initialize config
2. Import wallet
3. Create predicted Safe
4. Deploy Safe to Sepolia
5. Create transaction
6. Sign transaction
7. Export to JSON
8. Import from JSON
9. Execute transaction

**Requirements:**
- `TEST_WALLET_PK` - Funded Sepolia wallet

#### b. Transaction Builder (`integration-transaction-builder.test.ts`)
Tests ABI fetching and contract interaction:
1. Deploy Safe
2. Fetch ERC20 ABI from Etherscan
3. Parse ABI functions
4. Build approval transaction
5. Create and sign Safe transaction

**Requirements:**
- `TEST_WALLET_PK` - Funded Sepolia wallet
- `ETHERSCAN_API_KEY` - Etherscan API key

#### c. Transaction Service (`integration-transaction-service.test.ts`)
Tests Safe Transaction Service integration:
1. Deploy Safe
2. Create and sign transaction
3. Push to Safe Transaction Service
4. Clear local storage
5. Pull from service
6. Verify sync

**Requirements:**
- `TEST_WALLET_PK` - Funded Sepolia wallet
- `TX_SERVICE_API_KEY` - Safe Transaction Service API key

**Run commands:**
```bash
# Run all integration tests
npm test -- integration-*.test.ts

# Run specific integration test
npm test -- integration-full-workflow.test.ts
npm test -- integration-transaction-builder.test.ts
npm test -- integration-transaction-service.test.ts
```

### 3. E2E CLI Tests (`src/tests/integration/e2e-cli.test.ts`)

**Purpose:** Test the actual CLI interface and commands

**Location:** `src/tests/integration/`

**What they test:**
- CLI binary execution
- Command structure and help output
- Error handling
- Environment variable support
- Interactive prompt handling (where possible)

**Characteristics:**
- Tests CLI as users would use it
- Spawns actual CLI process
- Tests exit codes and output
- Fast execution (< 1 minute)
- No blockchain required for basic tests

**Current Coverage:**
- ✅ Version command
- ✅ Help output for all commands
- ✅ Error handling
- ✅ Environment variables
- ⚠️ Interactive flows (limited - requires non-interactive mode)

**Run command:**
```bash
npm test -- e2e-cli.test.ts
```

## Test Organization

```
src/tests/
├── fixtures/          # Test data and mocks
├── helpers/          # Test utilities
│   ├── cli-test-helper.ts    # CLI spawning and testing
│   ├── factories.ts          # Test data factories
│   ├── mocks.ts             # Mock implementations
│   └── setup.ts             # Test setup
├── integration/      # Integration and E2E tests
│   ├── e2e-cli.test.ts                     # E2E CLI tests
│   ├── integration-full-workflow.test.ts   # Full workflow integration
│   ├── integration-transaction-builder.test.ts  # ABI/contract integration
│   ├── integration-transaction-service.test.ts  # Service integration
│   ├── account.test.ts                     # Account service integration
│   ├── config.test.ts                      # Config integration
│   ├── transaction.test.ts                 # Transaction integration
│   ├── wallet.test.ts                      # Wallet integration
│   ├── INTEGRATION_README.md               # Integration test docs
│   └── test-helpers.ts                     # Integration test utilities
└── unit/             # Unit tests
    ├── services/     # Service unit tests
    └── utils/        # Utility unit tests
```

## Running Tests

### Local Development

```bash
# Run all unit tests (default)
npm test

# Run with UI
npm test:ui

# Run with coverage
npm test -- --coverage

# Run integration tests (requires funded wallet)
export TEST_WALLET_PK="0x..."
export ETHERSCAN_API_KEY="..."
export TX_SERVICE_API_KEY="..."
npm test -- integration-*.test.ts

# Run E2E CLI tests
npm test -- e2e-cli.test.ts

# Run specific test file
npm test -- wallet.test.ts

# Run tests matching pattern
npm test -- account
```

### CI/CD

**Main CI Workflow** (`.github/workflows/ci.yml`):
- Runs on every PR
- Executes unit tests only
- Fast feedback (< 2 minutes)
- Must pass for PR merge

**Integration Test Workflow** (`.github/workflows/integration.yml`):
- Manual trigger or scheduled
- Runs integration tests on Sepolia
- Runs E2E CLI tests
- Requires secrets configured
- Longer execution (15-20 minutes)

## Coverage Requirements

Current thresholds (`vitest.config.ts`):
- Lines: 30%
- Functions: 69%
- Branches: 85%
- Statements: 30%

**Note:** Thresholds are set to current levels. As test coverage improves, these should be gradually increased.

## Test Data Management

### Test Wallet
- Address: `0x2d5961897847A30559a26Db99789BEEc7AeEd75e`
- Network: Sepolia testnet only
- Funded via faucets
- Private key stored as GitHub Secret

### Test Data
- Fixtures in `src/tests/fixtures/`
- Factories use `@faker-js/faker` for realistic data
- Mocks in `src/tests/helpers/mocks.ts`

## Best Practices

### Writing Unit Tests
```typescript
// ✅ Good: Fast, isolated, mocked dependencies
it('should validate address format', () => {
  const result = validateAddress('0x123...')
  expect(result).toBeDefined()
})

// ❌ Bad: Slow, external dependencies
it('should fetch data from blockchain', async () => {
  const data = await fetchFromBlockchain()  // Too slow for unit test
})
```

### Writing Integration Tests
```typescript
// ✅ Good: Tests real integration, proper cleanup
it('should create and deploy Safe', async () => {
  const safe = await safeService.createSafe(...)
  expect(safe).toBeDefined()
  // Cleanup in afterEach
}, { timeout: 60000 })

// ❌ Bad: Mocking everything (use unit test instead)
it('should create Safe', async () => {
  vi.mock('safe-sdk')  // If mocking everything, it's a unit test
})
```

### Writing E2E CLI Tests
```typescript
// ✅ Good: Tests actual CLI interface
it('should show help output', async () => {
  const result = await cli.exec(['--help'])
  expect(result.stdout).toContain('Modern CLI')
})

// ❌ Bad: Testing internal functions (use unit/integration test)
it('should create safe', async () => {
  await createSafe()  // This is not testing the CLI
})
```

## Future Improvements

### Short Term
- [ ] Increase unit test coverage to 80%+
- [ ] Add more integration test scenarios
- [ ] Improve E2E CLI test coverage

### Medium Term
- [ ] Add non-interactive mode to CLI commands (`--yes`, `--non-interactive`)
- [ ] Add input file support (`--input-file`) for automation
- [ ] Complete E2E CLI workflow testing
- [ ] Add performance benchmarks

### Long Term
- [ ] Add visual regression testing for UI components
- [ ] Add load testing for Transaction Service
- [ ] Add security testing for wallet encryption
- [ ] Add snapshot testing for command outputs

## Troubleshooting

### Integration Tests Failing

**"TEST_WALLET_PK not set"**
- Set environment variable: `export TEST_WALLET_PK="0x..."`

**"Insufficient funds"**
- Fund test wallet on Sepolia: https://sepoliafaucet.com/

**"Transaction Service API error"**
- Verify `TX_SERVICE_API_KEY` is set correctly
- Check API key has not expired

**"Etherscan API error"**
- Verify `ETHERSCAN_API_KEY` is set correctly
- Check rate limits

### Pre-commit Hooks Failing

**"Type check failed"**
- Fix TypeScript errors shown in output
- Run `npm run typecheck` locally

**"Lint failed"**
- Run `npm run lint:fix` to auto-fix
- Fix remaining issues manually

### Coverage Too Low

**Coverage below threshold**
- Add tests for uncovered files
- Focus on `src/services/` and `src/utils/` first
- Use `npm test -- --coverage --ui` to see what's not covered

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Safe SDK Documentation](https://docs.safe.global/)
- See `INTEGRATION_README.md` for integration test details
- See `.husky/README.md` for pre-commit hook details
