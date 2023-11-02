import nock from 'nock';
import flushPromises from "flush-promises";
import { getOrCreateLogUploader, IQueueItem, LogUploader } from '../src/log-uploader';
import { ILogRequest, ISendLogRequest } from '../src/interfaces';
import { getDeferred } from '../src/utils';
import axios, { AxiosError } from 'axios';
import { add, sub } from 'date-fns'
import AxiosMockAdapter from 'axios-mock-adapter';

describe('getOrCreateLogUploader()', () => {
  it('should return unique log-uploaders for different urls', () => {
    const uploader1 = getOrCreateLogUploader('http://inindca.com');
    const uploader2 = getOrCreateLogUploader('http://inindca.com/trace');

    expect(uploader1).not.toBe(uploader2);
  });

  it('should return the same log-uploader for the same url', () => {
    const uploader1 = getOrCreateLogUploader('http://inindca.com');
    const uploader2 = getOrCreateLogUploader('http://inindca.com');

    expect(uploader1).toBe(uploader2);
  });

  it('should return a unique uploader for the same url', () => {
    const uploader1 = getOrCreateLogUploader('http://inindca.com');
    const uploader2 = getOrCreateLogUploader('http://inindca.com', false, true);

    expect(uploader1).not.toBe(uploader2);
  });
});

