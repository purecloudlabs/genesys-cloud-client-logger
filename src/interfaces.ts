import { IBackoffOpts } from 'backoff-web';

export interface IServerOpts {
  accessToken: string,  // genesyscloud auth token
  environment: string,  // genesyscloud api environment
  appVersion: string,   // version of app using the logging library
  logTopic: string,     // all local logs will be prefixed by this
  logLevel: LogLevels,  // logs at this level or high get sent to the server
  backoffOpts?: IBackoffOpts,
  uploadDebounceTime?: number,   // time to debounce logs uploads to the server
}

export interface ITrace {
  topic: string;
  level: string;
  message: string;
}

export interface RequestApiOptions {
  method?: string;
  data?: any;
  version?: string;
  contentType?: string;
  auth?: string | boolean;
}

export enum LogLevels {
  log = 'log',
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error'
}
