# Safe CLI Web App Architecture Plan

## Overview

This document outlines the architecture for running Safe CLI as a web application while maintaining the existing CLI functionality. The strategy uses a monorepo with platform adapters and terminal emulation to avoid UI redesign.

## Architecture: Monorepo with Platform Adapters

```
safe-cli/
├── packages/
│   ├── core/                    # Shared business logic (platform-agnostic)
│   │   ├── services/            # All existing services (unchanged!)
│   │   │   ├── safe-service.ts
│   │   │   ├── transaction-service.ts
│   │   │   ├── abi-service.ts
│   │   │   └── ...
│   │   ├── commands/            # Shared command implementations
│   │   │   ├── wallet/
│   │   │   ├── account/
│   │   │   └── tx/
│   │   ├── types/               # Shared types
│   │   └── utils/               # Ethereum utilities (viem, etc.)
│   │
│   ├── platform-adapters/       # Platform-specific implementations
│   │   ├── storage/
│   │   │   ├── interface.ts     # IStorage interface
│   │   │   ├── node.ts          # Conf-based (current)
│   │   │   └── browser.ts       # IndexedDB-based
│   │   ├── crypto/
│   │   │   ├── interface.ts     # ICrypto interface
│   │   │   ├── node.ts          # Node crypto module
│   │   │   └── browser.ts       # Web Crypto API
│   │   ├── ledger/
│   │   │   ├── interface.ts     # Already exists! ILedgerTransport
│   │   │   ├── node.ts          # hw-transport-node-hid (current)
│   │   │   └── browser.ts       # hw-transport-webhid
│   │   └── prompts/
│   │       ├── interface.ts     # IPrompts interface
│   │       ├── node.ts          # @clack/prompts wrapper
│   │       └── browser.ts       # xterm.js-based prompts
│   │
│   ├── cli/                     # Node.js CLI (current app)
│   │   ├── commands/            # CLI-specific wrappers (if needed)
│   │   ├── index.ts             # CLI entry point
│   │   └── ui/                  # Ink components (keep as-is!)
│   │
│   └── web/                     # Browser web app
│       ├── src/
│       │   ├── components/
│       │   │   ├── Terminal.tsx          # xterm.js wrapper
│       │   │   └── TerminalInterface.tsx # Main UI
│       │   ├── terminal-adapter/         # Make commands work in browser
│       │   │   ├── command-parser.ts
│       │   │   └── prompt-renderer.tsx
│       │   └── index.tsx
│       ├── vite.config.ts
│       └── package.json
│
├── package.json (workspace root)
└── turbo.json (optional: for build orchestration)
```

## Key Strategy: Terminal Emulation in Browser

Instead of redesigning the UI, **render the CLI prompts in a web-based terminal emulator** using xterm.js.

### 1. Terminal UI Component (xterm.js)

```tsx
// packages/web/src/components/Terminal.tsx
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef } from 'react'

export function TerminalUI() {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal>()

  useEffect(() => {
    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      cursorStyle: 'block',
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    term.open(terminalRef.current!)
    fitAddon.fit()

    xtermRef.current = term

    // Initialize CLI session
    initializeCLI(term)

    // Handle window resize
    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [])

  return (
    <div
      ref={terminalRef}
      style={{
        height: '100vh',
        width: '100vw',
        padding: '10px'
      }}
    />
  )
}
```

### 2. Platform Adapter Interfaces

#### Storage Interface

```typescript
// packages/platform-adapters/storage/interface.ts
export interface IStorage {
  get<T>(key: string, defaultValue?: T): T | undefined
  set(key: string, value: unknown): void
  delete(key: string): void
  clear(): void
  has(key: string): boolean
  getPath(): string // Returns identifier for storage location
}

export interface IWalletStorage {
  importWallet(name: string, privateKey: string, password?: string): Promise<PrivateKeyWallet>
  importLedgerWallet(name: string, address: string, path: string): Promise<LedgerWallet>
  getPrivateKey(walletId: string, password?: string): string
  getAllWallets(): Wallet[]
  getWallet(walletId: string): Wallet | undefined
  getActiveWallet(): Wallet | null
  setActiveWallet(walletId: string): void
  removeWallet(walletId: string): void
  updateWalletName(walletId: string, newName: string): void
  setPassword(password: string): void
}

// Similar interfaces for ConfigStorage, SafeStorage, TransactionStorage
```

