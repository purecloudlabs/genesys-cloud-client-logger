import { EventEmitter } from 'events';
import { v4 } from 'uuid';
import stringify from 'safe-json-stringify';

import { ILoggerConfig, LogLevel, ILogger, LogFormatterFn, StopReason, LoggerEvents } from './interfaces';
import { ServerLogger } from './server-logger';
import { ILogMessageOptions, NextFn } from '.';
import StrictEventEmitter from 'strict-event-emitter-types/types/src';

export class Logger extends (EventEmitter as { new(): StrictEventEmitter<EventEmitter, LoggerEvents> }) implements ILogger {
  declare readonly clientId: string;
  config: ILoggerConfig;
  private serverLogger!: ServerLogger;
  private secondaryLogger: ILogger;
  private stopReason?: StopReason;

  /* eslint-disable @typescript-eslint/naming-convention */
  static VERSION = '__GENESYS_CLOUD_CLIENT_LOGGER_VERSION__';

  get VERSION () {
    return Logger.VERSION;
  }
  /* eslint-enable @typescript-eslint/naming-convention */

  constructor (config: ILoggerConfig) {
    super();
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

    if (this.config.startServerLoggingPaused) {
      this.stopServerLogging();
    }
  }

  setAccessToken (token: string): void {
    this.config.accessToken = token;

    /* if we stopped because of a 401, we will try to start again */
    if (this.stopReason == 401) {
      this.startServerLogging();
    }
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

  /**
   * Start sending logs to the server. Only applies if
   * the logger instance was configured with server logging.
   *
   * @returns void
   */
  startServerLogging (): void {
    this.stopReason = undefined;

    if (!this.serverLogger) {
      return this.warn(
        '`startServerLogging` called but the logger instance is not configured to ' +
        'send logs to the server. Ignoring call to start sending logs to server.',
        undefined,
        { skipServer: true }
      );
    }

    this.emit('onStart');
  }

  /**
   * Stop sending logs to the server. Note; this will clear
   * any items that are currently in the buffer. If you wish
   * to send any currently pending log items, use
   * `sendAllLogsInstantly()` before stopping the server loggin.
   *
   * @param reason optional; default `'force'`
   * @returns void
   */
  stopServerLogging (reason: StopReason = 'force'): void {
    /* we never want to override a force stop */
    if (this.stopReason === 'force' && reason !== 'force') {
      return;
    }
    this.stopReason = reason;
    this.emit('onStop', reason);
  }

  /**
   * Force send all pending log items to the server.
   *
   * @returns an array of HTTP request promises
   */
  sendAllLogsInstantly (): Promise<any>[] {
    return this.serverLogger?.sendAllLogsInstantly() || [];
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
        const params = [message];
        if (typeof details !== 'undefined') {
          params.push(this.config.stringify ? stringify(details) : details);
        }

        /* eslint-disable-next-line prefer-spread */
        this.secondaryLogger[logLevel].apply(this.secondaryLogger, params as any);
      } catch (error) {
        /* don't let custom logger errors stop our logger */
        console.error('Error logging using custom logger passed into `genesys-cloud-client-logger`', { error, secondaryLogger: this.secondaryLogger, message, details, messageOptions });
      }
    }

    /* log to the server */
    if (
      !messageOptions.skipServer &&
      !this.stopReason &&
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
