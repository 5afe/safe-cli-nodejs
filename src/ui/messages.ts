import * as p from '@clack/prompts'

export function logSuccess(message: string): void {
  p.log.success(message)
}

export function logError(message: string): void {
  p.log.error(message)
}

export function logWarning(message: string): void {
  p.log.warning(message)
}

export function logInfo(message: string): void {
  p.log.info(message)
}

export function logStep(message: string): void {
  p.log.step(message)
}
