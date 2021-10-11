import request from 'superagent';
import { backOff } from 'exponential-backoff';

import { IDeferred, ISendLogRequest } from './interfaces';
import { getDeferred, deepClone } from './utils';

interface IQueueItem {
  deferred: IDeferred;
  requestParams: ISendLogRequest;
}

const logUploaderMap = new Map<string, LogUploader>();

export const getOrCreateLogUploader = (url: string, debugMode = false): LogUploader => {
  let uploader = logUploaderMap.get(url);

  /* if we don't have an uploader for this url, create one */
  if (!uploader) {
    uploader = new LogUploader(url, debugMode);
    logUploaderMap.set(url, uploader);
  }

  return uploader
};

export class LogUploader {
  private hasPendingRequest = false;
  private sendQueue: IQueueItem[] = [];

  constructor (private url: string, private debugMode: boolean = false) { }

  async postLogsToEndpoint (requestParams: ISendLogRequest): Promise<any> {
    const deferred = getDeferred();
    this.sendQueue.push({ requestParams, deferred });
    this.sendNextQueuedLogToServer();
    this.debug('adding requestParams to sendQueue', {
      requestParams,
      updatedSendQueue: this.sendQueue.map(i => i.requestParams),
      hasPendingRequest: this.hasPendingRequest
    });
    return deferred.promise;
  }

  async postLogsToEndpointInstantly (requestParams: ISendLogRequest): Promise<any> {
    this.debug('sending request instantly', { requestParams, sendQueue: this.sendQueue.map(i => i.requestParams) });

    return this.sendPostRequest(requestParams);
  }

  sendEntireQueue (): void {
    this.debug('sending all queued requests instantly to clear out sendQueue', {
      sendQueue: this.sendQueue.map(i => i.requestParams)
    });

    let queueItem: IQueueItem | undefined;
    /* eslint-disable-next-line no-cond-assign */
    while (queueItem = this.sendQueue.shift()) {
      this.postLogsToEndpoint(queueItem.requestParams);
    }
  }

  private async sendNextQueuedLogToServer (): Promise<void> {
    if (this.hasPendingRequest || this.sendQueue.length === 0) {
      this.debug('sendNextQueuedLogToServer() but not sending request', {
        hasPendingRequest: this.hasPendingRequest,
        sendQueueLength: this.sendQueue.length
      });
      return;
    }

    /* don't remove the item from the queue until it is not longer being sent (this includes retries) */
    const queueItem = this.sendQueue.shift() as IQueueItem; // `undefined` check happens above

    queueItem.deferred.promise.finally(() => {
      this.debug('queue item completed. removing from queue and resetting send queue', {
        queueItemRequestParams: queueItem.requestParams, updatedSendQueue: this.sendQueue.map(i => i.requestParams)
      });

      /* reset state and send the next item in the queue */
      this.hasPendingRequest = false;
      this.sendNextQueuedLogToServer();
    });

    this.hasPendingRequest = true;
    this.debug('sending logs to server', { queueItem: queueItem.requestParams, sendQueue: this.sendQueue.map(i => i.requestParams) });

    // return backOff(this.sendPostRequest.bind(this, queueItem.requestParams), {
    return backOff(() => this.sendPostRequest(queueItem.requestParams), {
      retry: (err: any): boolean => {
        return err && err.status === 429;
      },
      numOfAttempts: 10,
      startingDelay: 0,
      delayFirstAttempt: false,
      maxDelay: 15000
    })
      .then((response: any) => {
        this.debug('successfully sent logs to server', { requestParams: queueItem.requestParams, response });
        queueItem.deferred.resolve(response);
      })
      .catch((error: any) => {
        this.debug('ERROR sending logs to server', { requestParams: queueItem.requestParams, error });
        return queueItem.deferred.reject(error);
      });
  }

  private sendPostRequest (requestParams: ISendLogRequest): Promise<any> {
    this.debug('issuing POST request', { requestParams });
    return request.post(this.url)
      .set('Authorization', `Bearer ${requestParams.accessToken}`)
      .type('application/json; charset=UTF-8')
      .send(requestParams);
  }

  private debug (message: string, details?: any): void {
    if (this.debugMode) {
      /* tslint:disable-next-line:no-console */
      console.log(`%c [DEBUG:log-uploader] ${message}`, 'color: #32a0a8', deepClone(details));
    }
  }
}
