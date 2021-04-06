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
  logLevel?: ConfigLogLevel;
  /** time to debounce logs uploads to the server */
  uploadDebounceTime?: number;
}

export type LogLevel = 'log' | 'debug' | 'info' | 'warn' | 'error';

export type ConfigLogLevel = LogLevel | 'none';

export interface ITrace {
  topic: string;
  level: string;
  message: string;
}

export interface ILogMessage {
  clientTime: string;
  clientId: string;
  message: string;
  details?: IDetail | IDetail[];
}

export interface ILogBufferItem {
  size: number;
  traces: ITrace[];
}

export interface IDetailObject {
  [k: string]: IDetailObject | string | number | boolean | undefined | null;
  [k: number]: IDetailObject | string | number | boolean | undefined | null;
};

export type IDetail =
  | Error
  | string
  | boolean
  | number
  | IDetailObject
  | undefined
  | null
  | Event;

// TODO: delete this
const log = (message: string, details: IDetail | IDetail[]) => console.log(message, details);

// INTERFACES (can be fussy)
interface MyInterface { }
const myInterface: MyInterface = {};
log('interface', { ...myInterface }); // Works
log('interface', { myInterface }); // TS error
log('interface', myInterface); // TS error

// TYPES (work better)
type MyType = {};
const myType: MyType = {};
log('type', myType); // Works
log('type', { myType }); // Works
log('type', { ...myType }); // Works

// POJO
const pojo = {};
log('pojo', pojo); // Works
log('pojo', { pojo }); // Works
log('pojo', { ...pojo }); // Works

// ARRAY
const arr: any[] = [];
log('array', [...arr]); // Works
log('array', [arr]); // TS error
log('array', ...arr); // TS error
log('array', arr); // Works