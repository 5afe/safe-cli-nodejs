# Safe CLI - Comprehensive Project Plan

## 1. Project Overview

### Goals
- Create an intuitive CLI for Safe Smart Account management
- Abstract complexity of multi-sig operations and Ethereum transactions
- Support both interactive TUI and non-interactive (scriptable) modes
- Enable custom chain and deployment configurations
- Provide guided workflows for Safe operations

### Key Differentiators
- Modern, beautiful TUI with real-time feedback
- Progressive disclosure of complexity
- Built-in educational prompts and explanations
- Transaction simulation and validation before execution
- State persistence for multi-session workflows

---

## 2. Architecture & Technology Stack

### Core Technologies

**CLI Framework:**
- **Commander.js** or **Yargs** - Command parsing and routing
- **Inquirer.js** or **@clack/prompts** - Interactive prompts (modern, beautiful UI)
- **Ora** - Elegant terminal spinners
- **Chalk** - Terminal colors
- **Boxen** - Styled boxes for important info

**Alternative Modern Stack:**
- **@clack/prompts** - Next-gen interactive CLI (recommended)
- **picocolors** - Fast, tiny color library
- **tsx** - TypeScript execution

**SDK Integration:**
- `@safe-global/protocol-kit` - Core SDK
- `@safe-global/types-kit` - Type definitions
- `viem` - Ethereum utilities (already used by protocol-kit)

**State Management:**
- **Conf** - Persistent config storage
- **Keytar** or **keychain** - Secure credential storage (OS keychain)
- Alternative: Encrypted JSON files with `crypto` module

**Additional Utilities:**
- **zod** - Runtime validation & type safety
- **execa** - Process execution for external tools
- **update-notifier** - CLI update notifications

---

## 3. Core Feature Modules

### Module 1: Configuration Management
```
safe config init          # Initialize CLI configuration
safe config chains        # Manage chain configurations
safe config deployments   # Manage custom Safe deployments
safe config show          # Display current configuration
safe config reset         # Reset to defaults
```

**Features:**
- Store custom RPC endpoints per chain
- Custom Safe contract deployments
- Default Safe version preference
- Gas strategy preferences
- Analytics/telemetry opt-in/out

**Storage Schema:**
```typescript
{
  version: string,
  chains: {
    [chainId]: {
      name: string,
      rpcUrl: string,
      explorer: string,
      currency: string,
      contractNetworks?: ContractNetworksConfig
    }
  },
  defaults: {
    safeVersion: SafeVersion,
    signingMethod: SigningMethod,
    gasStrategy: 'fast' | 'medium' | 'slow'
  },
  preferences: {
    analytics: boolean,
    autoUpdate: boolean
  }
}
```

---

### Module 2: Wallet/Signer Management
```
safe wallet import        # Import private key (secure prompt)
safe wallet use          # Switch active wallet
safe wallet list         # List imported wallets
safe wallet remove       # Remove wallet
safe wallet balance      # Check balances across chains
```

**Features:**
- Secure keychain integration (OS-level)
- Support for multiple signers
- Passkey support (future)
- Read-only mode (no signer required)
- Display addresses with ENS resolution

**Security:**
- Never log private keys
- Use OS keychain when available
- Fallback to encrypted storage
- Require password/PIN for sensitive operations
- Clear guidance on key management

---

### Module 3: Safe Account Management
```
safe account create      # Create new Safe account
safe account deploy      # Deploy predicted Safe
safe account open        # Open existing Safe (add to workspace)
safe account list        # List all Safe accounts in workspace
safe account info        # Display Safe details
safe account switch      # Switch active Safe
safe account export      # Export Safe configuration
```

**Create Flow (Interactive):**
1. Select chain (from configured chains)
2. Choose Safe version or use default
3. Add owners (multiple entries, ENS support)
4. Set threshold (with validation)
5. Optional: Add modules/guards/fallback handler
6. Preview configuration
7. Choose: Deploy now / Save as predicted
8. Show predicted address
9. If deploying: estimate gas, confirm, execute

**Open Flow:**
1. Enter Safe address (with validation)
2. Detect chain (or specify)
3. Fetch Safe info (owners, threshold, modules)
4. Display Safe state
5. Add to workspace with friendly name

**Account Storage:**
```typescript
{
  safes: {
    [safeId]: {
      name: string,
      address: string,
      chainId: string,
      version: SafeVersion,
      owners: string[],
      threshold: number,
      deployed: boolean,
      predictedConfig?: PredictedSafeProps,
      createdAt: string,
      lastUsed: string
    }
  },
  activeSafe: safeId | null
}
```

