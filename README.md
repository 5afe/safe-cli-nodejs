# Safe CLI

Modern, interactive CLI for Safe Smart Account management. Built on top of the [Safe Core SDK](https://github.com/safe-global/safe-core-sdk).

## Features

- 🔐 Secure wallet management with encrypted storage
- ⛓️ Multi-chain support with customizable configurations
- 🎨 Beautiful, modern TUI with interactive prompts
- 🚀 Both interactive and non-interactive modes
- 📦 Safe account creation, deployment, and management
- 📝 Transaction creation, signing, and execution
- 🔄 Multi-sig coordination workflows

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
safe config init              # Initialize CLI configuration
safe config show              # Display current configuration
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
safe tx create                 # Create transaction
safe tx sign [safeTxHash]      # Sign transaction (use Safe TX Hash)
safe tx execute [safeTxHash]   # Execute transaction (use Safe TX Hash)
safe tx list                   # List all transactions
safe tx status [safeTxHash]    # Show transaction status and signature progress
safe tx export [safeTxHash]    # Export transaction as JSON for sharing
safe tx export [safeTxHash] -o file  # Export to file
safe tx import [json]          # Import transaction from JSON string or file
```

**Multi-sig Coordination Workflow:**

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

## Configuration

Configuration files are stored in:
- **macOS**: `~/.config/safe-cli/`
- **Linux**: `~/.config/safe-cli/`
- **Windows**: `%APPDATA%\safe-cli\`

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

### 📅 Phase 6+: Advanced Features
- [ ] Batch transactions
- [ ] Transaction templates
- [ ] Module & guard management
- [ ] Safe Transaction Service integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [Safe Core SDK](https://github.com/safe-global/safe-core-sdk)
- [Safe Documentation](https://docs.safe.global/)
- [Safe Website](https://safe.global/)