#### Crypto Interface

```typescript
// packages/platform-adapters/crypto/interface.ts
export interface ICrypto {
  // Encryption
  encrypt(plaintext: string, password: string): Promise<string>
  decrypt(ciphertext: string, password: string): Promise<string>

  // Random generation
  randomBytes(length: number): Promise<Uint8Array>

  // Hashing
  sha256(data: string | Uint8Array): Promise<Uint8Array>

  // Key derivation
  pbkdf2(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keyLength: number
  ): Promise<Uint8Array>
}
```

#### Prompts Interface

```typescript
// packages/platform-adapters/prompts/interface.ts
export interface ISpinner {
  start(message: string): void
  stop(message: string): void
}

export interface TextOptions {
  message: string
  placeholder?: string
  defaultValue?: string
  validate?: (value: string) => string | void
}

export interface SelectOption<T> {
  value: T
  label: string
  hint?: string
}

export interface SelectOptions<T> {
  message: string
  options: SelectOption<T>[]
  initialValue?: T
}

export interface IPrompts {
  intro(message: string): void
  outro(message: string): void
  text(options: TextOptions): Promise<string>
  select<T>(options: SelectOptions<T>): Promise<T>
  multiselect<T>(options: SelectOptions<T>): Promise<T[]>
  confirm(options: { message: string }): Promise<boolean>
  password(options: { message: string }): Promise<string>
  spinner(): ISpinner
  log: {
    error(message: string): void
    success(message: string): void
    warning(message: string): void
    info(message: string): void
    message(message: string): void
  }
}
```

### 3. Platform Context (Dependency Injection)

```typescript
// packages/core/context.ts
export interface PlatformContext {
  storage: {
    config: IConfigStorage
    wallet: IWalletStorage
    safe: ISafeStorage
    transaction: ITransactionStorage
  }
  crypto: ICrypto
  ledger: ILedgerTransport
  prompts: IPrompts
}

let context: PlatformContext | null = null

export function setPlatformContext(ctx: PlatformContext): void {
  context = ctx
}

export function getPlatformContext(): PlatformContext {
  if (!context) {
    throw new Error('Platform context not initialized. Call setPlatformContext() first.')
  }
  return context
}

export function hasPlatformContext(): boolean {
  return context !== null
}
```

### 4. Node.js Implementation (Current CLI)

```typescript
// packages/cli/index.ts
import { setPlatformContext } from '@safe-cli/core/context'
import { NodeConfigStorage } from '@safe-cli/platform-adapters/storage/node'
import { NodeWalletStorage } from '@safe-cli/platform-adapters/storage/node'
import { NodeCrypto } from '@safe-cli/platform-adapters/crypto/node'
import { NodeLedger } from '@safe-cli/platform-adapters/ledger/node'
import { NodePrompts } from '@safe-cli/platform-adapters/prompts/node'

// Initialize platform context for Node.js
setPlatformContext({
  storage: {
    config: new NodeConfigStorage(),
    wallet: new NodeWalletStorage(),
    safe: new NodeSafeStorage(),
    transaction: new NodeTransactionStorage(),
  },
  crypto: new NodeCrypto(),
  ledger: new NodeLedger(),
  prompts: new NodePrompts(),
})

// Run existing CLI
import { program } from './cli.js'
program.parse(process.argv)
```

### 5. Browser Implementation