---

### Module 4: Owner & Threshold Management
```
safe owners list         # List current owners
safe owners add          # Add owner (with threshold update)
safe owners remove       # Remove owner
safe owners replace      # Swap owner
safe threshold set       # Change threshold
```

**Interactive Flow:**
- Display current owners with addresses/ENS
- Validate threshold rules (1 ≤ threshold ≤ owners)
- Create transaction for approval
- Guide through multi-sig signing if needed
- Track pending owner changes

---

### Module 5: Transaction Creation & Management
```
safe tx create           # Create new transaction
safe tx batch            # Create batch transaction
safe tx template         # Use transaction template
safe tx list             # List pending transactions
safe tx show <id>        # Show transaction details
safe tx sign <id>        # Sign pending transaction
safe tx execute <id>     # Execute transaction
safe tx simulate <id>    # Simulate transaction
safe tx cancel <id>      # Cancel/reject transaction
```

**Transaction Builder (Interactive):**
1. **Simple Mode:**
   - Send ETH: Recipient + amount
   - Call contract: Address + ABI/function selector + params
   - Use template: Token transfer, NFT transfer, etc.

2. **Advanced Mode:**
   - Multiple transactions (batch)
   - Raw calldata input
   - DelegateCall operations
   - Custom gas parameters
   - Nonce management

3. **Transaction Preview:**
   ```
   ┌─ Transaction Summary ─────────────────────┐
   │ To:       0x742d...8976                   │
   │ Value:    0.5 ETH                         │
   │ Data:     0x                              │
   │ Type:     CALL                            │
   │ Gas:      21000                           │
   │                                           │
   │ Signers:  1 / 2                          │
   │ ✓ 0x123...456 (you)                      │
   │ ○ 0x789...012                            │
   └───────────────────────────────────────────┘
   ```

4. **Simulation:**
   - Run `isValidTransaction()`
   - Show state changes (using trace/debug)
   - Display warnings (balance checks, gas estimates)

5. **Signing:**
   - Select signing method (EIP-712 v4 default)
   - Sign with active wallet
   - Show signature added
   - Export for other signers if needed

6. **Execution:**
   - Verify threshold met
   - Final confirmation prompt
   - Execute with spinner/progress
   - Show transaction hash + explorer link
   - Wait for confirmation
   - Display result

**Transaction Storage:**
```typescript
{
  transactions: {
    [txId]: {
      safeAddress: string,
      chainId: string,
      txData: SafeTransactionData,
      signatures: Map<string, SafeSignature>,
      status: 'pending' | 'signed' | 'executed' | 'failed',
      createdAt: string,
      executedAt?: string,
      txHash?: string,
      metadata: {
        description?: string,
        tags?: string[]
      }
    }
  }
}
```

---

### Module 6: Transaction Templates
```
safe template list       # List available templates
safe template use        # Use a template
safe template create     # Create custom template
```

**Built-in Templates:**
- **ERC20 Transfer**: Token transfers with decimal handling
- **ERC721 Transfer**: NFT transfers
- **ERC1155 Transfer**: Multi-token transfers
- **Contract Deployment**: Deploy contracts via Safe
- **Gnosis Safe Upgrade**: Upgrade Safe implementation
- **Module Management**: Enable/disable modules
- **Guard Management**: Set/remove guards

**Template Structure:**
```typescript
{
  name: string,
  description: string,
  category: string,
  inputs: {
    name: string,
    type: 'address' | 'uint256' | 'string' | ...,
    description: string,
    validation?: (value: any) => boolean
  }[],
  buildTransaction: (inputs: any) => MetaTransactionData
}
```

---

### Module 7: Module & Guard Management
```
safe modules list        # List enabled modules
safe modules enable      # Enable module
safe modules disable     # Disable module

safe guards show         # Show current guard
safe guards set          # Set guard
safe guards remove       # Remove guard

safe fallback show       # Show fallback handler
safe fallback set        # Set fallback handler
```

---

### Module 8: Multi-Sig Coordination
```
safe share tx <id>       # Export transaction for sharing
safe import tx           # Import transaction from file/string
safe sync                # Sync with Safe Transaction Service (future)
```

**Sharing Flow:**
1. Export transaction as JSON or base64
2. Share via file, clipboard, or QR code
3. Other owner imports
4. Other owner signs
5. Combine signatures
6. Execute when threshold met

**Future: Safe Transaction Service Integration**
- Auto-sync pending transactions
- Off-chain signature collection
- Transaction history

---

## 4. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project setup (TypeScript, build config, dependencies)
- [ ] CLI structure with Commander/Clack
- [ ] Configuration management (chains, storage)
- [ ] Wallet import/management (secure storage)
- [ ] Basic Safe SDK initialization

