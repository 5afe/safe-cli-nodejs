# Safe CLI Development Guide

## 🚨 CRITICAL SAFETY WARNING 🚨

**NEVER run tests without isolated storage!** Integration tests were previously written in a dangerous way that could **DELETE YOUR ACTUAL WALLET DATA AND SAFE CONFIGURATIONS**.

### Mandatory Safety Rules:

1. **ALL integration tests MUST use `createTestStorage()`** from `src/tests/helpers/test-storage.ts`
2. **NEVER instantiate storage classes without the `cwd` option** in test mode
3. **ALWAYS verify tests are using `/tmp` directories** before running
4. **Backup your config before running tests** if unsure

The storage classes now have built-in safety checks that will throw an error if you try to use non-temp directories in test mode.

### Safe Test Pattern (REQUIRED):

```typescript
import { createTestStorage } from '../helpers/test-storage.js'
import { WalletStorageService } from '../../storage/wallet-store.js'

describe('My Test', () => {
  let testStorage: ReturnType<typeof createTestStorage>
  let walletStorage: WalletStorageService

  beforeEach(() => {
    // REQUIRED: Create isolated test storage
    testStorage = createTestStorage('my-test')
    walletStorage = new WalletStorageService({ cwd: testStorage.configDir })
  })

  afterEach(() => {
    // REQUIRED: Cleanup test directories
    testStorage.cleanup()
  })
})
```

### Dangerous Pattern (FORBIDDEN):

```typescript
// ❌ NEVER DO THIS IN TESTS - touches real user config!
const walletStorage = new WalletStorageService()
walletStorage.getAllWallets().forEach(w => walletStorage.removeWallet(w.id)) // DELETES REAL DATA!
```

## Pre-Commit Checklist

Run the following commands before committing:

```bash
npm run lint          # Check code style and potential issues
npm run format        # Format code with Prettier
npm run typecheck     # Run TypeScript type checking
npm run test          # Run unit and integration tests
```

If any errors pop up, fix them before committing.

## Development Workflow

### Testing

#### Unit Tests
Unit tests are located in `src/tests/unit/` and cover:
- Services (`src/services/*`)
- Utilities (`src/utils/*`)
- Storage (`src/storage/*`)

Run unit tests:
```bash
npm test                    # Run all tests (excluding integration/e2e)
npm test -- --watch         # Run tests in watch mode
npm test -- --ui            # Run tests with Vitest UI
```

#### Integration Tests
Integration tests are in `src/tests/integration/` and test:
- Full workflows (wallet import, Safe creation, transaction lifecycle)
- Service integration
- Storage integration
- Transaction building and parsing

Run integration tests explicitly (they require blockchain access):
```bash
npm test src/tests/integration/integration-*.test.ts
```

#### E2E Tests
E2E tests verify the CLI commands work correctly:
- `e2e-cli.test.ts` - Basic CLI functionality
- `e2e-wallet-commands.test.ts` - Wallet operations
- `e2e-config-commands.test.ts` - Configuration management
- `e2e-account-commands.test.ts` - Account operations
- `e2e-tx-commands.test.ts` - Transaction commands
- `integration-full-workflow.test.ts` - Complete end-to-end workflow

Run E2E tests:
```bash
# Build the CLI first
npm run build

# Run E2E tests (requires TEST_WALLET_PK environment variable)
TEST_WALLET_PK=0x... npm test src/tests/integration/e2e-*.test.ts
```

#### Coverage
Check test coverage:
```bash
npm test -- --coverage       # Generate coverage report
```

Coverage thresholds are configured in `vitest.config.ts`:
- Lines: 30%
- Functions: 69%
- Branches: 85%
- Statements: 30%

### Project Structure

