export const APP_NAME = 'safe-cli'
export const CONFIG_DIR_NAME = '.safe-cli'
export const DEFAULT_SAFE_VERSION = '1.4.1'

export const SIGNING_METHODS = {
  ETH_SIGN_TYPED_DATA_V4: 'ETH_SIGN_TYPED_DATA_V4',
  ETH_SIGN_TYPED_DATA_V3: 'ETH_SIGN_TYPED_DATA_V3',
  ETH_SIGN: 'ETH_SIGN',
} as const

export const GAS_STRATEGIES = {
  FAST: 'fast',
  MEDIUM: 'medium',
  SLOW: 'slow',
} as const