**Deliverable:** `safe config` and `safe wallet` commands working

---

### Phase 2: Safe Account Operations (Week 3-4)
- [ ] Safe account creation (interactive flow)
- [ ] Safe account deployment
- [ ] Safe account opening (existing)
- [ ] Account information display
- [ ] Workspace management

**Deliverable:** `safe account` commands working, can create and deploy Safes

---

### Phase 3: Transaction Core (Week 5-6)
- [ ] Simple transaction creation (ETH transfer)
- [ ] Transaction signing
- [ ] Transaction execution
- [ ] Transaction simulation/validation
- [ ] Transaction storage and listing

**Deliverable:** Basic `safe tx` flow working end-to-end

---

### Phase 4: Advanced Transactions (Week 7-8)
- [ ] Batch transactions (MultiSend)
- [ ] ABI integration for contract calls
- [ ] Transaction templates system
- [ ] Built-in templates (ERC20, ERC721, etc.)
- [ ] Gas estimation and optimization

**Deliverable:** Complete transaction builder with templates

---

### Phase 5: Multi-Sig & Coordination (Week 9-10)
- [ ] Transaction export/import
- [ ] Signature collection workflow
- [ ] Owner management (add/remove/swap)
- [ ] Threshold changes
- [ ] Multi-owner scenarios

**Deliverable:** Full multi-sig workflow supported

---

### Phase 6: Advanced Features (Week 11-12)
- [ ] Module management
- [ ] Guard management
- [ ] Fallback handler management
- [ ] Custom deployment configurations
- [ ] Chain management

**Deliverable:** Complete feature set

---

### Phase 7: Polish & Distribution (Week 13-14)
- [ ] Comprehensive error handling
- [ ] Help documentation
- [ ] Examples and tutorials
- [ ] npm package setup
- [ ] CI/CD for releases
- [ ] Update notifier
- [ ] Analytics (opt-in)

**Deliverable:** Production-ready CLI

---

## 5. Project Structure

```
safe-cli/
├── src/
│   ├── index.ts                    # CLI entry point
│   ├── cli.ts                      # Command definitions
│   │
│   ├── commands/                   # Command handlers
│   │   ├── config/
│   │   │   ├── init.ts
│   │   │   ├── chains.ts
│   │   │   ├── deployments.ts
│   │   │   └── show.ts
│   │   ├── wallet/
│   │   │   ├── import.ts
│   │   │   ├── list.ts
│   │   │   ├── use.ts
│   │   │   └── remove.ts
│   │   ├── account/
│   │   │   ├── create.ts
│   │   │   ├── deploy.ts
│   │   │   ├── open.ts
│   │   │   ├── list.ts
│   │   │   └── info.ts
│   │   ├── transaction/
│   │   │   ├── create.ts
│   │   │   ├── batch.ts
│   │   │   ├── sign.ts
│   │   │   ├── execute.ts
│   │   │   ├── simulate.ts
│   │   │   └── list.ts
│   │   ├── owners/
│   │   ├── modules/
│   │   ├── guards/
│   │   └── template/
│   │
│   ├── services/                   # Business logic
│   │   ├── safe-service.ts         # Safe SDK operations
│   │   ├── transaction-service.ts   # Transaction management
│   │   ├── signer-service.ts       # Wallet/signer management
│   │   ├── config-service.ts       # Configuration management
│   │   └── template-service.ts     # Template management
│   │
│   ├── storage/                    # Persistence
│   │   ├── config-store.ts         # Configuration storage
│   │   ├── wallet-store.ts         # Secure wallet storage
│   │   ├── safe-store.ts           # Safe accounts storage
│   │   └── tx-store.ts             # Transaction storage
│   │
│   ├── ui/                         # UI components
│   │   ├── prompts.ts              # Reusable prompts
│   │   ├── formatters.ts           # Output formatting
│   │   ├── tables.ts               # Table displays
│   │   ├── spinners.ts             # Loading indicators
│   │   └── messages.ts             # Success/error messages
│   │
│   ├── utils/                      # Utilities
│   │   ├── validation.ts           # Input validation
│   │   ├── ethereum.ts             # Ethereum utilities
│   │   ├── encoding.ts             # Data encoding/decoding
│   │   ├── abi.ts                  # ABI handling
│   │   └── errors.ts               # Error handling
│   │
│   ├── templates/                  # Transaction templates
│   │   ├── index.ts                # Template registry
│   │   ├── erc20-transfer.ts
│   │   ├── erc721-transfer.ts
│   │   ├── contract-deployment.ts
│   │   └── custom-templates/       # User templates
│   │
│   ├── types/                      # TypeScript types
│   │   ├── config.ts
│   │   ├── wallet.ts
│   │   ├── transaction.ts
│   │   └── template.ts
│   │
│   └── constants/                  # Constants
│       ├── chains.ts               # Common chain configs
│       ├── contracts.ts            # Well-known contracts
│       └── defaults.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── templates/                      # Built-in templates
│   └── ... (JSON/YAML definitions)
│
├── docs/
│   ├── README.md
│   ├── GETTING_STARTED.md
│   ├── COMMANDS.md
│   ├── TEMPLATES.md
│   └── EXAMPLES.md
│
├── package.json
├── tsconfig.json
├── .eslintrc.js
└── .prettierrc
```

