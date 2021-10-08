import { v4 } from 'uuid';
import stringify from 'safe-json-stringify';

import { ILoggerConfig, LogLevel } from './interfaces';
import { ServerLogger } from './server-logger';

export class Logger {
  declare readonly clientId: string;
  config: ILoggerConfig;
  private serverLogger!: ServerLogger;

  constructor (config: ILoggerConfig) {
    Object.defineProperty(this, 'clientId', {
      value: v4(),
      writable: false
    });

    if (this.logRank(config.logLevel) === -1) {
      if (config.logLevel) {
        this.warn(`Invalid log level: "${config.logLevel}". Default "info" will be used instead.`, null, true);
      }
      config.logLevel = 'info';
    }

    /* do this for (unofficial) backwards compat */
    if (!config.appName && (config as any).logTopic) {
      this.warn('`logTopic` has been renamed to `appName`. Please use `appName`', null, true);
      config.appName = (config as any).logTopic;
    }

    this.config = config;

    /* default to always set up server logging */
    if (this.config.initializeServerLogging !== false) {
      this.serverLogger = new ServerLogger(this);
    }
  }

  setAccessToken (token: string): void {
    this.config.accessToken = token;
  }

  log (message: string | Error, details?: any, skipServer = false): void {
    this.logMessage('log', message, details, skipServer);
  }

  debug (message: string | Error, details?: any, skipServer = false): void {
    this.logMessage('debug', message, details, skipServer);
  }

  info (message: string | Error, details?: any, skipServer = false): void {
    this.logMessage('info', message, details, skipServer);
  }

  warn (message: string | Error, details?: any, skipServer = false): void {
    this.logMessage('warn', message, details, skipServer);
  }

  error (message: string | Error, details?: any, skipServer = false): void {
    this.logMessage('error', message, details, skipServer);
  }

  private logMessage = (
    logLevel: LogLevel,
    message: string | Error,
    details: any,
    skipServer: boolean
  ): void => {
    if (message instanceof Error) {
      details = details || message;
      message = message.message;
    }

    const prefix = this.config?.appName ? `[${this.config.appName}] ` : '';
    message = `${prefix}${message}`;

    /* log locally */
    if (this.config?.stringify) {
      console[logLevel](message, stringify(details));
    } else {
      console[logLevel](message, details);
    }

    /* log to the server */
    if (
      !skipServer &&
      this.serverLogger &&
      this.logRank(logLevel) >= this.logRank(this.config.logLevel)
    ) {
      this.serverLogger.addLogToSend(logLevel, message, details);
    }
  };

  private logRank (level: LogLevel | undefined): number {
    switch (level) {
      case 'log':
        return 0;
      case 'debug':
        return 1;
      case 'info':
        return 2;
      case 'warn':
        return 3;
      case 'error':
        return 4;
      default:
        return -1; // for invalid logLevel
    }
  }
}
