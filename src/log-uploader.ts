import request from 'superagent';
import { backOff } from 'exponential-backoff';

import { IDeferred, ISendLogRequest } from './interfaces';
import cloneDeep from 'lodash.clonedeep';

const logUploaderMap = new Map<string, LogUploader>();

function getDeferred (): IDeferred {
  let res: any;
  let rej: any;

  const promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });

  return { promise, resolve: res, reject: rej };
}

export const getOrCreateLogUploader = (url: string, debugMode: boolean = false): LogUploader => {
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
  private sendQueue: Array<{
    deferred: IDeferred;
    requestParams: ISendLogRequest;
  }> = [];

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

  private async sendNextQueuedLogToServer (): Promise<void> {
    if (this.hasPendingRequest || this.sendQueue.length === 0) {
      this.debug('sendNextQueuedLogToServer() but not sending request', {
        hasPendingRequest: this.hasPendingRequest,
        sendQueueLength: this.sendQueue.length
      })
      return;
    }

    /* don't remove the item from the queue until it is not longer being sent (this includes retries) */
    const queueItem = this.sendQueue[0];

    queueItem.deferred.promise.finally(() => {
      /* remove the queued item that completed */
      this.sendQueue.shift();
      this.debug('queue item completed. removing from queue and resetting backoff', { queueItem, updatedSendQueue: this.sendQueue.map(i => i.requestParams) });

      /* reset state and send the next item in the queue */
      this.hasPendingRequest = false;
      this.sendNextQueuedLogToServer();
    });

    this.hasPendingRequest = true;
    this.debug('sending logs to server', { queueItem: queueItem.requestParams, queue: this.sendQueue.map(i => i.requestParams) });

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
      .then((response) => {
        this.debug('successfully sent logs to server', { requestParams: queueItem.requestParams, response });
        this.hasPendingRequest = false;
        queueItem.deferred.resolve(response);
      })
      .catch((error) => {
        this.hasPendingRequest = false;
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
      console.log(`%c [DEBUG:log-uploader] ${message}`, 'color: #32a0a8', cloneDeep(details));
    }
  }
}