---

## 6. User Experience Flows

### First-Time Setup Flow
```bash
$ safe

👋 Welcome to Safe CLI!

It looks like this is your first time using Safe CLI.
Let's get you set up!

? Do you want to import a wallet now? › Yes
? Enter your private key: ******************************
? Give this wallet a name: main-wallet
✓ Wallet imported successfully!

? Select chains to configure:
  ✓ Ethereum Mainnet (default RPC)
  ✓ Polygon
  ○ Arbitrum
  ○ Enter custom chain

✓ Configuration saved!

Next steps:
  • Create a Safe:  safe account create
  • Open a Safe:    safe account open
  • View help:      safe help
```

---

### Creating a Safe (Interactive)
```bash
$ safe account create

🔐 Create Safe Account

? Select chain: ›
  Ethereum Mainnet (1)
> Polygon (137)
  Arbitrum One (42161)

? Safe version: › 1.4.1 (recommended)

👥 Configure Owners

? Owner 1 address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD
✓ Valid address

? Add another owner? › Yes

? Owner 2 address: vitalik.eth
⏳ Resolving ENS...
✓ Resolved to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

? Add another owner? › No

⚙️ Configure Threshold

? Signature threshold (1-2): › 2

? Add modules/guards/fallback handler? › No

📋 Safe Configuration Summary

  Chain:      Polygon (137)
  Version:    1.4.1
  Owners:     2
              • 0x742d...bEbD (you)
              • 0xd8dA...6045 (vitalik.eth)
  Threshold:  2 / 2

  Predicted Address: 0x1234567890abcdef1234567890abcdef12345678

? What would you like to do? ›
> Deploy now
  Save as predicted (deploy later)
  Cancel

⏳ Deploying Safe...

  • Estimating gas...    21,234 gas (~$0.05)
  • Creating deployment transaction...
  • Sending transaction... 0xabcd...
  • Waiting for confirmation...

✓ Safe deployed successfully!

  Safe Address:    0x1234567890abcdef1234567890abcdef12345678
  Transaction:     0xabcd1234...
  Block:           #42,123,456
  Gas Used:        21,234 (~$0.05)

  View on explorer: https://polygonscan.com/address/0x1234...

Safe added to workspace as: my-polygon-safe
```

---

### Creating a Transaction (Interactive)
```bash
$ safe tx create

💸 Create Transaction

Current Safe: my-polygon-safe (0x1234...5678)
Chain: Polygon (137)
Balance: 10.5 MATIC

? Transaction type: ›
  Send ETH/Native Token
> Call Contract Function
  Use Template
  Advanced (Raw Data)

? Contract address: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
⏳ Loading contract info...
✓ USDC Token (ERC20)

? Select function: ›
> transfer(address recipient, uint256 amount)
  approve(address spender, uint256 amount)
  transferFrom(address sender, address recipient, uint256 amount)

? Recipient address: 0x9876543210abcdef9876543210abcdef98765432
✓ Valid address

? Amount: 100
? Decimals: › 6 (detected: USDC uses 6 decimals)
✓ Amount: 100.000000 USDC

📋 Transaction Summary

  To:         USDC Token (0x2791...4174)
  Function:   transfer
  Parameters:
    recipient: 0x9876...5432
    amount:    100000000 (100.000000 USDC)
  Value:      0 MATIC
  Operation:  CALL

? Add another transaction (batch)? › No

⏳ Simulating transaction...
✓ Transaction simulation successful!

  Estimated Gas: 65,000
  Gas Cost: ~$0.02

  State Changes:
  • Your Safe USDC balance: 1,000.00 → 900.00 (-100.00)
  • 0x9876...5432 USDC balance: 50.00 → 150.00 (+100.00)

? Proceed? ›
> Sign & Save
  Save without signing
  Cancel

⏳ Signing transaction...
✓ Signed! (1 / 2 signatures)

Transaction ID: tx_abc123

? Next steps: ›
  Wait for other signers
> Export for other signers
  View transaction details

? Export format: ›
> Copy to clipboard
  Save to file
  Show QR code

✓ Transaction copied to clipboard!

Share this with other signers:
safe import tx <paste>

Once 2/2 signatures collected, execute with:
safe tx execute tx_abc123
```

