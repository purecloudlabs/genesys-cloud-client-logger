import { v4 } from 'uuid';
import stringify from 'safe-json-stringify';

import { ILoggerConfig, LogLevel, ILogger, LogFormatterFn } from './interfaces';
import { ServerLogger } from './server-logger';
import { ILogMessageOptions, NextFn } from '.';

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
        this.warn(`Invalid log level: "${config.logLevel}". Default "info" will be used instead.`, null, { skipServer: true });
      }
      this.config.logLevel = 'info';
    }

    /* do this for (unofficial) backwards compat */
    if (!config.appName && (config as any).logTopic) {
      this.warn('`logTopic` has been renamed to `appName`. Please use `appName`', null, { skipServer: true });
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

  log (message: string | Error, details?: any, opts?: ILogMessageOptions): void {
    this.formatMessage('log', message, details, opts);
  }

  debug (message: string | Error, details?: any, opts?: ILogMessageOptions): void {
    this.formatMessage('debug', message, details, opts);
  }

  info (message: string | Error, details?: any, opts?: ILogMessageOptions): void {
    this.formatMessage('info', message, details, opts);
  }

  warn (message: string | Error, details?: any, opts?: ILogMessageOptions): void {
    this.formatMessage('warn', message, details, opts);
  }

  error (message: string | Error, details?: any, opts?: ILogMessageOptions): void {
    this.formatMessage('error', message, details, opts);
  }

  private formatMessage (level: LogLevel, message: string | Error, details?: any, opts?: ILogMessageOptions): void {
    let formatters: LogFormatterFn[] = [this.defaultFormatter.bind(this)];

    if (this.config.formatters) {
      formatters = [...this.config.formatters, this.defaultFormatter.bind(this)];
    }

    this.callNextFormatter(formatters, level, message, details, opts);
  }

  private callNextFormatter (formatters: LogFormatterFn[], level: LogLevel, message: string | Error, details?: any, opts: ILogMessageOptions = {}) {
    const [formatter, ...remainingFormatters] = formatters;

    if (!formatter) {
      return this.logMessage(level, message as string, details, opts);
    }

    const next = (newLevel: LogLevel, newMessage: string | Error, newDetails?: any, newOpts?: ILogMessageOptions) => {
      // next was called with params
      if (typeof newLevel !== 'undefined') {
        this.callNextFormatter(remainingFormatters, newLevel, newMessage, newDetails, newOpts);
      } else {
        this.callNextFormatter(remainingFormatters, level, message, details, opts);
      }
    }

    formatter(level, message, details, opts, next as NextFn);
  }

  private defaultFormatter = (
    logLevel: LogLevel,
    message: string | Error,
    details: any | undefined,
    messageOptions: ILogMessageOptions,
    next: NextFn
  ): void => {
    if (messageOptions.skipDefaultFormatter) {
      return next();
    }

    if (message instanceof Error) {
      details = details || message;
      message = message.message;
    }

    const prefix = this.config.appName ? `[${this.config.appName}] ` : '';
    message = `${prefix}${message}`;

    next(logLevel, message, details, messageOptions);
  };

  private logMessage = (
    logLevel: LogLevel,
    message: string,
    details: any | undefined,
    messageOptions: ILogMessageOptions
  ): void => {
    if (!messageOptions.skipSecondaryLogger) {
      try {
        /* log to secondary logger (default is console) */
        this.secondaryLogger[logLevel](message,
          this.config.stringify ? stringify(details) : details
        );
      } catch (error) {
        /* don't let custom logger errors stop our logger */
        console.error('Error logging using custom logger passed into `genesys-cloud-client-logger`', { error, secondaryLogger: this.secondaryLogger, message, details, messageOptions });
      }
    }

    /* log to the server */
    if (
      !messageOptions.skipServer &&
      this.serverLogger &&
      this.logRank(logLevel) >= this.logRank(this.config.logLevel)
    ) {
      this.serverLogger.addLogToSend(logLevel, message, details);
    }
  }

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
