import { Logger } from './logger'

export function createLogger (): Logger {
  return new Logger();
}