```typescript
// packages/web/src/index.tsx
import { setPlatformContext } from '@safe-cli/core/context'
import { BrowserStorage } from '@safe-cli/platform-adapters/storage/browser'
import { BrowserCrypto } from '@safe-cli/platform-adapters/crypto/browser'
import { BrowserLedger } from '@safe-cli/platform-adapters/ledger/browser'
import { BrowserPrompts } from '@safe-cli/platform-adapters/prompts/browser'

function App() {
  const terminalRef = useRef<Terminal>()

  useEffect(() => {
    const terminal = terminalRef.current!

    // Initialize platform context for browser
    setPlatformContext({
      storage: {
        config: new BrowserConfigStorage(),
        wallet: new BrowserWalletStorage(),
        safe: new BrowserSafeStorage(),
        transaction: new BrowserTransactionStorage(),
      },
      crypto: new BrowserCrypto(),
      ledger: new BrowserLedger(),
      prompts: new BrowserPrompts(terminal),
    })

    // Initialize command handler
    initializeCommandHandler(terminal)
  }, [])

  return <TerminalUI ref={terminalRef} />
}
```

### 6. Shared Commands (Zero Changes!)

Commands can remain almost identical:

```typescript
// packages/core/commands/tx/create.ts (shared!)
import { getPlatformContext } from '../../context.js'
import { TransactionService } from '../../services/transaction-service.js'

export async function createTransaction() {
  const { prompts, storage } = getPlatformContext()

  prompts.intro('Create Safe Transaction')

  try {
    const safeStorage = storage.safe
    const configStorage = storage.config
    const walletStorage = storage.wallet

    const activeWallet = walletStorage.getActiveWallet()
    if (!activeWallet) {
      prompts.log.error('No active wallet found')
      prompts.outro('Setup required')
      return
    }

    // All your existing logic works!
    const safes = safeStorage.getAllSafes()

    const safeKey = await prompts.select({
      message: 'Select Safe to create transaction for',
      options: safes.map(safe => ({
        value: `${safe.chainId}:${safe.address}`,
        label: `${safe.name} (${safe.address})`,
        hint: safe.chainId
      }))
    })

    // ... rest of your existing code unchanged

    prompts.outro('Transaction created!')
  } catch (error) {
    prompts.log.error(error.message)
    prompts.outro('Failed')
  }
}
```

## Browser Implementation Details

### Storage: IndexedDB Wrapper

```typescript
// packages/platform-adapters/storage/browser.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface SafeCliDB extends DBSchema {
  config: {
    key: string
    value: unknown
  }
  wallets: {
    key: string
    value: unknown
  }
  'wallets-secure': {
    key: string
    value: string
  }
  safes: {
    key: string
    value: unknown
  }
  transactions: {
    key: string
    value: unknown
  }
}

export class BrowserStorage implements IStorage {
  private db: IDBPDatabase<SafeCliDB> | null = null
  private storeName: keyof SafeCliDB

  constructor(storeName: keyof SafeCliDB) {
    this.storeName = storeName
  }

  private async getDB(): Promise<IDBPDatabase<SafeCliDB>> {
    if (this.db) return this.db

    this.db = await openDB<SafeCliDB>('safe-cli', 1, {
      upgrade(db) {
        db.createObjectStore('config')
        db.createObjectStore('wallets')
        db.createObjectStore('wallets-secure')
        db.createObjectStore('safes')
        db.createObjectStore('transactions')
      },
    })

    return this.db
  }

  async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const db = await this.getDB()
    const value = await db.get(this.storeName, key)
    return value !== undefined ? (value as T) : defaultValue
  }

  async set(key: string, value: unknown): Promise<void> {
    const db = await this.getDB()
    await db.put(this.storeName, value, key)
  }

  async delete(key: string): Promise<void> {
    const db = await this.getDB()
    await db.delete(this.storeName, key)
  }

  async clear(): Promise<void> {
    const db = await this.getDB()
    await db.clear(this.storeName)
  }

  async has(key: string): Promise<boolean> {
    const db = await this.getDB()
    const value = await db.get(this.storeName, key)
    return value !== undefined
  }

  getPath(): string {
    return `indexeddb://safe-cli/${this.storeName}`
  }
}
```

### Crypto: Web Crypto API

```typescript
// packages/platform-adapters/crypto/browser.ts
export class BrowserCrypto implements ICrypto {
  async encrypt(plaintext: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(64))
    const iv = crypto.getRandomValues(new Uint8Array(16))

