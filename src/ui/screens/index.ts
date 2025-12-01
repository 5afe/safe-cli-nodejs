/**
 * Screen component exports for Safe CLI UI.
 * Full-screen views for different commands are exported from this barrel file.
 *
 * Screens will be added during Phase 4 migration:
 * - AccountListScreen
 * - AccountInfoScreen
 * - ConfigShowScreen
 * - TransactionListScreen
 * - etc.
 */

// Phase 2 - Proof of concept
export { WelcomeScreen } from './WelcomeScreen.js'
export type { WelcomeScreenProps } from './WelcomeScreen.js'

// Phase 3 - First full migration
export { WalletListScreen } from './WalletListScreen.js'
export type { WalletListScreenProps } from './WalletListScreen.js'

export { WalletImportSuccessScreen } from './WalletImportSuccessScreen.js'
export type { WalletImportSuccessScreenProps } from './WalletImportSuccessScreen.js'

export { WalletUseSuccessScreen } from './WalletUseSuccessScreen.js'
export type { WalletUseSuccessScreenProps } from './WalletUseSuccessScreen.js'

export { WalletRemoveSuccessScreen } from './WalletRemoveSuccessScreen.js'
export type { WalletRemoveSuccessScreenProps } from './WalletRemoveSuccessScreen.js'

// Phase 4 - Tier 1 migrations
export { AccountListScreen } from './AccountListScreen.js'
export type { AccountListScreenProps } from './AccountListScreen.js'

export { ConfigShowScreen } from './ConfigShowScreen.js'
export type { ConfigShowScreenProps } from './ConfigShowScreen.js'

// Phase 4 - Tier 2 migrations
export { AccountInfoScreen } from './AccountInfoScreen.js'
export type { AccountInfoScreenProps } from './AccountInfoScreen.js'

export { TransactionListScreen } from './TransactionListScreen.js'
export type { TransactionListScreenProps } from './TransactionListScreen.js'

// Phase 4 - Tier 3 migrations (complex flows)
export { AccountCreateSuccessScreen } from './AccountCreateSuccessScreen.js'
export type { AccountCreateSuccessScreenProps } from './AccountCreateSuccessScreen.js'

export { AccountDeploySuccessScreen } from './AccountDeploySuccessScreen.js'
export type { AccountDeploySuccessScreenProps } from './AccountDeploySuccessScreen.js'

export { SafeOpenSuccessScreen } from './SafeOpenSuccessScreen.js'
export type { SafeOpenSuccessScreenProps } from './SafeOpenSuccessScreen.js'

export { OwnerAddSuccessScreen } from './OwnerAddSuccessScreen.js'
export type { OwnerAddSuccessScreenProps } from './OwnerAddSuccessScreen.js'

export { ConfigInitSuccessScreen } from './ConfigInitSuccessScreen.js'
export type { ConfigInitSuccessScreenProps } from './ConfigInitSuccessScreen.js'

export { OwnerRemoveSuccessScreen } from './OwnerRemoveSuccessScreen.js'
export type { OwnerRemoveSuccessScreenProps } from './OwnerRemoveSuccessScreen.js'

export { ThresholdChangeSuccessScreen } from './ThresholdChangeSuccessScreen.js'
export type { ThresholdChangeSuccessScreenProps } from './ThresholdChangeSuccessScreen.js'

export { TransactionCreateSuccessScreen } from './TransactionCreateSuccessScreen.js'
export type { TransactionCreateSuccessScreenProps } from './TransactionCreateSuccessScreen.js'

export { TransactionSignSuccessScreen } from './TransactionSignSuccessScreen.js'
export type { TransactionSignSuccessScreenProps } from './TransactionSignSuccessScreen.js'

export { TransactionExecuteSuccessScreen } from './TransactionExecuteSuccessScreen.js'
export type { TransactionExecuteSuccessScreenProps } from './TransactionExecuteSuccessScreen.js'

export { TransactionStatusScreen } from './TransactionStatusScreen.js'
export type { TransactionStatusScreenProps } from './TransactionStatusScreen.js'

export { TransactionExportSuccessScreen } from './TransactionExportSuccessScreen.js'
export type { TransactionExportSuccessScreenProps } from './TransactionExportSuccessScreen.js'

export { ChainListScreen } from './ChainListScreen.js'
export type { ChainListScreenProps } from './ChainListScreen.js'

export { ChainAddSuccessScreen } from './ChainAddSuccessScreen.js'
export type { ChainAddSuccessScreenProps } from './ChainAddSuccessScreen.js'

export { ChainRemoveSuccessScreen } from './ChainRemoveSuccessScreen.js'
export type { ChainRemoveSuccessScreenProps } from './ChainRemoveSuccessScreen.js'

export { ChainEditSuccessScreen } from './ChainEditSuccessScreen.js'
export type { ChainEditSuccessScreenProps } from './ChainEditSuccessScreen.js'

export { TransactionPullSuccessScreen } from './TransactionPullSuccessScreen.js'
export type {
  TransactionPullSuccessScreenProps,
  TransactionPullResult,
} from './TransactionPullSuccessScreen.js'

export { TransactionPushSuccessScreen } from './TransactionPushSuccessScreen.js'
export type { TransactionPushSuccessScreenProps } from './TransactionPushSuccessScreen.js'

export { TransactionSyncSuccessScreen } from './TransactionSyncSuccessScreen.js'
export type { TransactionSyncSuccessScreenProps } from './TransactionSyncSuccessScreen.js'

export { TransactionImportBuilderSuccessScreen } from './TransactionImportBuilderSuccessScreen.js'
export type { TransactionImportBuilderSuccessScreenProps } from './TransactionImportBuilderSuccessScreen.js'

export { TransactionImportSuccessScreen } from './TransactionImportSuccessScreen.js'
export type { TransactionImportSuccessScreenProps } from './TransactionImportSuccessScreen.js'

export { AISuggestionScreen } from './AISuggestionScreen.js'
export type { AISuggestionScreenProps } from './AISuggestionScreen.js'

// TODO: Phase 4 - Add remaining screen components as commands are migrated
