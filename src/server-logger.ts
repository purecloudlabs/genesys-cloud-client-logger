import request from 'superagent';
import stringify from 'safe-json-stringify';
import cloneDeep from 'lodash.clonedeep';

import { Logger } from './logger';
import { IDetail, ILoggerConfig, LogLevel, ITrace, ILogBufferItem, ILogMessage } from './interfaces';
import { calculateLogMessageSize } from './utils';

const MAX_LOG_SIZE = 14500;
const DEFAULT_UPLOAD_DEBOUNCE = 4000;

export class ServerLogger {
  private config: ILoggerConfig;
  private isInitialized: boolean = false;
  private logger: Logger;
  private logBuffer: Array<ILogBufferItem> = [];
  private pendingHttpRequest: boolean = false;
  private debounceLogUploadTime: number;
  private debounceTimer: any = null;


  constructor (config: ILoggerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    /* if we have all the needed config options, set this up */
    if (
      !config.url ||
      !config.accessToken ||
      !config.appVersion
    ) {
      const errMessage = 'Lacking necessary config options to set up server logging. ' +
        'Not sending logs to server for this logger instance';
      this.logger.error(errMessage, { ...config }, true);
      throw new Error(errMessage);
    }

    this.isInitialized = true;
    this.debounceLogUploadTime = config.uploadDebounceTime || DEFAULT_UPLOAD_DEBOUNCE;

    window.addEventListener('unload', this.sendAllLogsInstantly.bind(this));
  }

  public addLogToSend (logLevel: LogLevel, message: string | Error, details: IDetail | IDetail[]): void {
    if (!this.isInitialized) {
      return;
    }

    if (message instanceof Error) {
      details = details || message;
      message = message.message;
    }

    let logMessage = this.convertToLogMessage(message, details);
    let trace = this.convertToTrace(logLevel, logMessage);
    let traceMessageSize = calculateLogMessageSize(trace);

    /* if the individual message exceeds the max allowed size, truncate it */
    if (traceMessageSize > MAX_LOG_SIZE) {
      const newTrace = this.truncateLog(logLevel, logMessage);
      this.logger.warn('log message too large to send to server. truncating log details and/or message', {
        originalTrace: (trace as any),
        truncatedTrace: (newTrace as any)
      }, true);

      /* newTrace will be `null` if the truncated trace was still too big */
      if (newTrace === null) {
        this.logger.error('truncated message is still too large to send to server. not sending message', {
          originalTrace: (trace as any)
        }, true);
        return;
      }

      /* set the trace to our new trunctated trace item */
      traceMessageSize = calculateLogMessageSize(newTrace);
      trace = newTrace;
    }

    /* use the last item in the buffer if it exists, otherwise start with a blank buffer item */
    let bufferItem: ILogBufferItem;
    if (this.logBuffer.length) {
      bufferItem = this.logBuffer[this.logBuffer.length - 1];
    } else {
      bufferItem = {
        size: 0,
        traces: []
      };
    }

    /* if pushing our trace onto the buffer item will be too large, we need a new buffer item */
    const exceedsMaxLogSize = bufferItem.size + traceMessageSize > MAX_LOG_SIZE;
    if (exceedsMaxLogSize) {
      // console.log('%c `exceedsMaxLogSize` was `true`', 'color: #32a852', { logBuffer: [...this.logBuffer], bufferItem, incomingTrace: trace, incomingTraceSize: traceMessageSize }); // TODO: delete me
      this.logBuffer.push({
        size: traceMessageSize,
        traces: [trace]
      });
      /* since we pushed a new item, we need to send immediately */
      // console.log('%c calling sendLogsToServer(true)', 'color: #32a852', { logBuffer: [...this.logBuffer] }); // TODO: delete me
      this.sendLogsToServer(true);
      return;
    }

    /* else just push onto the buffer */
    bufferItem.size += traceMessageSize;
    bufferItem.traces.push(trace);

    /* if we don't have anything in the buffer, that means we have to push this new item */
    if (!this.logBuffer.length) {
      // console.log('%c `this.logBuffer` was empty. pushing new buffer item', 'color: #32a852', { logBuffer: [...this.logBuffer], bufferItem }); // TODO: delete me
      this.logBuffer.push(bufferItem);
    }

    /* this will setup the debounce timer (if it is not already running) */
    // console.log('%c calling sendLogsToServer()', 'color: #32a852', { logBuffer: [...this.logBuffer] }); // TODO: delete me
    this.sendLogsToServer();
  }