    const key = await this.deriveKey(password, salt)

    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    )

    // Combine salt + iv + encrypted
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    result.set(salt, 0)
    result.set(iv, salt.length)
    result.set(new Uint8Array(encrypted), salt.length + iv.length)

    return btoa(String.fromCharCode(...result))
  }

  async decrypt(ciphertext: string, password: string): Promise<string> {
    const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))

    const salt = data.slice(0, 64)
    const iv = data.slice(64, 80)
    const encrypted = data.slice(80)

    const key = await this.deriveKey(password, salt)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  async randomBytes(length: number): Promise<Uint8Array> {
    return crypto.getRandomValues(new Uint8Array(length))
  }

  async sha256(data: string | Uint8Array): Promise<Uint8Array> {
    const buffer = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data
    const hash = await crypto.subtle.digest('SHA-256', buffer)
    return new Uint8Array(hash)
  }

  async pbkdf2(
    password: string,
    salt: Uint8Array,
    iterations: number,
    keyLength: number
  ): Promise<Uint8Array> {
    const key = await this.deriveKey(password, salt, iterations)
    const exported = await crypto.subtle.exportKey('raw', key)
    return new Uint8Array(exported).slice(0, keyLength)
  }

  private async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations = 100000
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  }
}
```

### Ledger: WebHID Transport

```typescript
// packages/platform-adapters/ledger/browser.ts
import TransportWebHID from '@ledgerhq/hw-transport-webhid'
import Eth from '@ledgerhq/hw-app-eth'

export class BrowserLedgerTransport implements ILedgerTransport {
  private transport: TransportWebHID | null = null
  private eth: Eth | null = null

  async connect(): Promise<void> {
    try {
      this.transport = await TransportWebHID.create()
      this.eth = new Eth(this.transport)
    } catch (error) {
      throw new SafeCLIError(
        `Failed to connect to Ledger: ${error.message}`
      )
    }
  }

  async getAddress(derivationPath: string): Promise<string> {
    if (!this.eth) throw new SafeCLIError('Not connected')

    const result = await this.eth.getAddress(derivationPath, false, true)
    return getAddress(result.address)
  }

  // ... rest of implementation (same as Node version but using WebHID)
}
```

### Prompts: xterm.js Renderer

```typescript
// packages/platform-adapters/prompts/browser.ts
import type { Terminal } from '@xterm/xterm'

export class BrowserPrompts implements IPrompts {
  constructor(private terminal: Terminal) {}

  intro(message: string): void {
    this.terminal.writeln(`\r\n┌  ${message}`)
    this.terminal.writeln('│')
  }

  outro(message: string): void {
    this.terminal.writeln('│')
    this.terminal.writeln(`└  ${message}\r\n`)
  }

  async text(options: TextOptions): Promise<string> {
    return new Promise((resolve) => {
      this.terminal.write(`│  ${options.message}\r\n`)
      this.terminal.write(`│  `)

      let input = ''

      const handler = (data: string) => {
        // Handle backspace
        if (data === '\x7F') {
          if (input.length > 0) {
            input = input.slice(0, -1)
            this.terminal.write('\b \b')
          }
          return
        }

        // Handle enter
        if (data === '\r') {
          this.terminal.write('\r\n')
          this.terminal.off('data', handler)

          // Validate
          if (options.validate) {
            const error = options.validate(input)
            if (error) {
              this.log.error(error)
              resolve(this.text(options))
              return
            }
          }

          resolve(input)
          return
        }

        // Regular character
        input += data
        this.terminal.write(data)
      }

      this.terminal.onData(handler)
    })
  }

