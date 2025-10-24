import pc from 'picocolors'
import * as p from '@clack/prompts'

export function logSuccess(message: string): void {
  p.log.success(pc.green(message))
}

export function logError(message: string): void {
  p.log.error(pc.red(message))
}

export function logWarning(message: string): void {
  p.log.warning(pc.yellow(message))
}

export function logInfo(message: string): void {
  p.log.info(pc.blue(message))
}

export function logStep(message: string): void {
  p.log.step(pc.cyan(message))
}