describe('LogUploader', () => {
  const url = 'http://doesnotexist.com/logs';
  let logUploader: LogUploader;

  beforeEach(() => {
    logUploader = new LogUploader(url, false);
  });

  describe('constructor()', () => {
    it('should create and set passed in values', () => {
      const url = 'http://inindca.com';
      const uploader = new LogUploader(url, true);

      expect(uploader['url']).toBe(url);
      expect(uploader['debugMode']).toBe(true);
    });

    it('should create and set defaults', () => {
      const url = 'http://inindca.com';
      const uploader = new LogUploader(url);

      expect(uploader['url']).toBe(url);
      expect(uploader['debugMode']).toBe(false);
    });
  });

  describe('postLogsToEndpoint()', () => {
    it('should push to sendQueue, trigger to send to server, and return promise', async () => {
      const debugSpy = jest.spyOn(logUploader, 'debug' as any);
      const sendNextQueuedLogToServerSpy = jest.spyOn(logUploader, 'sendNextQueuedLogToServer' as any).mockImplementation();
      const requestParams: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };

      const promise = logUploader.postLogsToEndpoint(requestParams);

      expect(logUploader['sendQueue'].length).toBe(1);
      expect(logUploader['sendQueue'][0]).toEqual({ requestParams, deferred: expect.any(Object) });
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalled();
      expect(debugSpy).toHaveBeenCalledWith('adding requestParams to sendQueue', {
        requestParams,
        updatedSendQueue: [requestParams],
        hasPendingRequest: false
      });

      logUploader['sendQueue'][0].deferred.resolve(true);
      expect(await promise).toBe(true);
    });
  });

  describe('postLogsToEndpointInstantly()', () => {
    it('should call through to send logs', async () => {
      const debugSpy = jest.spyOn(logUploader, 'debug' as any);
      const sendPostRequestSpy = jest.spyOn(logUploader, 'sendPostRequest' as any).mockResolvedValue(true);
      /* this is needed for full code coverage */
      const requestParamsInSendQueue: ISendLogRequest = {} as any;
      logUploader['sendQueue'].push({ requestParams: requestParamsInSendQueue } as any);

      const requestParams: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };

      await logUploader.postLogsToEndpointInstantly(requestParams);

      expect(debugSpy).toHaveBeenCalledWith('sending request instantly', {
        requestParams,
        sendQueue: [requestParamsInSendQueue]
      });
      expect(sendPostRequestSpy).toHaveBeenCalledWith(requestParams);
    });

    it('should save logs on failure', async () => {
      const error = { name: 'myError '};
      jest.spyOn(logUploader as any, 'sendPostRequest').mockRejectedValue(error);
      const saveSpy = logUploader.saveRequestForLater = jest.fn();

      const request: ISendLogRequest = {
        accessToken: '123easy',
        app: {} as any,
        traces: [ { level: 'info', message: 'my message', topic: 'testing' } ]
      };

      await expect(logUploader.postLogsToEndpointInstantly(request, { saveOnFailure: true })).rejects.toEqual(error);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should not save logs on failure', async () => {
      const error = { name: 'myError '};
      jest.spyOn(logUploader as any, 'sendPostRequest').mockRejectedValue(error);
      const saveSpy = logUploader.saveRequestForLater = jest.fn();

      const request: ISendLogRequest = {
        accessToken: '123easy',
        app: {} as any,
        traces: [ { level: 'info', message: 'my message', topic: 'testing' } ]
      };

      await expect(logUploader.postLogsToEndpointInstantly(request)).rejects.toEqual(error);
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('should save logs without attempting to send them if offline', async () => {
      const sendSpy = jest.spyOn(logUploader as any, 'sendPostRequest');
      const saveSpy = logUploader.saveRequestForLater = jest.fn();
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(false);

      const request: ISendLogRequest = {
        accessToken: '123easy',
        app: {} as any,
        traces: [ { level: 'info', message: 'my message', topic: 'testing' } ]
      };

      await logUploader.postLogsToEndpointInstantly(request);
      expect(saveSpy).toHaveBeenCalled();
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  describe('sendEntireQueue()', () => {
    it('should send the entire sendQueue', async () => {
      const debugSpy = jest.spyOn(logUploader, 'debug' as any);
      const postLogsToEndpointInstantlySpy = jest.spyOn(logUploader, 'postLogsToEndpointInstantly' as any).mockResolvedValue(true);
      const requestParams1: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };

      const requestParams2: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this a second time' }]
      };

      logUploader.sendQueue = [
        { requestParams: requestParams1 } as any,
        { requestParams: requestParams2 } as any,
      ];

      const promises = logUploader.sendEntireQueue();

      expect(debugSpy).toHaveBeenCalledWith('sending all queued requests instantly to clear out sendQueue', {
        sendQueue: [requestParams1, requestParams2]
      });

      /* should fire these without having to await anything */
      expect(postLogsToEndpointInstantlySpy).toHaveBeenNthCalledWith(1, requestParams1, { saveOnFailure: true });
      expect(postLogsToEndpointInstantlySpy).toHaveBeenNthCalledWith(2, requestParams2, { saveOnFailure: true });

      await Promise.all(promises);
    });
  });

  describe('sendPostRequest()', () => {
    it('should make http POST request with auth token', async () => {
      const axiosMock = new AxiosMockAdapter(axios);
      axiosMock.onPost(url).reply(200);
      
      const requestParams: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };

      await logUploader['sendPostRequest'](requestParams);

      expect(axiosMock.history.post.length).toBe(1);
      const req = axiosMock.history.post[0]!;
      expect((req.headers!.get as any)('authorization')).toEqual('Bearer securely');
    });
  });

  describe('resetSendQueue()', () => {
    it('should clear sendQueue', () => {
      logUploader['sendQueue'] = [{data: 'to send'} as any];

      logUploader.resetSendQueue();

      expect(logUploader['sendQueue'].length).toBe(0);
    });
  });

  describe('handleBackoffError()', () => {
    it('should handle non axios errors', async () => {
      const queueItem: IQueueItem = {
        deferred: {
          reject: jest.fn()
        } as any,
        requestParams: {
          accessToken: '123easy',
          app: { appId: 'myapp' } as any,
          traces: []
        }
      };

      const spy = logUploader['saveRequestForLater'] = jest.fn();

      logUploader['handleBackoffError'](queueItem, new Error());

      expect(spy).not.toHaveBeenCalled();
    });

    it('should save for later', async () => {
      const queueItem: IQueueItem = {
        deferred: {
          reject: jest.fn()
        } as any,
        requestParams: {
          accessToken: '123easy',
          app: { appId: 'myapp' } as any,
          traces: []
        }
      };

      const error: AxiosError = {
        request: { } as unknown,
        response: {
          status: 429
        } as unknown
      } as unknown as AxiosError;

      const spy = logUploader['saveRequestForLater'] = jest.fn();

      logUploader['handleBackoffError'](queueItem, error);

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getSavedRequests()', () => {
    let getSpy: jest.SpyInstance;

    beforeEach(() => {
      getSpy = jest.spyOn(Storage.prototype, 'getItem');
    });

    afterEach(() => {
      getSpy.mockRestore();
    });

    it('should return undefined if there\'s no saved messages', () => {
      getSpy.mockReturnValue(undefined);
      expect(logUploader['getSavedRequests']()).toBeUndefined();
    });

    it('should return saved messages', () => {
      const logs: ILogRequest[] = [
        {
          app: {} as any,
          traces: [ { level: 'info', message: 'my message', topic: 'testing' } ]
        }
      ];

      getSpy.mockReturnValue(JSON.stringify(logs));
      expect(logUploader['getSavedRequests']()).toEqual(logs);
    });

    it('should return undefined if saved messages are malformed', () => {
      getSpy.mockReturnValue('{sldkj: whoops\'}');
      expect(logUploader['getSavedRequests']()).toBeUndefined();
    });
  });

  describe('saveRequestForLater()', () => {
    let getSpy: jest.SpyInstance;
    let setSpy: jest.SpyInstance;
   
    beforeEach(() => {
      getSpy = jest.spyOn(Storage.prototype, 'getItem');
      setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation();
    });

    afterEach(() => {
      getSpy.mockRestore();
      setSpy.mockRestore();
    });

    it('should work for first request', () => {
      const request: ILogRequest =
        {
          app: {} as any,
          traces: [ { level: 'info', message: 'my message', topic: 'testing' } ]
        };

      const sendRequest: ISendLogRequest = { accessToken: 'mytoken', ...request };

      logUploader.getSavedRequests = jest.fn().mockReturnValue(undefined);

      logUploader['saveRequestForLater'](sendRequest);

      expect(setSpy).toHaveBeenCalledWith('gc_logger_requests', JSON.stringify([request]));
    });

    it('should work for subsequent requests', () => {
      const existingRequest: ILogRequest = {
        app: {} as any,
        traces: [ { level: 'info', message: 'my message old', topic: 'testing1' } ]
      };
      
      const request: ILogRequest = {
        app: {} as any,
        traces: [ { level: 'info', message: 'my message', topic: 'testing' } ]
      };

      const sendRequest: ISendLogRequest = { accessToken: 'mytoken', ...request };

      logUploader.getSavedRequests = jest.fn().mockReturnValue([existingRequest]);

      logUploader['saveRequestForLater'](sendRequest);

      expect(setSpy).toHaveBeenCalledWith('gc_logger_requests', JSON.stringify([existingRequest, request]));
    });
  });

  describe('sendNextQueuedLogToServer()', () => {
    let sendNextQueuedLogToServerFn: typeof LogUploader.prototype['sendNextQueuedLogToServer'];
    let sendNextQueuedLogToServerSpy: jest.SpyInstance;
    let sendPostRequestSpy: jest.SpyInstance;
    let debugSpy: jest.SpyInstance;

    beforeEach(() => {
      sendNextQueuedLogToServerSpy = jest.spyOn(logUploader, 'sendNextQueuedLogToServer' as any);
      sendPostRequestSpy = jest.spyOn(logUploader, 'sendPostRequest' as any).mockResolvedValue({});
      debugSpy = jest.spyOn(logUploader, 'debug' as any);

      sendNextQueuedLogToServerFn = logUploader['sendNextQueuedLogToServer'].bind(logUploader);

      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('should do nothing if request is pending', async () => {
      logUploader['pendingRequest'] = {} as any;

      await sendNextQueuedLogToServerFn();

      expect(debugSpy).toHaveBeenCalledWith('sendNextQueuedLogToServer() but not sending request', expect.any(Object));

      logUploader['pendingRequest'] = undefined;
    });

    it('should do nothing if sendQueue is empty', async () => {
      logUploader['sendQueue'] = [];

      await sendNextQueuedLogToServerFn();

      expect(debugSpy).toHaveBeenCalledWith('sendNextQueuedLogToServer() but not sending request', expect.any(Object));
    });

    it('should send logs and reset the sendQueue on success', async () => {
      /* load the queue */
      const requestParams: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };
      const fakeResponse = { status: 200 };

      sendPostRequestSpy.mockResolvedValue(fakeResponse);

      const promise = logUploader.postLogsToEndpoint(requestParams);

      expect(debugSpy).toHaveBeenCalledWith('sending logs to server', {
        queueItem: requestParams,
        sendQueue: []
      });
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(1);
      expect(logUploader['pendingRequest']).toEqual(expect.objectContaining({ requestParams: requestParams }));
      expect(logUploader['sendQueue'].length).toBe(0);

      jest.advanceTimersToNextTimer();

      expect(await promise).toBe(fakeResponse);
      expect(debugSpy).toHaveBeenCalledWith('successfully sent logs to server', { requestParams, response: expect.any(Object) });
      expect(logUploader['pendingRequest']).toBeUndefined();

      expect(debugSpy).toHaveBeenCalledWith('queue item completed. removing from queue and resetting send queue', {
        queueItemRequestParams: requestParams, updatedSendQueue: []
      });
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(2); // called again after initial request finished
      expect(sendPostRequestSpy).toHaveBeenCalledTimes(1); // only called once
    });

    it('should send logs after several failed (but retriable) attempts', async () => {
      /* load the queue */
      const requestParams: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };
      const fakeErrorResponse = {
        response: {
          status: 429,
          headers: {}
        }
      };
      const fakeSuccessfulResponse = {
        response: {
          status: 200,
          headers: {}
        }
      };

      sendPostRequestSpy
        .mockRejectedValueOnce(fakeErrorResponse) // fail once
        .mockResolvedValue(fakeSuccessfulResponse);

      const promise = logUploader.postLogsToEndpoint(requestParams);

      expect(debugSpy).toHaveBeenCalledWith('sending logs to server', {
        queueItem: requestParams,
        sendQueue: []
      });
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(1);
      expect(logUploader['pendingRequest']).toEqual(expect.objectContaining({ requestParams: requestParams }));
      expect(logUploader['sendQueue'].length).toBe(0);

      /* await 1st promise failure */
      jest.advanceTimersToNextTimer();
      await flushPromises();

      /* await 2nd promise success */
      jest.advanceTimersToNextTimer();
      expect(await promise).toBe(fakeSuccessfulResponse);

      expect(debugSpy).toHaveBeenCalledWith('successfully sent logs to server', { requestParams, response: expect.any(Object) })
      expect(logUploader['pendingRequest']).toBeUndefined();
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(2); // called again after initial request finished
      expect(sendPostRequestSpy).toHaveBeenCalledTimes(2); // called twice – first was failure
    });

    it('should throw error if sending logs fails for non-retriable error', async () => {
      /* load the queue */
      const queueItem: IQueueItem = {
        requestParams: {
          accessToken: 'securely',
          app: {
            appId: 'sdk',
            appVersion: '1.2.3'
          },
          traces: [{ topic: 'sdk', level: 'info', message: 'log this' }],
        },
        deferred: getDeferred()
      };
      const fakeErrorResponse = { status: 400 };
      sendPostRequestSpy.mockRejectedValue(fakeErrorResponse);

      logUploader['sendQueue'] = [ queueItem ];

      expect.assertions(8);
      // jest didn't like how we were rejecting promises as a side effect so we catch it and make sure it rejected then resolve it.
      queueItem.deferred.promise = queueItem.deferred.promise.catch(() => {
        expect(true).toBeTruthy();
      });

      const promise = logUploader['sendNextQueuedLogToServer']();

      expect(debugSpy).toHaveBeenCalledWith('sending logs to server', {
        queueItem: queueItem.requestParams,
        sendQueue: []
      });
      expect(logUploader['pendingRequest']).toBe(queueItem);
      expect(logUploader['sendQueue'].length).toBe(0);

      await queueItem.deferred.promise;
      expect(debugSpy).toHaveBeenCalledWith('ERROR sending logs to server', expect.objectContaining({ requestParams: queueItem.requestParams }));
      expect(logUploader['pendingRequest']).toBeUndefined()
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(2); // called again after initial request finished
      expect(sendPostRequestSpy).toHaveBeenCalledTimes(1); // only called once
    });

    it('should send second request if there are multiple items in the sendQueue', async () => {
      /* load the queue */
      const requestParams1: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };

      const requestParams2: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this a second time' }]
      };

      const requestParams3: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this a third time' }]
      };

      const fakeResponse = { status: 200 };
      sendPostRequestSpy.mockResolvedValue(fakeResponse);

      const promise1 = logUploader.postLogsToEndpoint(requestParams1);
      const promise2 = logUploader.postLogsToEndpoint(requestParams2);
      const promise3 = logUploader.postLogsToEndpoint(requestParams3);

      /* 1st request */
      expect(debugSpy).toHaveBeenCalledWith('sending logs to server', {
        queueItem: requestParams1,
        sendQueue: []
      });
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(3);
      expect(logUploader['pendingRequest']).toEqual(expect.objectContaining({ requestParams: requestParams1 }));
      expect(logUploader['sendQueue'].length).toBe(2); // 2 in the queue

      jest.advanceTimersToNextTimer();

      await promise1;
      /* await 1st request */
      expect(await promise1).toBe(fakeResponse);
      expect(logUploader['pendingRequest']).toEqual(expect.objectContaining({ requestParams: requestParams2 })); // this will get set because we instantly start to send our next item

      expect(debugSpy).toHaveBeenCalledWith('queue item completed. removing from queue and resetting send queue', {
        queueItemRequestParams: requestParams1, updatedSendQueue: [requestParams2, requestParams3]
      });
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(4); // called again after initial request finished
      expect(sendPostRequestSpy).toHaveBeenCalledTimes(1);

      /* await 2nd request */
      jest.advanceTimersToNextTimer();
      expect(await promise2).toBe(fakeResponse);
      expect(debugSpy).toHaveBeenCalledWith('sending logs to server', {
        queueItem: requestParams2,
        sendQueue: [requestParams3]
      });

      /* await 3rd request */
      jest.advanceTimersToNextTimer();
      expect(await promise3).toBe(fakeResponse);
      expect(debugSpy).toHaveBeenCalledWith('sending logs to server', {
        queueItem: requestParams3,
        sendQueue: []
      });

      expect(logUploader['pendingRequest']).toBeUndefined();
    });

    it('should set retryAfter property', async () => {
      jest.useFakeTimers();
      logUploader.sendQueue = [
        {
          deferred: {
            promise: {
              finally: jest.fn(),
            },
            reject: jest.fn()
          }
        } as any
      ];

      const err = new AxiosError();
      err.response = {
        headers: {
          'retry-after': '120'
        },
        status: 429
      } as any;

      logUploader['backoffFn'] = jest.fn()
        .mockRejectedValueOnce(err)
        .mockResolvedValue({});

      logUploader['sendNextQueuedLogToServer']();

      jest.advanceTimersByTime(1000);
      await flushPromises();

      expect(logUploader['retryAfter']).toBeDefined();

      jest.advanceTimersByTime(200000);
      await flushPromises();
    });

    it('should set retryAfter property (xmlhttprequest)', async () => {
      jest.useFakeTimers();
      logUploader.sendQueue = [
        {
          deferred: {
            promise: {
              finally: jest.fn(),
            },
            reject: jest.fn()
          }
        } as any
      ];

      const err = new AxiosError();
      err.response = {
        getResponseHeader: () => '120',
        status: 429
      } as any;

      logUploader['backoffFn'] = jest.fn()
        .mockRejectedValueOnce(err)
        .mockResolvedValue({});

      logUploader['sendNextQueuedLogToServer']();

      jest.advanceTimersByTime(1000);
      await flushPromises();

      expect(logUploader['retryAfter']).toBeDefined();

      jest.advanceTimersByTime(200000);
      await flushPromises();
      jest.useRealTimers();
    });

    it('should handle undefined error', async () => {
      logUploader.sendQueue = [
        {
          deferred: {
            promise: {
              finally: jest.fn(),
            },
            reject: jest.fn()
          }
        } as any
      ];

      const err = undefined;

      logUploader['backoffFn'] = jest.fn()
        .mockRejectedValueOnce(err)
        .mockResolvedValue({});

      await logUploader['sendNextQueuedLogToServer']();
    });

    it('should override existing retryAfter property', async () => {
      jest.useFakeTimers();
      logUploader.sendQueue = [
        {
          deferred: {
            promise: {
              finally: jest.fn(),
            },
            reject: jest.fn()
          }
        } as any
      ];

      const err = new AxiosError();
      err.response = {
        headers: {
          'retry-after': '120'
        },
        status: 429
      } as any;

      const date = logUploader['retryAfter'] = new Date();

      logUploader['backoffFn'] = jest.fn()
        .mockRejectedValueOnce(err)
        .mockResolvedValue({});

      logUploader['sendNextQueuedLogToServer']();

      jest.advanceTimersByTime(1000);
      await flushPromises();

      expect(logUploader['retryAfter']).toBeDefined();
      expect(logUploader['retryAfter']).not.toBe(date);

      jest.advanceTimersByTime(200000);
      await flushPromises();
      jest.useRealTimers();
    });
  });

  describe('debug()', () => {
    let consoleLogSpy: jest.SpyInstance;
    let debugFn: typeof logUploader['debug'];

    beforeEach(() => {
      debugFn = logUploader['debug'].bind(logUploader);
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    it('should not log if debugMode is `false`', () => {
      logUploader['debugMode'] = false;
      debugFn('message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log if debugMode is `true`', () => {
      logUploader['debugMode'] = true;
      debugFn('message', { details: 'object' });
      expect(consoleLogSpy).toHaveBeenCalledWith('%c [DEBUG:log-uploader] message', 'color: #32a0a8', { details: 'object' });
    });
  });

  describe('backoffFn', () => {
    it('should queue up saved logs after successful send', async () => {
      logUploader['sendPostRequest'] = jest.fn().mockResolvedValue(null);
      const accessToken = '123abc';
      const savedRequest1 = { app: { appId: '1' } };
      const savedRequest2 = { app: { appId: '2' } };
      logUploader['getSavedRequests'] = jest.fn().mockReturnValue([savedRequest1, savedRequest2]);

      const queueSpy = logUploader['postLogsToEndpoint'] = jest.fn();

      await logUploader['backoffFn']({accessToken, app: { appId: '23', appVersion: '1' }, traces: [] });

      expect(queueSpy).toHaveBeenCalledWith({ accessToken, ...savedRequest1 });
      expect(queueSpy).toHaveBeenCalledWith({ accessToken, ...savedRequest2 });
    });
  });

  describe('retryAfterTimerCheck()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should return immediately', async () => {
      logUploader['retryAfter'] = undefined;
      const spy = jest.spyOn(logUploader as any, 'retryAfterTimerCheck');

      await logUploader['retryAfterTimerCheck']();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should clear retryAfter date and resolve', async () => {
      const spy = jest.spyOn(logUploader as any, 'retryAfterTimerCheck');
      logUploader['retryAfter'] = sub(Date.now(), { seconds: 1 });

      await logUploader['retryAfterTimerCheck']();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(logUploader['retryAfter']).toBeUndefined();
    });

    it('should wait until retryAfter date, then resolve', async () => {
      const spy = jest.spyOn(logUploader as any, 'retryAfterTimerCheck');
      logUploader['retryAfter'] = add(Date.now(), { minutes: 1 });

      logUploader['retryAfterTimerCheck']();
      spy.mockReset();

      jest.advanceTimersByTime(30000);
      await flushPromises();
      expect(spy).not.toHaveBeenCalled();
      expect(logUploader['retryAfter']).toBeDefined();

      jest.advanceTimersByTime(32000);
      await flushPromises();
      expect(spy).toHaveBeenCalled();
    });
  });
});