```
src/
├── commands/           # CLI command implementations (0% coverage - tested via E2E)
│   ├── account/       # Safe account management
│   ├── config/        # Configuration management
│   ├── tx/            # Transaction operations
│   └── wallet/        # Wallet management
├── services/          # Business logic (87% coverage)
│   ├── abi-service.ts
│   ├── api-service.ts
│   ├── contract-service.ts
│   ├── ledger-service.ts
│   ├── safe-service.ts
│   ├── transaction-builder.ts
│   ├── transaction-service.ts
│   └── validation-service.ts
├── storage/           # Data persistence (81% coverage)
│   ├── config-store.ts
│   ├── safe-store.ts
│   ├── transaction-store.ts
│   └── wallet-store.ts
├── ui/                # CLI interface (0% coverage - interactive components)
│   ├── components/
│   ├── hooks/
│   └── screens/
├── utils/             # Utilities (96% coverage)
│   ├── balance.ts
│   ├── eip3770.ts
│   ├── errors.ts
│   ├── ethereum.ts
│   └── validation.ts
└── tests/
    ├── fixtures/      # Test data and mocks
    ├── helpers/       # Test utilities
    ├── integration/   # Integration and E2E tests
    └── unit/          # Unit tests
```

### Configuration and Storage

If in the course of development or testing you need to clear or modify the local configs, back up the existing ones first, and restore them when finished.

Configuration is stored in:
- Config: `~/.config/@safe-global/safe-cli/config.json`
- Data: `~/.local/share/@safe-global/safe-cli/`

For testing with isolated directories, use `XDG_CONFIG_HOME` and `XDG_DATA_HOME`:
```bash
XDG_CONFIG_HOME=/tmp/test-config XDG_DATA_HOME=/tmp/test-data npm run dev
```

### Adding New Features

1. **Create the service/utility** - Write the core logic with tests
2. **Add storage layer** (if needed) - Implement data persistence
3. **Create command** - Implement the CLI command in `src/commands/`
4. **Add E2E test** - Verify the command works end-to-end
5. **Update documentation** - Add to README if user-facing

### Debugging

Run CLI in development mode:
```bash
npm run dev -- <command>            # Run with tsx (fast reload)
DEBUG=* npm run dev -- <command>    # Run with debug logging
```

Build and run production version:
```bash
npm run build
node dist/index.js <command>
```

### Code Style

- TypeScript strict mode enabled
- ESLint for linting
- Prettier for formatting
- Husky for pre-commit hooks
- lint-staged for staged file checking

### Common Patterns

#### Error Handling
Use custom error classes from `src/utils/errors.ts`:
```typescript
import { ValidationError, SafeError } from '../utils/errors.js'

throw new ValidationError('Invalid address format')
throw new SafeError('Failed to create Safe')
```

#### Address Validation
Support both plain and EIP-3770 addresses:
```typescript
import { parseEIP3770Address } from '../utils/eip3770.js'
import { validateAddress } from '../utils/validation.js'

const { chainId, address } = parseEIP3770Address('sep:0x...')
validateAddress(address) // throws if invalid
```

#### Storage
All storage services follow the same pattern:
```typescript
import { ConfigStore } from '../storage/config-store.js'

const store = new ConfigStore()
store.set('key', value)
const value = store.get('key')
```

### Testing Best Practices

1. **Isolate test data** - Use temporary directories for test configs/data
2. **Mock external dependencies** - Mock API calls and blockchain interactions
3. **Test error cases** - Verify error handling and edge cases
4. **Use factories** - Use test helpers from `src/tests/helpers/factories.ts`
5. **Clean up after tests** - Remove temporary files/directories in `afterEach`

### Environment Variables

- `TEST_WALLET_PK` - Private key for E2E tests (Sepolia testnet)
- `XDG_CONFIG_HOME` - Custom config directory
- `XDG_DATA_HOME` - Custom data directory
- `NODE_ENV` - Set to 'test' during testing
- `CI` - Set to 'true' for non-interactive mode

### Blockchain Testing

E2E tests that interact with blockchain require:
- A funded Sepolia test wallet
- `TEST_WALLET_PK` environment variable set
- Network access to Sepolia RPC and Safe API

Get Sepolia ETH:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

### Troubleshooting

**Tests timing out:**
- Increase timeout in test: `{ timeout: 60000 }`
- Check network connectivity
- Verify RPC endpoints are accessible

**Interactive prompts in tests:**
- Use `CLITestHelper.execWithInput()` for tests with prompts
- Set `CI=true` environment variable for non-interactive mode
- Consider adding `--yes` flags to commands

**Storage conflicts:**
- Use isolated directories with `XDG_CONFIG_HOME` and `XDG_DATA_HOME`
- Clean up in `afterEach` hooks
- Use `mkdtempSync()` for temporary directories
