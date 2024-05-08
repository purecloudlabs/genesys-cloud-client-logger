export interface ILoggerConfig {
  /**
   * JWT access token to use in HTTP request
   */
  accessToken: string;
  /**
   * url to send the logs to (note this needs to be the full URL)
   * an HTTP `POST` request will be issued to this url
   */
  url: string;
  /**
   * the version of app using the logging library.
   */
  appVersion: string;
  /**
   * All local logs will be prefixed by this.
   * This is the app name of the app using the logger
   * Could also be thought of as the `appName`.
   */
  appName: string;
  /**
   * This name is used when the app who is using the logger
   * (ie. the `logTopic` app) is being imported/used/consumed
   * by another app. Another way to think about this would
   * be `originAppName` is who this app's logger is logging
   * "on behalf of" or the "parent app of".
   */
  originAppName?: string;
  /**
   * This version is used when the app who is using the logger
   * (ie. the `logTopic` app) is being imported/used/consumed
   * by another app. Another way to think about this would
   * be `originAppName` is who this app's logger is logging
   * "on behalf of" or the "parent app of".
   *
   * NOTE: this is only used if `originAppName` is provided
   */
  originAppVersion?: string;
  /**
   * This should be the `clientId` of the parent app's logger.
   * It is used to correlate the parent app to this child app.
   *
   * NOTE: this is only used if `originAppName` is provided
   */
  originAppId?: string;
  /**
   * initialize server logging. defaults to `true`
   */
  initializeServerLogging?: boolean;
  /**
   * This only matters if you are using server logging. This will create a
   * new log uploader instead of trying to reuse an existing one.
   */
  useUniqueLogUploader?: boolean;
  /**
   * If set to true, logs will not start sending to the server
   * until `logger.startServerLogging()` is called.
   *
   * This will have no effect if `initializeServerLogging = false`.
   */
  startServerLoggingPaused?: boolean;
  /**
   * logs at this level or high get sent to the server. defaults to 'info'
   */
  logLevel?: LogLevel;
  /**
   * time to debounce logs uploads to the server. defaults to 4000
   */
  uploadDebounceTime?: number;
  /**
   * debug logger events. defaults to `false`
   */
  debugMode?: boolean;
  /**
   * stringify log details when writing to console. defaults to `false`
   */
  stringify?: boolean;
  /**
   * Optional extra logger to use instead of the console.
   * Default: console
   * NOTE: unless `initializeServerLogging = false`, logs
   * will also attempt to upload to the server, even if an
   * additional logger is passed in. This logger will be used
   * in place of the console, but still alongside this logger.
   */
  logger?: ILogger;
  /**
   * These are essentially interceptors for log messages. They will allow
   * you to change the level, message, details or log options for any given
   * message. There are three options for handling messages:
   *
   * next() - sends message as it was received to the next formatter
   * next(level, message, details, options) - sends message to the next formatter with the specified params
   * not calling next() at all - don't log the message
   */
  formatters?: LogFormatterFn[];
  /**
   * **** FOR GENESYS INTERNAL USE ****
   * These headers are to be provided by internal consuming apps that use a
   * built-in OAuth client for telemetry purposes. Headers that are
   * provided by non-Genesys apps will be ignored.
   */
  customHeaders?: ICustomHeaders;
}

export interface ILogger {
  /**
   * Log a message to the location specified by the logger.
   * The logger can decide if it wishes to implement `details`
   * or `skipServer`.
   *
   * @param message message or error to log
   * @param details any additional details to log
   * @param opts
   */
  log (message: string | Error, details?: any, opts?: ILogMessageOptions): void;

  /**
   * Log a message to the location specified by the logger.
   * The logger can decide if it wishes to implement `details`
   * or `opts`.
   *
   * @param message message or error to log
   * @param details any additional details to log
   * @param opts
   */
  debug (message: string | Error, details?: any, opts?: ILogMessageOptions): void;

  /**
   * Log a message to the location specified by the logger.
   * The logger can decide if it wishes to implement `details`
   * or `opts`.
   *
   * @param message message or error to log
   * @param details any additional details to log
   * @param opts
   */
  info (message: string | Error, details?: any, opts?: ILogMessageOptions): void;

  /**
   * Log a message to the location specified by the logger.
   * The logger can decide if it wishes to implement `details`
   * or `opts`.
   *
   * @param message message or error to log
   * @param details any additional details to log
   * @param opts
   */
  warn (message: string | Error, details?: any, opts?: ILogMessageOptions): void;

  /**
   * Log a message to the location specified by the logger.
   * The logger can decide if it wishes to implement `details`
   * or `opts`.
   *
   * @param message message or error to log
   * @param details any additional details to log
   * @param opts
   */
  error (message: string | Error, details?: any, opts?: ILogMessageOptions): void;
}

export type LogLevel = keyof ILogger;

export interface LoggerEvents {
  onError: any;
  onStart: void;
  onStop: StopReason;
}

export type StopReason = 401 | 404 | '401' | '404' | 'force';
export interface ITrace {
  topic: string;
  level: string;
  message: string;
}

export interface ILogMessage {
  clientTime: string;
  clientId: string;
  message: string;
  originAppName?: string;
  originAppVersion?: string;
  originAppId?: string;
  details?: any
}

export interface ILogBufferItem {
  size: number;
  traces: ITrace[];
}

export interface IDeferred<T = any> {
  promise: Promise<T>;
  reject: (rejectedValue: any) => void;
  resolve: (resolvedValue: T) => void;
}

export interface ISendLogRequest extends ILogRequest {
  accessToken: string;
}

export interface ILogRequest {
  app: {
    appId: string;
    appVersion: string;
  };
  traces: ITrace[];
}

export interface ILogMessageOptions {
  skipDefaultFormatter?: boolean,
  skipServer?: boolean,
  skipSecondaryLogger?: boolean,
}

export interface ICustomHeaders {
  [header: string]: string;
}

export type NextFn = NextFnWithoutParams & NextFnWithParams;
export type NextFnWithoutParams = () => void;
export type NextFnWithParams = (level: LogLevel, message: string | Error, details?: any, options?: ILogMessageOptions) => void;
export type LogFormatterFn = (
  level: LogLevel,
  message: string | Error,
  details: any,
  options: ILogMessageOptions,
  next: NextFn
) => void;