import { LogLevels, ITrace, RequestApiOptions, IServerOpts, ISendLogRequest } from './interfaces';
import { v4 } from 'uuid';
import stringify from 'safe-json-stringify';
import { calculateLogMessageSize, calculateLogBufferSize } from './utils';
import uploader from './log-uploader';

const LOG_LEVELS: string[] = Object.keys(LogLevels);
const PAYLOAD_TOO_LARGE = 413;
const MAX_LOG_SIZE = 14500;

const ENVIRONMENTS = [
  'mypurecloud.com',
  'mypurecloud.com.au',
  'mypurecloud.jp',
  'mypurecloud.de',
  'mypurecloud.ie',
  'usw2.pure.cloud',
  'cac1.pure.cloud',
  'euw2.pure.cloud',
  'apne2.pure.cloud'
];

export class Logger {
  declare private clientId: string;
  private logBufferSize: number = 0;
  private logBuffer: ITrace[] = [];
  private logRequestPending = false;
  private failedLogAttempts = 0;
  private sendLogTimer: any;
  private opts!: IServerOpts;
  private isInitialized = false;

  constructor () {
    Object.defineProperty(this, 'clientId', {
      value: v4(),
      writable: false
    });
  }

  initializeServerLogging (opts: IServerOpts): void {
    if (this.isInitialized) {
      throw new Error('Server logging already initialized');
    }

    this.opts = opts;

    const logLevel = opts.logLevel;
    if (LOG_LEVELS.indexOf(logLevel) === -1) {
      if (logLevel) {
        this.warn(`Invalid log level: '${logLevel}'. Default '${LogLevels.info}' will be used instead.`, null, true);
      }
      this.opts.logLevel = LogLevels.info;
    }

    if (!opts.environment) {
      this.warn('Possible environments: ', ENVIRONMENTS, true);
      throw new Error('An environment must be provided to do server logging.');
    }

    if (!ENVIRONMENTS.includes(opts.environment)) {
      this.warn('Unknown environment', null, true);
    }

    if (!opts.accessToken) {
      throw new Error('Must provide an accessToken for server uploads');
    }

    uploader.setEnvironment(opts.environment);
    this.isInitialized = true;
  }

  log (message: string | Error, details?: any, skipServer?: boolean): void {
    this.processLog(LogLevels.log, message, details, skipServer);
  }
  debug (message: string | Error, details?: any, skipServer?: boolean): void {
    this.processLog(LogLevels.debug, message, details, skipServer);
  }
  info (message: string | Error, details?: any, skipServer?: boolean): void {
    this.processLog(LogLevels.info, message, details, skipServer);
  }
  warn (message: string | Error, details?: any, skipServer?: boolean): void {
    this.processLog(LogLevels.warn, message, details, skipServer);
  }
  error (message: string | Error, details?: any, skipServer?: boolean): void {
    this.processLog(LogLevels.error, message, details, skipServer);
  }

  private processLog (level: LogLevels, message: string | Error, details?: any, skipServer?: boolean): void {
    level = (level || LogLevels.log).toString().toLowerCase() as LogLevels;

    if (message instanceof Error) {
      details = details || message;
      message = message.message;
    }

    // immediately log it locally
    const prefix = this.opts?.logTopic ? `[${this.opts.logTopic}] ` : '';
    console[level](`${prefix}${message}`, details);

    if (
      skipServer ||
      LOG_LEVELS.indexOf(level) < LOG_LEVELS.indexOf(this.opts.logLevel.toString())
    ) {
      return;
    }

    const log = {
      clientTime: new Date().toISOString(),
      clientId: this.clientId,
      message,
      details
    };
    const logContainer: ITrace = {
      topic: this.opts.logTopic,
      level: level.toUpperCase(),
      message: stringify(log)
    };

    const logMessageSize = calculateLogMessageSize(logContainer);
    const exceedsMaxLogSize = this.logBufferSize + logMessageSize > MAX_LOG_SIZE;

    if (exceedsMaxLogSize) {
      this.info('Log size limit reached, sending immediately', null, true);
      this.notifyLogs(true);
    }

    this.logBuffer.push(logContainer);
    this.logBufferSize += logMessageSize;

    if (!exceedsMaxLogSize) {
      this.notifyLogs(); // debounced call
    }
  }

  private notifyLogs (sendImmediately?: boolean): void {
    if (this.sendLogTimer) {
      clearTimeout(this.sendLogTimer);
    }

    if (sendImmediately) {
      if (!this.logRequestPending) {
        return this.tryToSendLogs();
      } else {
        this.info('Tried to send logs immeidately but a send request is already pending. Waiting for pending request to finish', null, true);
      }
    }
    this.sendLogTimer = setTimeout(this.tryToSendLogs.bind(this), this.opts.uploadDebounceTime);
  }

  private tryToSendLogs () {
    if (!this.logRequestPending) {
      this.queueLogsUpload();
    }
  }

  private async queueLogsUpload (): Promise<void> {
    const traces = this.getLogPayload();
    this.logBufferSize = calculateLogBufferSize(this.logBuffer);

    if (traces.length === 0) {
      return Promise.resolve();
    }

    const request: ISendLogRequest = {
      accessToken: this.opts.accessToken,
      app: {
        appId: this.opts.logTopic,
        appVersion: this.opts.appVersion
      },
      traces
    };

    try {
      this.logRequestPending = true;
      await uploader.sendLogs(request);
      this.log('Log data sent successfully', null, true);
      this.reset();
      if (this.logBuffer.length) {
        this.log('Data still left in log buffer, preparing to send again', null, true);
        this.notifyLogs();
      }
    } catch (error) {
      this.failedLogAttempts++;

      if (error.status === PAYLOAD_TOO_LARGE) {
        this.error(error, null, true);

        // If sending a single log is too big, then scrap it and reset backoff
        if (traces.length === 1) {
          this.reset();
          this.notifyLogs();
          return;
        }
      } else {
        this.error('Failed to post logs to server', traces, true);
      }

      // Put traces back into buffer in their original order
      const reverseTraces = traces.reverse(); // Reverse traces so they will be unshifted into their original order
      reverseTraces.forEach((log: ITrace) => this.logBuffer.unshift(log));
      this.logBufferSize = calculateLogBufferSize(this.logBuffer);
    }
  }
  private getLogPayload (): ITrace[] {
    const maxPayloadSize = MAX_LOG_SIZE / (this.failedLogAttempts + 1);

    let currentSize = 0;
    const traces: ITrace[] = [];

    for (const trace of this.logBuffer) {
      const size = calculateLogMessageSize(trace);

      if (currentSize + size > maxPayloadSize) {
        break;
      }

      currentSize += size;
      traces.push(trace);
    }

    if (traces.length === 0) {
      const firstTrace = this.logBuffer.splice(0, 1);
      this.warn('Message too large to be logged to server', firstTrace, true);
      this.failedLogAttempts = 0;

      return this.getLogPayload();
    }

    this.logBuffer.splice(0, traces.length);

    return traces;
  }

  private reset () {
    this.logRequestPending = false;
    this.failedLogAttempts = 0;
  }
}