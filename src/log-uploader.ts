import axios, { AxiosError, AxiosResponse } from 'axios';
import { backOff } from 'exponential-backoff';

import { IDeferred, ILogRequest, ISendLogRequest } from './interfaces';
import { getDeferred, deepClone } from './utils';

const SAVED_REQUESTS_KEY = 'gc_logger_requests';

const STATUS_CODES_TO_RETRY_IMMEDIATELY = [
  408,
  429,
  500,
  503,
  504
];

const STATUS_CODES_TO_RETRY_LATER = [
  401
];

export interface IQueueItem {
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

  return uploader;
};

export class LogUploader {
  sendQueue: IQueueItem[] = [];

  private pendingRequest?: IQueueItem;

  constructor (private url: string, private debugMode: boolean = false) { }

  postLogsToEndpoint (requestParams: ISendLogRequest): Promise<any> {
    const deferred = getDeferred();
    this.sendQueue.push({ requestParams, deferred });

    this.sendNextQueuedLogToServer();
    this.debug('adding requestParams to sendQueue', {
      requestParams,
      updatedSendQueue: this.sendQueue.map(i => i.requestParams),
      hasPendingRequest: !!this.pendingRequest
    });
    return deferred.promise;
  }

  async postLogsToEndpointInstantly (requestParams: ISendLogRequest, opts?: { saveOnFailure: boolean }): Promise<any> {
    this.debug('sending request instantly', { requestParams, sendQueue: this.sendQueue.map(i => i.requestParams) });

    if (!navigator.onLine) {
      return this.saveRequestForLater(requestParams);
    }

    try {
      await this.sendPostRequest(requestParams);
    } catch (e) {
      if (opts?.saveOnFailure) {
        this.saveRequestForLater(requestParams);
      }

      throw e;
    }
  }

  saveRequestForLater (request: ISendLogRequest): void {
    const savedRequests: ILogRequest[] = this.getSavedRequests() || [];

    const sanitizedRequest: ILogRequest = { ...request };
    delete (sanitizedRequest as any).accessToken;
    savedRequests.push(sanitizedRequest);

    window.localStorage.setItem(SAVED_REQUESTS_KEY, JSON.stringify(savedRequests));
  }

  getSavedRequests (): ILogRequest[] | undefined {
    const jsonStr = window.localStorage.getItem(SAVED_REQUESTS_KEY);
    if (jsonStr) {
      try {
        return JSON.parse(jsonStr) as ILogRequest[];
      } catch (e) {
        console.error('Failed to parse saved messages, ignoring', { savedMessagesStr: jsonStr });
      }
    }
  }

  sendEntireQueue (): Promise<any>[] {
    this.debug('sending all queued requests instantly to clear out sendQueue', {
      sendQueue: this.sendQueue.map(i => i.requestParams)
    });

    const promises: Promise<any>[] = [];
    let queueItem: IQueueItem | undefined;
    /* eslint-disable-next-line no-cond-assign */
    while (queueItem = this.sendQueue.shift()) {
      promises.push(
        this.postLogsToEndpointInstantly(queueItem.requestParams, { saveOnFailure: true })
      );
    }

    /* don't want this to be async because this is called from the window 'unload' event */
    return promises;
  }

  resetSendQueue () {
    this.debug('reseting send queue without sending currently queued data', { queueLength: this.sendQueue.length });
    this.sendQueue = [];
  }

  private async sendNextQueuedLogToServer (): Promise<void> {
    if (this.pendingRequest || this.sendQueue.length === 0) {
      this.debug('sendNextQueuedLogToServer() but not sending request', {
        hasPendingRequest: !!this.pendingRequest,
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
      this.pendingRequest = undefined;

      this.sendNextQueuedLogToServer();
    });

    this.pendingRequest = queueItem;
    this.debug('sending logs to server', { queueItem: queueItem.requestParams, sendQueue: this.sendQueue.map(i => i.requestParams) });

    // return backOff(this.sendPostRequest.bind(this, queueItem.requestParams), {
    return backOff(() => this.backoffFn(queueItem.requestParams), {
      retry: (err: AxiosError): boolean => {
        const status = err.response?.status;
        const code = err.code;

        // we get a "ERR_NETWORK" in the case of a network blip failure. if this happens, we will want to try again.
        // this is akin to not getting a response at all
        return navigator.onLine && ((status && STATUS_CODES_TO_RETRY_IMMEDIATELY.includes(status)) || code === "ERR_NETWORK");
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
      .catch(this.handleBackoffError.bind(this, queueItem));
  }

  private handleBackoffError (queueItem: IQueueItem, error: any) {
    // there are certain errors we know we don't want to try again, and certain errors/responses that *may* work in the future.
    const status = error.response?.status;

    const isRetriableStatus = status && STATUS_CODES_TO_RETRY_IMMEDIATELY.includes(status) || STATUS_CODES_TO_RETRY_LATER.includes(status);

    if (isRetriableStatus || error.code === "ERR_NETWORK") {
      this.debug('Failed to sends logs to the server, moving request to the end of the queue', { requestParams: queueItem.requestParams, error });
      this.saveRequestForLater(queueItem.requestParams);
    } else {
      this.debug('ERROR sending logs to server', { requestParams: queueItem.requestParams, error });
    }

    queueItem.deferred.reject({...error, id: "rejectionSpot1"});
  }

  private async backoffFn (requestParams: ISendLogRequest): Promise<AxiosResponse> {
    const accessToken = requestParams.accessToken;
    const response = await this.sendPostRequest(requestParams);

    // add any saved queue items to the queue using the access token
    const savedRequests = this.getSavedRequests();
    if (savedRequests) {
      window.localStorage.removeItem(SAVED_REQUESTS_KEY);
      savedRequests.map(request => {
        const reqWithToken: ISendLogRequest = { accessToken, ...request };

        // this adds it to the send queue, it doesn't send it immediately
        this.postLogsToEndpoint(reqWithToken);
      });
    }

    return response;
  }

  private sendPostRequest (requestParams: ISendLogRequest): Promise<AxiosResponse> {
    this.debug('issuing POST request', { requestParams });

    const requestBody: Partial<ISendLogRequest> = { ...requestParams };
    delete requestBody.accessToken;

    return axios({
      method: 'post',
      url: this.url,
      headers: {
        'authorization': `Bearer ${requestParams.accessToken}`,
        'content-type': 'application/json; charset=UTF-8'
      },
      data: requestBody
    });
  }

  private debug (message: string, details?: any): void {
    if (this.debugMode) {
      /* tslint:disable-next-line:no-console */
      console.log(`%c [DEBUG:log-uploader] ${message}`, 'color: #32a0a8', deepClone(details));
    }
  }
}
