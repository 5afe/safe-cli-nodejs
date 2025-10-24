# Safe CLI

Modern, interactive CLI for Safe Smart Account management. Built on top of the [Safe Core SDK](https://github.com/safe-global/safe-core-sdk).

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/5afe/safe-cli-nodejs?view=terminal&hideNavigation=1&hideDevTools=1&terminalHeight=100)

## Features

- 🔐 Secure wallet management with encrypted storage
- ⛓️ Multi-chain support with customizable configurations
- 🎨 Beautiful, modern TUI with interactive prompts
- 🚀 Both interactive and non-interactive modes
- 📦 Safe account creation, deployment, and management
- 📝 Transaction creation, signing, and execution
- 🔄 Multi-sig coordination workflows
- 🤖 Smart contract interaction with automatic ABI fetching
- 🔌 Proxy contract support (EIP-1967)
- 👥 Owner management (add/remove owners, change threshold)
- 📥 Transaction Builder JSON import with auto-detection

## Installation

```bash
npm install -g @safe-global/safe-cli

# Or use without installing
npx @safe-global/safe-cli
```

## Quick Start

### 1. Initialize Configuration

```bash
safe config init
```

This will set up default chain configurations and preferences.

### 2. Import a Wallet

```bash
safe wallet import
```

Your private key will be encrypted and stored securely.

### 3. View Configuration

```bash
safe config show
```

## Commands

### Configuration Management

```bash
safe config init              # Initialize CLI configuration (includes API key setup)
safe config show              # Display current configuration (shows API key status)
safe config chains list       # List configured chains
safe config chains add        # Add a custom chain
safe config chains remove     # Remove a chain
safe config chains edit       # Edit chains in text editor (power users)
```

### Wallet Management

```bash
safe wallet import            # Import a wallet with private key
safe wallet list              # List all wallets
safe wallet use               # Switch active wallet
safe wallet remove            # Remove a wallet
```

### Safe Account Operations

```bash
safe account create                   # Create new Safe account
safe account deploy [account]         # Deploy predicted Safe (EIP-3770 format)
safe account open                     # Open existing Safe
safe account list                     # List all Safe accounts
safe account info [account]           # Show Safe details (EIP-3770 format)
safe account add-owner [account]      # Add a new owner to a Safe
safe account remove-owner [account]   # Remove an owner from a Safe
safe account change-threshold [account]  # Change signature threshold
```