---

### Non-Interactive Mode
```bash
# Create Safe
safe account create \
  --chain 137 \
  --owners 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEbD,vitalik.eth \
  --threshold 2 \
  --deploy \
  --name my-polygon-safe

# Create transaction
safe tx create \
  --to 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 \
  --value 0 \
  --data $(cast calldata "transfer(address,uint256)" 0x9876... 100000000) \
  --output tx_abc123.json

# Sign transaction
safe tx sign tx_abc123 --key-file key.json

# Execute transaction
safe tx execute tx_abc123 --yes
```

---

## 7. Configuration Management

### Config File Location
- **macOS**: `~/.config/safe-cli/config.json`
- **Linux**: `~/.config/safe-cli/config.json`
- **Windows**: `%APPDATA%\safe-cli\config.json`

### Secure Storage
- **macOS**: Keychain
- **Linux**: gnome-keyring / secret-service
- **Windows**: Credential Manager
- **Fallback**: Encrypted JSON with user password

### Environment Variables
```bash
SAFE_CLI_RPC_URL          # Override default RPC
SAFE_CLI_PRIVATE_KEY      # Provide signer (for scripts)
SAFE_CLI_CONFIG_DIR       # Override config directory
SAFE_CLI_NO_ANALYTICS     # Disable analytics
SAFE_CLI_CHAIN_ID         # Default chain
```

---

## 8. Security Considerations

### Private Key Handling
- ✓ Never log private keys
- ✓ Use OS keychain when available
- ✓ Encrypt fallback storage
- ✓ Clear memory after use
- ✓ Warn users about key management
- ✓ Support read-only mode (no keys needed)

### Transaction Safety
- ✓ Always simulate before execution
- ✓ Display clear transaction summaries
- ✓ Require explicit confirmation
- ✓ Validate addresses (checksum)
- ✓ Warn on large value transfers
- ✓ Show gas estimates

### Network Safety
- ✓ Validate RPC URLs
- ✓ Warn on custom deployments
- ✓ Verify chain IDs
- ✓ Support for Tenderly/Foundry forking

---

## 9. Testing Strategy

### Unit Tests
- Service layer logic
- Validation functions
- Encoding/decoding utilities
- Template rendering

### Integration Tests
- Safe SDK integration
- Storage operations
- End-to-end command flows

### E2E Tests
- Full user workflows
- Use local testnet (Hardhat/Anvil)
- Test multi-sig scenarios
- Test error handling

### Manual Testing Checklist
- [ ] First-time setup flow
- [ ] All interactive prompts
- [ ] Non-interactive mode
- [ ] Error messages are helpful
- [ ] Cross-platform (macOS, Linux, Windows)

---

## 10. Distribution & Deployment

### NPM Package
```json
{
  "name": "@safe-global/safe-cli",
  "version": "1.0.0",
  "bin": {
    "safe": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs --dts",
    "prepublish": "npm run build"
  }
}
```

### Installation
```bash
npm install -g @safe-global/safe-cli

# or

npx @safe-global/safe-cli
```

### CI/CD
- GitHub Actions for testing
- Semantic versioning
- Automated releases
- Changelog generation

### Documentation
- Comprehensive README
- Command reference
- Tutorial videos
- Example scripts

---

## 11. Future Enhancements

### Phase 8+
- Safe Transaction Service integration
- Passkey support
- Hardware wallet support (Ledger, Trezor)
- Account abstraction features (EIP-4337)
- Safe Apps integration
- Webhook/notification system
- Dashboard/web UI companion
- Plugin system for custom commands
- Team/organization management
- Transaction scheduling
- Governance tools (Snapshot integration)

---

## 12. Success Metrics

- **Usability**: User completes first Safe creation in < 2 minutes
- **Reliability**: 99% success rate for valid operations
- **Performance**: Commands respond in < 500ms (excluding blockchain ops)
- **Adoption**: Target 1000 active users in first 3 months
- **Satisfaction**: > 4.5/5 user rating

---

## Next Steps

1. Review and refine this plan based on feedback
2. Set up project infrastructure (Phase 1)
3. Begin implementation following the phased approach
4. Iterate based on user testing and feedback
