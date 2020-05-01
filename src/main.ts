import { Logger } from './logger'
import { IServerOpts } from './interfaces';

export { Logger, IServerOpts };

export function createLogger (): Logger {
  return new Logger();
}