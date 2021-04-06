import { v4 } from 'uuid';

import { ILoggerConfig, LogLevel, IDetail, ConfigLogLevel } from './interfaces';
import { ServerLogger } from './server-logger';

export class Logger {
  declare readonly clientId: string;
  private config: ILoggerConfig;
  private serverLogger!: ServerLogger;
  private serverLoggingOn: boolean = false;

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

    this.config = config;

    /* default to always set up server logging */
    if (this.config.initializeServerLogging !== false) {
      this.serverLogger = new ServerLogger(config, this);
      this.serverLoggingOn = true;
    }
  }

  log (message: string | Error, details: IDetail | IDetail[], skipServer: boolean = false): void {
    this.logMessage('log', message, details, skipServer);
  }

  debug (message: string | Error, details: IDetail | IDetail[], skipServer: boolean = false): void {
    this.logMessage('debug', message, details, skipServer);
  }

  info (message: string | Error, details: IDetail | IDetail[], skipServer: boolean = false): void {
    this.logMessage('info', message, details, skipServer);
  }

  warn (message: string | Error, details: IDetail | IDetail[], skipServer: boolean = false): void {
    this.logMessage('warn', message, details, skipServer);
  }

  error (message: string | Error, details: IDetail | IDetail[], skipServer: boolean = false): void {
    this.logMessage('error', message, details, skipServer);
  }

  private logMessage = (
    logLevel: LogLevel,
    message: string | Error,
    details: IDetail | IDetail[],
    skipServer: boolean
  ): void => {
    if (message instanceof Error) {
      details = details || message;
      message = message.message;
    }

    const prefix = this.config?.logTopic ? `[${this.config.logTopic}] ` : '';
    message = `${prefix}${message}`;

    /* log locally */
    console[logLevel](message, details);

    /* log to the server */
    if (
      !skipServer &&
      this.serverLoggingOn &&
      this.logRank(logLevel) >= this.logRank(this.config.logLevel)
    ) {
      this.serverLogger.addLogToSend(logLevel, message, details);
    }
  };

  private logRank (level: ConfigLogLevel | undefined): number {
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
      case 'none':
        return 5;
      default:
        return -1; // for invalid logLevel
    }
  }
}
