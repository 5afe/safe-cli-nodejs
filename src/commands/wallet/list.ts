import { renderScreen } from '../../ui/render.js'
import { WalletListScreen } from '../../ui/screens/index.js'

/**
 * Lists all imported wallets with their details.
 *
 * Migration: Phase 3 - Controller Pattern
 * - Old: Imperative console.log (41 lines of procedural code)
 * - New: Declarative Ink rendering (3 lines)
 *
 * Benefits:
 * - Separation of concerns (data fetching → state hooks, rendering → components)
 * - Reusable components (List, KeyValue)
 * - Testable UI (can test WalletListScreen independently)
 * - Consistent styling (theme colors, spacing)
 */
export async function listWallets() {
  await renderScreen(WalletListScreen, {})
}
