import { v4 } from 'uuid';
import stringify from 'safe-json-stringify';

import { ILoggerConfig, LogLevel, ILogger } from './interfaces';
import { ServerLogger } from './server-logger';

export class Logger implements ILogger {
  declare readonly clientId: string;
  config: ILoggerConfig;
  private serverLogger!: ServerLogger;
  private secondaryLogger: ILogger;

  constructor (config: ILoggerConfig) {
    Object.defineProperty(this, 'clientId', {
      value: v4(),
      writable: false
    });

    this.config = { ...config };
    this.secondaryLogger = this.config.logger || console;
    delete this.config.logger;

    if (this.logRank(this.config.logLevel) === -1) {
      if (config.logLevel) {
        this.warn(`Invalid log level: "${config.logLevel}". Default "info" will be used instead.`, null, true);
      }
      this.config.logLevel = 'info';
    }

    /* do this for (unofficial) backwards compat */
    if (!config.appName && (config as any).logTopic) {
      this.warn('`logTopic` has been renamed to `appName`. Please use `appName`', null, true);
      this.config.appName = (config as any).logTopic;
    }

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

    const prefix = this.config.appName ? `[${this.config.appName}] ` : '';
    message = `${prefix}${message}`;

    try {
      /* log to secondary logger (default is console) */
      this.secondaryLogger[logLevel](message,
        this.config.stringify ? stringify(details) : details
      );
    } catch (error) {
      /* don't let custom logger errors stop our logger */
      console.error('Error logging using custom logger passed into `genesys-cloud-client-logger`', { error, secondaryLogger: this.secondaryLogger, message, details, skipServer });
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
