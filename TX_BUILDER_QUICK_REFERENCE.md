# Transaction Builder Import - Quick Reference

## What Was Implemented

✅ **Import-only support** for Safe Transaction Builder JSON format  
✅ **Automatic format detection** - no user action needed  
✅ **Backward compatible** - existing CLI format still works  
✅ **User prompts for missing fields** (nonce, gas parameters)

## How It Works

### 1. Format Detection
The import command automatically detects which format your JSON is:
- **Transaction Builder format** → Has `version`, `meta`, `transactions[]`
- **CLI format** → Has `safeTxHash`, `metadata`, `signatures[]`

### 2. Transaction Builder Import Flow
1. Parse and validate JSON structure
2. Display batch metadata (name, description, count)
3. Check if Safe exists locally
4. For each transaction:
   - Show details (to, value, data)
   - Encode contract methods if needed
   - Prompt for nonce with recommended value
   - Create transaction in local store
5. Provide next steps for signing

### 3. Missing Fields Handled
- **safeTxHash** → Computed by creating transaction
- **nonce** → User prompted (shows current Safe nonce)
- **signatures** → Empty array (unsigned)
- **gas parameters** → Defaults to 0
- **operation** → Defaults to Call (0)

## Usage Examples

### Import from File
```bash
safe tx import examples/example-approve.json
```

### Import from Clipboard
```bash
safe tx import '{"version":"1.0","chainId":"1",...}'
```

### Import Batch
```bash
safe tx import examples/example-batch.json
# Prompts for nonce for each transaction
# Creates 3 separate transactions
```

## Expected Output

```
ℹ Transaction Builder format detected

Transaction Builder Import

  Batch Name: USDC Approval
  Description: Approve USDC spending
  Chain ID:    1
  Safe:        0xA77DE01...
  Transactions: 1

Transaction 1/1
  To:    0xA0b86991...
  Value: 0 wei
  Data:  0x095ea7b3...

⚠ Transaction needs configuration:
  • Nonce (current Safe nonce: 5)
  • Gas parameters

? Transaction nonce: › 5

✓ Transaction created
✓ Transaction 1 imported
  Safe TX Hash: 0xabc123...

✓ Successfully imported 1 transaction(s)

Next steps:
  safe tx sign 0xabc123...
  safe tx status 0xabc123...
```

## Limitations

1. **Batch transactions imported separately**
   - Each gets its own safeTxHash and nonce
   - MultiSend support planned for future

2. **Manual nonce configuration required**
   - Recommended value shown
   - Prevents nonce conflicts

3. **No export to Transaction Builder format**
   - Import only (by design)
   - Export would lose signature data

## Format Comparison

### Transaction Builder Format
```json
{
  "version": "1.0",
  "chainId": "1",
  "createdAt": 1761326849944,
  "meta": {
    "name": "Batch Name",
    "createdFromSafeAddress": "0xA77..."
  },
  "transactions": [
    {
      "to": "0xA0b...",
      "value": "0",
      "contractMethod": {...},
      "contractInputsValues": {...}
    }
  ]
}
```

### CLI Format (Still Supported)
```json
{
  "safeTxHash": "0xabc...",
  "chainId": "1",
  "safeAddress": "0xA77...",
  "metadata": {
    "to": "0xA0b...",
    "value": "0",
    "data": "0x095ea7b3...",
    "nonce": 5
  },
  "signatures": [...]
}
```

## Testing

### Run Parser Tests
```bash
npm test -- src/services/__tests__/tx-builder-parser.test.ts
# 19/19 tests passing ✅
```

### Test with Examples
```bash
npm run build
./dist/index.js tx import examples/example-approve.json
./dist/index.js tx import examples/example-batch.json
```

## Getting Transaction Builder JSON

1. Go to https://app.safe.global
2. Navigate to Transaction Builder
3. Create transaction(s)
4. Export as JSON
5. Import into CLI:
   ```bash
   safe tx import downloaded-file.json
   ```

## Troubleshooting

### "Invalid Transaction Builder format"
- Check JSON structure has required fields
- Must have `version`, `meta.createdFromSafeAddress`, `transactions[]`
- Each transaction must have `to` address

### "Safe not found locally"
- Safe hasn't been opened in CLI yet
- Can still import but will need to configure manually
- Run `safe account open` first

### "Transaction needs configuration"
- Normal - nonce is required
- Current Safe nonce is shown as recommendation
- Choose same nonce or higher

### "Multiple transactions detected"
- Batch will be imported as separate transactions
- Each needs its own nonce
- Use sequential nonces (e.g., 5, 6, 7)

## Related Documentation

- **Full Analysis:** `TRANSACTION_BUILDER_FORMAT_ANALYSIS.md`
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md`
- **Examples:** `examples/README.md`
- **Main Docs:** `README.md` (search "Transaction Builder")

## Key Files

- **Parser:** `src/services/tx-builder-parser.ts`
- **Import Logic:** `src/commands/tx/import.ts`
- **Tests:** `src/services/__tests__/tx-builder-parser.test.ts`
- **Examples:** `examples/example-*.json`
