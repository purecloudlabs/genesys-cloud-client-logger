export interface IServerOpts {
  accessToken: string,  // genesyscloud auth token
  environment: string,  // genesyscloud api environment
  appVersion: string,   // version of app using the logging library
  logTopic: string,     // all local logs will be prefixed by this
  logLevel: LogLevels,  // logs at this level or high get sent to the server
  uploadDebounceTime?: number,   // time to debounce logs uploads to the server
}

export interface IDeferred {
  promise: Promise<any>;
  reject: any;
  resolve: any;
}

export interface ISendLogState {
  deferred: IDeferred;
  request: ISendLogRequest;
}

export interface ISendLogRequest {
  accessToken: string;
  app: {
    appId: string;
    appVersion: string;
  };
  traces: ITrace[];
}

export interface ITrace {
  topic: string;
  level: string;
  message: string;
}

export interface RequestApiOptions {
  accessToken?: string;
  method?: string;
  data?: any;
  apiVersion?: string;
  environment: string;
  contentType?: string;
}

export enum LogLevels {
  log = 'log',
  debug = 'debug',
  info = 'info',
  warn = 'warn',
  error = 'error'
}
