# Transaction Builder JSON Format Analysis

## Executive Summary

The Safe Transaction Builder JSON format is **compatible but not fully sufficient** for our current export/import needs. It provides batch transaction support and rich metadata but is missing critical fields for multi-sig coordination workflows.

## Format Comparison

### Safe Transaction Builder Format (Example)
```json
{
  "version": "1.0",
  "chainId": "1",
  "createdAt": 1761326849944,
  "meta": {
    "name": "Transactions Batch",
    "description": "",
    "txBuilderVersion": "1.18.2",
    "createdFromSafeAddress": "0xA77DE01e157f9f57C7c4A326eeE9C4874D0598b6",
    "createdFromOwnerAddress": "",
    "checksum": "0x8b5032f716845c8b08bab3d63dbd9ba92e056f3557793cd041e59b84e16aa989"
  },
  "transactions": [
    {
      "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "value": "0",
      "data": null,
      "contractMethod": {
        "inputs": [
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          }
        ],
        "name": "approve",
        "payable": false
      },
      "contractInputsValues": {
        "spender": "0x474e5Ded6b5D078163BFB8F6dBa355C3aA5478C8",
        "value": "100000000000"
      }
    }
  ]
}
```

### Current CLI Export Format
```json
{
  "safeTxHash": "0x123...",
  "safe": "eth:0xA77...",
  "chainId": "1",
  "safeAddress": "0xA77DE01e157f9f57C7c4A326eeE9C4874D0598b6",
  "metadata": {
    "to": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "value": "0",
    "data": "0x095ea7b3...",
    "operation": 0,
    "safeTxGas": "0",
    "baseGas": "0",
    "gasPrice": "0",
    "gasToken": "0x0000000000000000000000000000000000000000",
    "refundReceiver": "0x0000000000000000000000000000000000000000",
    "nonce": 5
  },
  "signatures": [
    {
      "signer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
      "signature": "0x1234...",
      "signedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "createdBy": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

## Field-by-Field Analysis

### ✅ Fields Present in Both Formats
| Field | Transaction Builder | Current CLI | Notes |
|-------|-------------------|-------------|-------|
| Chain ID | `chainId` | `chainId` | ✅ Compatible |
| Safe Address | `meta.createdFromSafeAddress` | `safeAddress` | ✅ Compatible |
| To Address | `transactions[].to` | `metadata.to` | ✅ Compatible |
| Value | `transactions[].value` | `metadata.value` | ✅ Compatible (needs parsing) |
| Created At | `createdAt` | `createdAt` | ✅ Compatible |
| Creator | `meta.createdFromOwnerAddress` | `createdBy` | ✅ Compatible (may be empty) |

### ⚠️ Fields Only in Transaction Builder Format
| Field | Purpose | Importance for CLI |
|-------|---------|-------------------|
| `version` | Format version | 🟡 Nice to have for future-proofing |
| `meta.name` | Batch name | 🟡 Nice to have for batch identification |
| `meta.description` | Batch description | 🟡 Nice to have for documentation |
| `meta.txBuilderVersion` | Builder version | 🟢 Low - internal metadata |
| `meta.checksum` | Data integrity | 🟡 Nice to have for verification |
| `transactions[]` | Array of transactions | 🔴 **Critical - enables batch support** |
| `contractMethod` | Function ABI info | 🟡 Nice to have for UI display |
| `contractInputsValues` | Decoded parameters | 🟡 Nice to have for UI display |

### ❌ Fields Missing from Transaction Builder Format
| Field | Purpose | Impact |
|-------|---------|--------|
| `safeTxHash` | Transaction identifier | 🔴 **CRITICAL** - Required for signing/execution |
| `metadata.data` | Encoded calldata | 🔴 **CRITICAL** - Required for execution (or must be encoded from contractMethod) |
| `metadata.operation` | Call vs DelegateCall | 🔴 **CRITICAL** - Required for execution |
| `metadata.nonce` | Transaction ordering | 🔴 **CRITICAL** - Required for safe transaction |
| `metadata.safeTxGas` | Gas parameters | 🟡 Important - Can default to 0 |
| `metadata.baseGas` | Gas parameters | 🟡 Important - Can default to 0 |
| `metadata.gasPrice` | Gas parameters | 🟡 Important - Can default to 0 |
| `metadata.gasToken` | Gas payment token | 🟡 Important - Can default to ETH |
| `metadata.refundReceiver` | Gas refund address | 🟡 Important - Can default to 0x0 |
| `signatures[]` | Multi-sig signatures | 🔴 **CRITICAL** - Required for multi-sig coordination |
| `safe` (EIP-3770) | Human-readable address | 🟢 Low - Can be reconstructed |

## Critical Gaps

### 1. **No safeTxHash** 🔴
- Transaction Builder format doesn't include the safeTxHash
- This is the **unique identifier** for Safe transactions
- Required for:
  - Signing (`safe tx sign <safeTxHash>`)
  - Executing (`safe tx execute <safeTxHash>`)
  - Status checking (`safe tx status <safeTxHash>`)
  - Pushing to Safe API (`safe tx push <safeTxHash>`)

**Workaround**: We would need to compute the safeTxHash from transaction data on import.

### 2. **No Signatures Array** 🔴
- Transaction Builder format doesn't track signatures
- Our CLI's main use case is **multi-sig coordination**
- Without signatures:
  - Can't track who has signed
  - Can't share partially signed transactions
  - Can't merge signatures from multiple owners

**Workaround**: Transaction Builder format is only for **unsigned** transaction batches. Signatures would need to be added separately.

### 3. **No Encoded Data** ⚠️
- Transaction Builder has `contractMethod` and `contractInputsValues` instead of encoded `data`
- Needs encoding before execution

**Workaround**: Encode the data from `contractMethod` and `contractInputsValues` on import.

### 4. **No Transaction Nonce** 🔴
- Transaction Builder doesn't specify nonce
- Critical for Safe transaction ordering
- Multiple transactions could conflict

**Workaround**: Would need to fetch current nonce and assign on import.

### 5. **No Operation Type** ⚠️
- Transaction Builder doesn't specify Call vs DelegateCall
- Defaults to Call (0) in most cases

**Workaround**: Default to Call (0) unless specified.

## Compatibility Assessment

### Can Transaction Builder Format Replace Current Format?
**No** ❌ - Missing critical fields for multi-sig coordination:
- No safeTxHash for transaction identification
- No signatures for multi-sig workflow
- No nonce for transaction ordering
- No gas parameters for Safe execution

### Can We Import Transaction Builder Format?
**Partially** ⚠️ - We could import as **unsigned transaction templates**:
1. Parse Transaction Builder JSON
2. Encode the transaction data from `contractMethod` + `contractInputsValues`
3. Create local transaction with computed safeTxHash
4. Set default gas parameters (0)
5. Fetch and assign current Safe nonce
6. Initialize with empty signatures array

This would allow importing Transaction Builder batches but they would need to be signed and managed through our workflow.

### Can We Export to Transaction Builder Format?
**Yes** ✅ - But with caveats:
- Would lose signature information
- Would lose safeTxHash
- Would lose nonce information
- Would lose gas parameters
- Useful only for creating transaction templates, not for multi-sig coordination

## Recommendations

### Option 1: Support Both Formats (Recommended) ✅
**Pros:**
- Maintain full CLI functionality with current format
- Add compatibility with Transaction Builder for broader ecosystem
- Users can import Transaction Builder batches as unsigned transactions
- Users can export to Transaction Builder for sharing with Safe web app

**Implementation:**
1. Keep current export format as-is for full fidelity
2. Add `--format` flag to export command:
   - `safe tx export <hash> --format=cli` (default, current format)
   - `safe tx export <hash> --format=tx-builder` (Safe Transaction Builder format)
3. Auto-detect format on import:
   - Check for `safeTxHash` field → use current import logic
   - Check for `version` and `transactions[]` → use Transaction Builder import logic
4. When importing Transaction Builder format:
   - Encode transaction data from `contractMethod`
   - Compute safeTxHash
   - Assign current nonce
   - Initialize empty signatures

**Commands:**
```bash
# Export in current format (full fidelity)
safe tx export <safeTxHash>

