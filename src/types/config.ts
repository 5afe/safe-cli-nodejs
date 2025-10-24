import { z } from 'zod'

export const ChainConfigSchema = z.object({
  name: z.string(),
  chainId: z.string(),
  rpcUrl: z.string().url(),
  explorer: z.string().url().optional(),
  currency: z.string(),
  contractNetworks: z
    .object({
      safeSingletonAddress: z.string().optional(),
      safeProxyFactoryAddress: z.string().optional(),
      multiSendAddress: z.string().optional(),
      multiSendCallOnlyAddress: z.string().optional(),
      fallbackHandlerAddress: z.string().optional(),
      signMessageLibAddress: z.string().optional(),
      createCallAddress: z.string().optional(),
    })
    .optional(),
})

export const DefaultsConfigSchema = z.object({
  safeVersion: z.string().default('1.4.1'),
  signingMethod: z.enum(['ETH_SIGN_TYPED_DATA_V4', 'ETH_SIGN_TYPED_DATA_V3', 'ETH_SIGN']).default('ETH_SIGN_TYPED_DATA_V4'),
  gasStrategy: z.enum(['fast', 'medium', 'slow']).default('medium'),
})

export const PreferencesConfigSchema = z.object({
  autoUpdate: z.boolean().default(true),
})

export const ConfigSchema = z.object({
  version: z.string().default('0.1.0'),
  chains: z.record(z.string(), ChainConfigSchema).default({}),
  defaults: DefaultsConfigSchema.default({}),
  preferences: PreferencesConfigSchema.default({}),
})

export type ChainConfig = z.infer<typeof ChainConfigSchema>
export type DefaultsConfig = z.infer<typeof DefaultsConfigSchema>
export type PreferencesConfig = z.infer<typeof PreferencesConfigSchema>
export type Config = z.infer<typeof ConfigSchema>