  async select<T>(options: SelectOptions<T>): Promise<T> {
    return new Promise((resolve) => {
      let selectedIndex = 0

      const render = () => {
        // Clear previous render
        this.terminal.write('\x1b[2K\r')

        this.terminal.write(`│  ${options.message}\r\n`)

        options.options.forEach((option, index) => {
          const isSelected = index === selectedIndex
          const prefix = isSelected ? '❯' : ' '
          const color = isSelected ? '\x1b[36m' : ''
          const reset = '\x1b[0m'

          this.terminal.write(
            `│  ${prefix} ${color}${option.label}${reset}\r\n`
          )
        })
      }

      render()

      const handler = (data: string) => {
        // Arrow up
        if (data === '\x1b[A') {
          selectedIndex = Math.max(0, selectedIndex - 1)
          render()
        }
        // Arrow down
        else if (data === '\x1b[B') {
          selectedIndex = Math.min(options.options.length - 1, selectedIndex + 1)
          render()
        }
        // Enter
        else if (data === '\r') {
          this.terminal.write('\r\n')
          this.terminal.off('data', handler)
          resolve(options.options[selectedIndex].value)
        }
      }

      this.terminal.onData(handler)
    })
  }

  spinner(): ISpinner {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    let frameIndex = 0
    let interval: number | null = null

    return {
      start: (message: string) => {
        interval = setInterval(() => {
          this.terminal.write(`\r│  ${frames[frameIndex]} ${message}`)
          frameIndex = (frameIndex + 1) % frames.length
        }, 80)
      },
      stop: (message: string) => {
        if (interval) clearInterval(interval)
        this.terminal.write(`\r│  ✓ ${message}\r\n`)
      },
    }
  }

