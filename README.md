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
safe account create           # Create new Safe account
safe account deploy           # Deploy predicted Safe
safe account open             # Open existing Safe
safe account list             # List all Safes
safe account info             # Show Safe details
```

### Transaction Management (Coming in Phase 3+)

```bash
safe tx create                # Create transaction
safe tx sign <id>             # Sign transaction
safe tx execute <id>          # Execute transaction
safe tx list                  # List pending transactions
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

### 📅 Phase 3: Transaction Core
- [ ] Transaction creation
- [ ] Transaction signing
- [ ] Transaction execution

### 📅 Phase 4+: Advanced Features
- [ ] Batch transactions
- [ ] Transaction templates
- [ ] Multi-sig coordination
- [ ] Module & guard management

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Links

- [Safe Core SDK](https://github.com/safe-global/safe-core-sdk)
- [Safe Documentation](https://docs.safe.global/)
- [Safe Website](https://safe.global/)
