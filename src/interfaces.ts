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
   * be `secondaryAppName` is who this app's logger is loggin
   * "on behalf of" or the "parent app of".
   */
  secondaryAppName?: string;
  /**
   * This version is used when the app who is using the logger
   * (ie. the `logTopic` app) is being imported/used/consumed
   * by another app. Another way to think about this would
   * be `secondaryAppName` is who this app's logger is loggin
   * "on behalf of" or the "parent app of".
   *
   * NOTE: this is only used if `secondaryAppName` is provided
   */
  secondaryAppVersion?: string;
  /**
   * This should be the `clientId` of the parent app's logger.
   * It is used to correlate the parent app to this child app.
   *
   * NOTE: this is only used if `secondaryAppName` is provided
   */
  secondaryAppId?: string;
  /**
   * initialize server logging. defaults to `true`
   */
  initializeServerLogging?: boolean;
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
}

export type LogLevel = 'log' | 'debug' | 'info' | 'warn' | 'error';

export interface ITrace {
  topic: string;
  level: string;
  message: string;
}

export interface ILogMessage {
  clientTime: string;
  clientId: string;
  message: string;
  secondaryAppName?: string;
  secondaryAppVersion?: string;
  secondaryAppId?: string;
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

export interface ISendLogRequest {
  accessToken: string;
  app: {
    appId: string;
    appVersion: string;
  };
  traces: ITrace[];
}