  log = {
    error: (msg: string) => this.terminal.writeln(`│  \x1b[31m✖\x1b[0m ${msg}`),
    success: (msg: string) => this.terminal.writeln(`│  \x1b[32m✓\x1b[0m ${msg}`),
    warning: (msg: string) => this.terminal.writeln(`│  \x1b[33m⚠\x1b[0m ${msg}`),
    info: (msg: string) => this.terminal.writeln(`│  \x1b[36mℹ\x1b[0m ${msg}`),
    message: (msg: string) => this.terminal.writeln(`│  ${msg}`),
  }
}
```

## Migration Steps

### Phase 1: Create Interfaces & Refactor (2-3 days)

1. Create platform adapter interfaces
2. Wrap existing Node.js implementations without changing behavior
3. Update imports throughout codebase to use `getPlatformContext()`
4. Test that CLI still works exactly as before

**Deliverable**: CLI works identically but uses dependency injection

### Phase 2: Build Browser Adapters (3-4 days)

1. Implement `BrowserStorage` (IndexedDB wrapper)
2. Implement `BrowserCrypto` (Web Crypto API)
3. Implement `BrowserLedger` (swap to hw-transport-webhid)
4. Test each adapter individually with unit tests

**Deliverable**: Browser adapters pass all tests

### Phase 3: Terminal Emulation (3-5 days)

1. Set up web package with Vite + React
2. Integrate xterm.js
3. Build `BrowserPrompts` that renders to xterm.js
4. Create command parser/executor for web
5. Wire up keyboard shortcuts (Ctrl+C, Ctrl+L, etc.)

**Deliverable**: Basic web terminal with one working command

### Phase 4: Full Integration (2-3 days)

1. Enable all commands in web version
2. Add file upload/download for import/export
3. Test all workflows end-to-end
4. Handle edge cases (session persistence, etc.)

**Deliverable**: Feature-complete web version

### Phase 5: Polish (2-3 days)

1. Match terminal styling exactly to native CLI
2. Add copy/paste support
3. Add keyboard shortcuts
4. Improve error messages for web-specific issues
5. Add loading states and better UX

**Deliverable**: Production-ready web app

## Package Configuration

### Root package.json

```json
{
  "name": "safe-cli-monorepo",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:cli": "npm run dev --workspace=@safe-cli/cli",
    "dev:web": "npm run dev --workspace=@safe-cli/web",
    "build": "turbo run build",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

### packages/core/package.json

```json
{
  "name": "@safe-cli/core",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./context": "./dist/context.js",
    "./commands/*": "./dist/commands/*.js",
    "./services/*": "./dist/services/*.js",
    "./types/*": "./dist/types/*.js",
    "./utils/*": "./dist/utils/*.js"
  },
  "dependencies": {
    "@safe-global/api-kit": "^4.0.0",
    "@safe-global/protocol-kit": "^5.1.1",
    "@safe-global/types-kit": "^3.0.0",
    "viem": "^2.21.8",
    "zod": "^3.24.1"
  }
}
```

### packages/platform-adapters/package.json

```json
{
  "name": "@safe-cli/platform-adapters",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    "./storage/*": "./dist/storage/*.js",
    "./crypto/*": "./dist/crypto/*.js",
    "./ledger/*": "./dist/ledger/*.js",
    "./prompts/*": "./dist/prompts/*.js"
  },
  "dependencies": {
    "@safe-cli/core": "workspace:*"
  },
  "peerDependencies": {
    "@ledgerhq/hw-app-eth": "^6.46.1",
    "@ledgerhq/hw-transport": "^6.31.4"
  }
}
```

### packages/web/package.json

```json
{
  "name": "@safe-cli/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@safe-cli/core": "workspace:*",
    "@safe-cli/platform-adapters": "workspace:*",
    "@xterm/xterm": "^5.5.0",
    "@xterm/addon-fit": "^0.10.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "idb": "^8.0.0",
    "@ledgerhq/hw-transport-webhid": "^6.29.4"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0"
  }
}
```

## Benefits of This Architecture

✅ **Zero UI redesign** - Terminal looks and feels identical to native CLI
✅ **Shared commands** - One codebase for both CLI and web
✅ **Clean separation** - Platform-specific code isolated
✅ **CLI unchanged** - Existing users see no difference
✅ **Testable** - Mock platform adapters for easy testing
✅ **Future-proof** - Easy to add Electron, mobile, VS Code extension, etc.
✅ **Type-safe** - Full TypeScript support across all packages
✅ **Maintainable** - Business logic in one place

## Deployment

### CLI (npm)

Publish as usual:
```bash
cd packages/cli
npm publish --access public
```

### Web App

Deploy to static hosting:
```bash
cd packages/web
npm run build
# Deploy dist/ to Vercel, Netlify, Cloudflare Pages, etc.
```

## Security Considerations

### Browser Environment

1. **Private Key Storage**: Use IndexedDB with encrypted keys (same as current CLI)
2. **Session Persistence**: Consider session timeout for inactive tabs
3. **HTTPS Required**: Enforce HTTPS for Ledger WebHID access
4. **Content Security Policy**: Strict CSP to prevent XSS
5. **SubResource Integrity**: Use SRI for external dependencies

### Data Migration

Users may want to migrate from CLI → Web or vice versa:
- Export/import functionality for all data
- Document migration process
- Consider cloud sync option (optional)

## Future Enhancements

1. **Electron Desktop App** - Reuse web version with native features
2. **Mobile App** - React Native with same core logic
3. **VS Code Extension** - Integrate terminal into VS Code
4. **Browser Extension** - Quick access from browser
5. **Cloud Sync** - Optional encrypted cloud backup
6. **Collaboration** - Multi-user Safe management

## Estimated Timeline

- **Phase 1** (Interfaces): 2-3 days
- **Phase 2** (Browser Adapters): 3-4 days
- **Phase 3** (Terminal Emulation): 3-5 days
- **Phase 4** (Integration): 2-3 days
- **Phase 5** (Polish): 2-3 days

**Total: 12-18 days** (2-3 weeks for a skilled full-stack developer)

## Getting Started

1. Create monorepo structure
2. Move existing code to `packages/core` and `packages/cli`
3. Create interfaces in `packages/platform-adapters`
4. Refactor CLI to use platform context
5. Build browser adapters
6. Create web terminal UI
7. Test and iterate