  private async sendLogsToServer (immediate: boolean = false): Promise<any> {
    if (!this.logBuffer.length) {
      /* clear timer */
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      // console.log('%c buffer empty, not sending http request', 'color: #32a852'); // TODO: delete me
      return;
    }

    /* if we have a pending request, then don't send another */
    if (this.pendingHttpRequest) {
      /* clear timer */
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      // console.log('%c http request pending, not sending another http request', 'color: #32a852'); // TODO: delete me
      return;
    }

    /* if we aren't sending immediately, then setup the timer */
    if (!immediate) {
      // console.log('%c `immediate` is false. setting up debounce timer', 'color: #32a852'); // TODO: delete me
      if (!this.debounceTimer) {
        // console.log('%c setting `debounceTimer`', 'color: #32a852'); // TODO: delete me
        this.debounceTimer = setTimeout(() => this.sendLogsToServer(true), this.debounceLogUploadTime);
      }
      return;
    }

    /* clear timer */
    clearTimeout(this.debounceTimer);
    this.debounceTimer = null;

    /* grab the first item to send */
    const bufferItem = this.logBuffer[0];
    let removeFromBuffer = true;

    try {
      this.pendingHttpRequest = true;
      await this.postLogsToEndpoint(this.config.url, bufferItem.traces.reverse());
    } catch (err) {
      this.logger.error('Error sending logs to server', err, true);
      /* we will retry these */
      if (err.status == 429) {
        // console.log('%c http 429 received, not removing item from buffer', 'color: #32a852'); // TODO: delete me
        removeFromBuffer = false;
      }
      /* all other errors we are not going to retry and just drop the logs on the floor */
    } finally {
      this.pendingHttpRequest = false;
      if (removeFromBuffer) {
        this.logBuffer.shift();
      }

      /* this will setup the debounce timer again */
      this.sendLogsToServer(
        /* set to immediate if last request removed from the buffer, and we have more than one item in the buffer */
        removeFromBuffer && this.logBuffer.length > 1
      );
    }
  }

  private sendAllLogsInstantly () {
    /* if `sendAll`, we need to send all requests in the buffer without awaiting */
    return this.logBuffer.forEach((item, index) => {
      /* if we already have a pending request, it means index `0` already has been sent */
      if (this.pendingHttpRequest && index === 0) {
        return;
      }
      this.postLogsToEndpoint(this.config.url, item.traces.reverse());
    });
  }

  private truncateLog (logLevel: LogLevel, log: ILogMessage): ITrace | null {
    let trace: ITrace;
    const logCopy = cloneDeep(log);
    const truncText = '[[TRUNCATED]]';

    /* first truncate the details */
    logCopy.details = truncText;
    trace = this.convertToTrace(logLevel, logCopy);

    if (calculateLogMessageSize(trace) <= MAX_LOG_SIZE) {
      this.logger.warn('message too large to send to server. truncated log details', {
        originalLog: (log as any),
        truncatedLog: (logCopy as any)
      }, true);
      return trace;
    }

    /* second truncate the message */
    logCopy.message = `${logCopy.message.substr(0, 150)}... ${truncText}`;
    trace = this.convertToTrace(logLevel, logCopy);

    if (calculateLogMessageSize(trace) <= MAX_LOG_SIZE) {
      this.logger.warn('message too large to send to server. truncated log details & log message', {
        originalLog: (log as any),
        truncatedLog: (logCopy as any)
      }, true);
      return trace;
    }

    /* if the truncated trace is _still_ too large, return null because we aren't going to send this to the server */
    return null;
  }

  private convertToLogMessage (message: string, details: IDetail | IDetail[]): ILogMessage {
    return {
      clientTime: new Date().toISOString(),
      clientId: this.logger.clientId,
      message,
      details
    };
  }

  private convertToTrace (level: LogLevel, log: ILogMessage): ITrace {
    return {
      topic: this.config.logTopic,
      level: level.toUpperCase(),
      message: stringify(log)
    };
  }

  private postLogsToEndpoint (url: string, traces: ITrace[]): Promise<any> {
    // console.log('%c sending logs to server', 'color: #32a852', traces); // TODO: delete me

    return request.post(url)
      .set('Authorization', `Bearer ${this.config.accessToken}`)
      .type('application/json; charset=UTF-8')
      .send({
        accessToken: this.config.accessToken,
        app: {
          appId: this.config.logTopic,
          appVersion: this.config.appVersion
        },
        traces
      }).then(() => {
        // console.log('%c successfully sent logs to server', 'color: #32a852', { tracesSent: traces, currentBuffer: [...this.logBuffer] }); // TODO: delete me
      })
  }
}
