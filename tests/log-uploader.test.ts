import nock from 'nock';

import { getOrCreateLogUploader, LogUploader } from '../src/log-uploader';
import { ISendLogRequest } from '../old-src/interfaces';

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
  });

  describe('sendEntireQueue()', () => {
    it('should send the entire sendQueue', () => {
      const debugSpy = jest.spyOn(logUploader, 'debug' as any);
      const postLogsToEndpointSpy = jest.spyOn(logUploader, 'postLogsToEndpoint' as any).mockResolvedValue(true);
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

      logUploader['sendQueue'] = [
        { requestParams: requestParams1 } as any,
        { requestParams: requestParams2 } as any,
      ];

      logUploader.sendEntireQueue();

      expect(debugSpy).toHaveBeenCalledWith('sending all queued requests instantly to clear out sendQueue', {
        sendQueue: [requestParams1, requestParams2]
      });

      expect(postLogsToEndpointSpy).toHaveBeenNthCalledWith(1, requestParams1);
      expect(postLogsToEndpointSpy).toHaveBeenNthCalledWith(2, requestParams2);
    });
  });

  describe('sendPostRequest()', () => {
    it('should make http POST request with auth token', async () => {
      const requestParams: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };
      const api = nock(url, {
        reqheaders: {
          'content-type': 'application/json; charset=UTF-8',
          authorization: /Bearer/,
        }
      });
      const logs = api.post('').reply(200);

      await logUploader['sendPostRequest'](requestParams);

      expect(logs.matchHeader('Authorization', /Bearer /)).toBeTruthy();
      expect(logs.isDone()).toBe(true);

      nock.restore();
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
      logUploader['hasPendingRequest'] = true;

      await sendNextQueuedLogToServerFn();

      expect(debugSpy).toHaveBeenCalledWith('sendNextQueuedLogToServer() but not sending request', expect.any(Object));

      logUploader['hasPendingRequest'] = false;
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
      expect(logUploader['hasPendingRequest']).toBe(true);
      expect(logUploader['sendQueue'].length).toBe(0);

      jest.advanceTimersToNextTimer();

      expect(await promise).toBe(fakeResponse);
      expect(debugSpy).toHaveBeenCalledWith('successfully sent logs to server', { requestParams, response: expect.any(Object) });
      expect(logUploader['hasPendingRequest']).toBe(false);

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
      const fakeErrorResponse = { status: 429 };
      const fakeSuccessfulResponse = { status: 200 };

      sendPostRequestSpy
        .mockRejectedValueOnce(fakeErrorResponse) // fail once
        .mockResolvedValue(fakeSuccessfulResponse);

      const promise = logUploader.postLogsToEndpoint(requestParams);

      expect(debugSpy).toHaveBeenCalledWith('sending logs to server', {
        queueItem: requestParams,
        sendQueue: []
      });
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(1);
      expect(logUploader['hasPendingRequest']).toBe(true);
      expect(logUploader['sendQueue'].length).toBe(0);

      /* await 1st promise failure */
      jest.advanceTimersToNextTimer();
      await new Promise(res => setImmediate(res));

      /* await 2nd promise success */
      jest.advanceTimersToNextTimer();
      expect(await promise).toBe(fakeSuccessfulResponse);

      expect(debugSpy).toHaveBeenCalledWith('successfully sent logs to server', { requestParams, response: expect.any(Object) })
      expect(logUploader['hasPendingRequest']).toBe(false);
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(2); // called again after initial request finished
      expect(sendPostRequestSpy).toHaveBeenCalledTimes(2); // called twice – first was failure
    });

    it('should throw error if sending logs fails for non-retriable error', async () => {
      /* load the queue */
      const requestParams: ISendLogRequest = {
        accessToken: 'securely',
        app: {
          appId: 'sdk',
          appVersion: '1.2.3'
        },
        traces: [{ topic: 'sdk', level: 'info', message: 'log this' }]
      };
      const fakeErrorResponse = { status: 401 };
      sendPostRequestSpy.mockRejectedValue(fakeErrorResponse);

      const promise = logUploader.postLogsToEndpoint(requestParams);

      expect(debugSpy).toHaveBeenCalledWith('sending logs to server', {
        queueItem: requestParams,
        sendQueue: []
      });
      expect(sendNextQueuedLogToServerSpy).toHaveBeenCalledTimes(1);
      expect(logUploader['hasPendingRequest']).toBe(true);
      expect(logUploader['sendQueue'].length).toBe(0);

      /* await 2nd promise success */
      jest.advanceTimersToNextTimer();
      try {
        await promise;
        fail('should have thrown');
      } catch (error) {
        expect(debugSpy).toHaveBeenCalledWith('ERROR sending logs to server', { requestParams, error })
      }

      expect(logUploader['hasPendingRequest']).toBe(false);
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
      expect(logUploader['hasPendingRequest']).toBe(true);
      expect(logUploader['sendQueue'].length).toBe(2); // 2 in the queue

      jest.advanceTimersToNextTimer();

      /* await 1st request */
      expect(await promise1).toBe(fakeResponse);
      expect(logUploader['hasPendingRequest']).toBe(true); // this will get set because we instantly start to send our next item

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

      expect(logUploader['hasPendingRequest']).toBe(false);
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
});