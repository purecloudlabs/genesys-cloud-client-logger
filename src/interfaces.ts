export interface ILoggerConfig {
  /** JWT access token to use in HTTP request */
  accessToken: string;
  /**
   * url to send the logs to (note this needs to be the full URL)
   * an HTTP `POST` request will be issued to this url
   */
  url: string;
  /** version of app using the logging library */
  appVersion: string;
  /** all local logs will be prefixed by this. */
  logTopic: string;
  /** initialize server logging. defaults to `true` */
  initializeServerLogging?: boolean;
  /** logs at this level or high get sent to the server. defaults to 'info' */
  logLevel?: LogLevel;
  /** time to debounce logs uploads to the server */
  uploadDebounceTime?: number;
  /** debug logger events */
  debugMode?: boolean;
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