# Export in Transaction Builder format (for ecosystem compatibility)
safe tx export <safeTxHash> --format=tx-builder

# Import automatically detects format
safe tx import <json>
safe tx import transactions.json
```

### Option 2: Extend Transaction Builder Format
**Pros:**
- Single format for ecosystem
- Batch transaction support

**Cons:**
- Would need ecosystem buy-in
- Breaking change for existing tools
- Transaction Builder format is external (not under our control)

### Option 3: Keep Current Format Only
**Pros:**
- No changes needed
- Full functionality preserved

**Cons:**
- No compatibility with Transaction Builder
- No batch transaction support
- Isolated from broader Safe ecosystem

## Feature Gap: Batch Transactions

The Transaction Builder format's **biggest advantage** is native batch transaction support via the `transactions[]` array. Our current format only handles single transactions.

### Extending Current Format for Batches
We could add batch support to our format:

```json
{
  "version": "1.0",
  "safeTxHash": "0x123...",
  "safe": "eth:0xA77...",
  "chainId": "1",
  "safeAddress": "0xA77...",
  "batch": {
    "name": "Token Approvals Batch",
    "description": "Approve USDC and DAI"
  },
  "metadata": {
    "to": "0xMultiSendAddress",
    "value": "0",
    "data": "0x...",
    "operation": 1,
    "nonce": 5
  },
  "transactions": [
    {
      "to": "0xUSDC...",
      "value": "0",
      "data": "0x...",
      "operation": 0
    },
    {
      "to": "0xDAI...",
      "value": "0",
      "data": "0x...",
      "operation": 0
    }
  ],
  "signatures": [...],
  "createdBy": "0x742d...",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

This would:
- ✅ Preserve all required fields (safeTxHash, signatures, nonce)
- ✅ Add batch transaction support
- ✅ Maintain multi-sig coordination capability
- ⚠️ Still different from Transaction Builder format

## Conclusion

**Recommendation:** Implement **Option 1** - Support Both Formats

This provides:
1. ✅ Full backward compatibility with current format
2. ✅ Ecosystem compatibility with Transaction Builder
3. ✅ Ability to import Transaction Builder batches
4. ✅ Flexibility for users to choose format based on use case

**Implementation Priority:**
1. 🔴 **High**: Add Transaction Builder format import support
2. 🟡 **Medium**: Add Transaction Builder format export option
3. 🟢 **Low**: Extend current format to support native batches

**Use Cases:**
- **Current CLI format**: Multi-sig coordination, signature sharing, full workflow
- **Transaction Builder import**: Import batches from Safe web app, convert to CLI format
- **Transaction Builder export**: Share unsigned transactions with Safe web app users

## Next Steps

If you want to proceed with supporting the Transaction Builder format, I can:
1. Add format detection logic to the import command
2. Implement Transaction Builder JSON parser
3. Add encoding logic for `contractMethod` + `contractInputsValues`
4. Add `--format` flag to export command
5. Write tests for both formats
6. Update documentation

Would you like me to implement this feature?