**EIP-3770 Address Format:**
Safe addresses use the [EIP-3770](https://eips.ethereum.org/EIPS/eip-3770) standard format: `shortName:address`

Examples:
- `eth:0x742d35Cc6634C0532925a3b844Bc454e4438f44e` (Ethereum)
- `sep:0x1405b9b5A42D07bD1D625B1DCcd5EF29Ee5a3f15` (Sepolia)
- `matic:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (Polygon)

This makes it clear which chain a Safe belongs to. Commands will interactively prompt for Safe selection when needed.

### Transaction Management

```bash
safe tx create                 # Create transaction (interactive contract builder for contracts)
safe tx sign [safeTxHash]      # Sign transaction (use Safe TX Hash)
safe tx execute [safeTxHash]   # Execute transaction (use Safe TX Hash)
safe tx list [account]         # List transactions (interactively filter by Safe or show all)
safe tx status [safeTxHash]    # Show transaction status and signature progress
safe tx export [safeTxHash]    # Export transaction as JSON for sharing
safe tx export [safeTxHash] -o file  # Export to file
safe tx import [json]          # Import transaction from JSON string or file
safe tx push [safeTxHash]      # Push transaction to Safe Transaction Service
safe tx pull [account]         # Pull transactions from Safe Transaction Service
safe tx sync [account]         # Sync transactions (push local + pull remote)
```

**Transaction Builder - Smart Contract Interactions:**

When creating a transaction to a contract address, the CLI automatically:
1. Detects if the address is a contract
2. Fetches the contract ABI from Etherscan or Sourcify
3. Detects and handles EIP-1967 proxy contracts (merges proxy + implementation ABIs)
4. Offers an interactive function selector with all writable functions
5. Prompts for each parameter with type validation
6. Automatically encodes the function call

Example flow:
```bash
$ safe tx create

# Enter contract address
To address: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

✓ Contract detected
✓ Proxy detected! Implementation: 0x43506849...
✓ Contract ABI found!
✓ Implementation ABI found!
✓ Found 15 writable function(s)

# Interactive builder
? Use transaction builder to interact with contract? Yes
? Select function to call:
  ❯ transfer(address _to, uint256 _value)
    approve(address _spender, uint256 _value)
    transferFrom(address _from, address _to, uint256 _value)
    ...

# Parameter input with validation
? _to (address): 0x742d35Cc...
? _value (uint256): 1000000  # 1 USDC

✓ Transaction created successfully!
```

**Multi-sig Coordination Workflows:**

*Option 1: Using Safe Transaction Service (Recommended)*
```bash
# Owner A: Create, sign, and push to Safe API
safe tx create
safe tx sign <safeTxHash>
safe tx push <safeTxHash>

# Owner B: Pull and sign
safe tx pull                 # Fetch pending transactions
safe tx sign <safeTxHash>
safe tx push <safeTxHash>    # Push signature back

# Or sync everything at once
safe tx sync                 # Pull + push in one command

# Execute when threshold reached
safe tx execute <safeTxHash>
```

*Option 2: Using JSON Export/Import (Offline)*
```bash
# Owner A: Create and sign transaction
safe tx create
safe tx sign <safeTxHash>
safe tx export <safeTxHash>  # Copy the JSON output

# Owner B: Import and sign
safe tx import '{"safeTxHash":"0x..."...}'
safe tx sign <safeTxHash>

# Check progress
safe tx status <safeTxHash>  # Shows: "2/3 signatures collected"

# Execute when threshold reached
safe tx execute <safeTxHash>
```

*Option 3: Import from Safe Transaction Builder*
```bash
# Import transaction batch from Safe web app (https://app.safe.global)
# The CLI will auto-detect the Transaction Builder JSON format
safe tx import transaction-builder.json

# Or paste the JSON directly
safe tx import '{"version":"1.0","chainId":"1",...}'

# Each transaction will prompt for:
# - Nonce (suggested based on current Safe state)
# - Gas parameters (optional)

# Then sign and execute as usual
safe tx sign <safeTxHash>
safe tx execute <safeTxHash>
```

**Transaction Builder Format Support:**

The CLI can import transaction batches from the Safe Transaction Builder (web app). This allows you to:
- Create complex transaction batches in the web UI
- Export as JSON from the Transaction Builder
- Import into the CLI for signing and execution
- Missing fields (nonce, gas parameters) will be configured during import

**Note:** Transaction Builder batches with multiple transactions will be imported as separate transactions. Native batch support via MultiSend is planned for a future release.
safe tx import '{"safeTxHash":"0x..."...}'
safe tx sign <safeTxHash>

# Check progress
safe tx status <safeTxHash>  # Shows: "2/3 signatures collected"

# Execute when threshold reached
safe tx execute <safeTxHash>
```

## Configuration

Configuration files are stored in:
- **macOS**: `~/.config/safe-cli/`
- **Linux**: `~/.config/safe-cli/`
- **Windows**: `%APPDATA%\safe-cli\`

### Optional API Keys

The CLI supports two optional API keys that enhance functionality:

#### Safe Transaction Service API Key (Optional)

Some chains require an API key to access the Safe Transaction Service. You can get one from [Safe Dashboard](https://dashboard.safe.global/).

**Benefits:**
- Push transactions to Safe Transaction Service (`safe tx push`)
- Pull pending transactions from the service (`safe tx pull`)
- Bidirectional sync (`safe tx sync`)
- Multi-sig coordination via the Safe web interface

**Without this key:** You can still use the offline JSON export/import workflow for multi-sig coordination.

#### Etherscan API Key (Optional)

An API key for Etherscan enables enhanced contract interaction features. Get a free key from [Etherscan](https://etherscan.io/myapikey).

**Benefits:**
- Automatic proxy contract detection (EIP-1967)
- Better ABI fetching with implementation contract support
- Automatic merging of proxy + implementation ABIs for proxy contracts

**Without this key:** The CLI falls back to Sourcify (free, no API key required) for ABI fetching, but proxy contract detection will not work.

#### Configuring API Keys

**During initial setup:**
```bash
safe config init
# You'll be prompted for both API keys
```

**To view configured keys:**
```bash
safe config show
# Shows obfuscated API keys (first 8 + last 4 characters)
```

**To add or update keys later:**
Edit your configuration file directly or run `safe config init` again.

### Supported Chains (Default)

- Ethereum Mainnet (1)
- Sepolia (11155111)
- Polygon (137)
- Arbitrum One (42161)
- Optimism (10)
- Base (8453)
- Gnosis Chain (100)

You can add custom chains using `safe config chains add`.

### Editing Chains in Text Editor

For power users, you can edit all chain configurations at once in your preferred text editor:

```bash
safe config chains edit
```

This command:
- Opens your chains configuration in `$EDITOR` (vim, nano, VS Code, etc.)
- Validates JSON structure on save
- Shows a diff of changes before applying
- Supports adding, modifying, and removing multiple chains at once

The configuration format:

```json
{
  "chains": {
    "1": {
      "chainId": "1",
      "name": "Ethereum",
      "shortName": "eth",
      "rpcUrl": "https://eth.llamarpc.com",
      "currency": "ETH",
      "explorer": "https://etherscan.io"
    }
  }
}
```

The `shortName` field is used for [EIP-3770](https://eips.ethereum.org/EIPS/eip-3770) address formatting.

## Security

- Private keys are encrypted using AES-256-GCM
- Password-based key derivation with PBKDF2 (100,000 iterations)
- Keys never logged or exposed in plain text
- Support for OS keychain integration (planned)

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/safe-global/safe-cli.git
cd safe-cli

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run built version
npm start
```

### Project Structure

```
src/
├── commands/          # Command handlers
│   ├── config/       # Configuration commands
│   └── wallet/       # Wallet commands
├── storage/          # Persistence layer
│   ├── config-store.ts
│   └── wallet-store.ts
├── types/            # TypeScript types
├── utils/            # Utility functions
├── ui/               # UI components
├── constants/        # Constants and defaults
├── cli.ts            # Command definitions
└── index.ts          # Entry point
```

## Roadmap

### ✅ Phase 1: Foundation (Complete)
- [x] Project setup
- [x] Configuration management
- [x] Wallet import/management
- [x] Secure storage

### ✅ Phase 2: Safe Account Operations (Complete)
- [x] Safe account creation
- [x] Safe deployment
- [x] Account management

### ✅ Phase 3: Transaction Core (Complete)
- [x] Transaction creation with editable nonce
- [x] Transaction signing
- [x] Transaction execution
- [x] Multi-sig workflow support
- [x] safeTxHash as transaction identifier

### ✅ Phase 4: Owner Management (Complete)
- [x] Add owners to Safe
- [x] Remove owners from Safe
- [x] Change signature threshold
- [x] Live on-chain data fetching

### ✅ Phase 5: Multi-sig Coordination (Complete)
- [x] Transaction status display
- [x] Export/import transactions as JSON
- [x] Signature tracking and progress
- [x] Share transactions via JSON for multi-sig

### ✅ Phase 6: Smart Contract Interactions (Complete)
- [x] Automatic contract detection
- [x] ABI fetching from Etherscan and Sourcify
- [x] EIP-1967 proxy contract support
- [x] Interactive transaction builder
- [x] Function selector with parameter validation
- [x] Automatic function encoding
- [x] Display contract names

### ✅ Phase 7: Safe Transaction Service Integration (Complete)
- [x] Push transactions to Safe Transaction Service
- [x] Pull transactions from Safe Transaction Service
- [x] Sync transactions (push + pull)
- [x] Automatic signature merging
- [x] Multi-chain support for Transaction Service

### 📅 Phase 8+: Advanced Features
- [ ] Batch transactions
- [ ] Transaction templates
- [ ] Module & guard management
- [ ] Recovery and social recovery flows

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [Safe Core SDK](https://github.com/safe-global/safe-core-sdk)
- [Safe Documentation](https://docs.safe.global/)
- [Safe Website](https://safe.global/)
