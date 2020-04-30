/* tslint:disable:no-string-literal */
import * as utils from './utils';
import { LogUploader } from './log-uploader';
import { ISendLogRequest, ISendLogState } from './interfaces';
import { Backoff } from 'backoff-web';
jest.mock('backoff-web');

let logUploader: LogUploader;
beforeEach(() => {
  logUploader = new LogUploader();
});

describe('setEnvironment', () => {
  it('should update env accordingly', () => {
    // @ts-ignore
    expect(logUploader.environment).toBeFalsy();

    const env1 = 'asdflkj';

    logUploader.setEnvironment(env1);
    // @ts-ignore
    expect(logUploader.environment).toBe(env1);

    const env2 = 'jjkjkjkjkj';
    logUploader.setEnvironment(env2);
    // @ts-ignore
    expect(logUploader.environment).toBe(env1);

    logUploader.setEnvironment(env2, true);
    // @ts-ignore
    expect(logUploader.environment).toBe(env2);
  });
});

describe('backoff events', () => {
  let backoff: Backoff;

  beforeEach(() => {
    backoff = logUploader['backoff'];
  })

  it('should handle the backoff event', () => {
    const spy = logUploader['uploadLogsToServer'] = jest.fn();

    (backoff as any).triggerEvent('backoff');

    expect(spy).toHaveBeenCalled();
  });

  it('should handle the ready event', () => {
    (backoff as any).triggerEvent('ready');

    expect(backoff.backoff).toHaveBeenCalled();
  });

  it('should handle the fail event', () => {
    logUploader['hasPendingRequest'] = true;

    (backoff as any).triggerEvent('fail');

    const active = logUploader['hasPendingRequest'];
    expect(active).toBeFalsy();
  });
});

describe('sendLogs', () => {
  it('should queue up request and resolve when request is finished', async () => {
    const spy = jest.fn();

    const promise = logUploader.sendLogs({
      accessToken: 'alksjd',
      app: {
        appId: 'asdf',
        appVersion: '1.1.1'
      },
      traces: [ {} as any ]
    }).then(() => {
      spy();
    });

    expect(spy).not.toHaveBeenCalled();
    // @ts-ignore
    const queue = logUploader.sendQueue;

    expect(queue.length).toBe(1);
    queue[0].deferred.resolve();

    await promise;

    expect(spy).toHaveBeenCalled();
  });
});

describe('uploadLogsToServer', () => {
  let requestSpy: any;

  beforeEach(() => {
    requestSpy = jest.spyOn(utils, 'requestApi');
  });

  it('should do nothing if pendingRequest', async () => {
    (requestSpy as jest.Mock).mockResolvedValue(null);

    // @ts-ignore
    logUploader.backoff = { reset: jest.fn() };
    logUploader['hasPendingRequest'] = true;

    const item: ISendLogState = {
      request: {
        accessToken: 'alksjd',
        app: {
          appId: 'asdf',
          appVersion: '1.1.1'
        },
        traces: [ {} as any ]
      },
      deferred: { promise: jest.fn(), resolve: jest.fn(), reject: jest.fn() },
    } as any;

    // @ts-ignore
    const queue = logUploader.sendQueue;

    queue.push(item);

    await (logUploader as any).uploadLogsToServer();

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('should do nothing if no queue item', async () => {
    (requestSpy as jest.Mock).mockResolvedValue(null);

    // @ts-ignore
    logUploader.backoff = { reset: jest.fn() };
    logUploader['hasPendingRequest'] = false;

    await (logUploader as any).uploadLogsToServer();

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('should remove item from queue and resolve it when complete', async () => {
    (requestSpy as jest.Mock).mockResolvedValue(null);

    // @ts-ignore
    logUploader.backoff = { reset: jest.fn() };

    const item: ISendLogState = {
      request: {
        accessToken: 'alksjd',
        app: {
          appId: 'asdf',
          appVersion: '1.1.1'
        },
        traces: [ {} as any ]
      },
      deferred: { promise: jest.fn(), resolve: jest.fn(), reject: jest.fn() },
    } as any;

    // @ts-ignore
    const queue = logUploader.sendQueue;

    queue.push(item);

    await (logUploader as any).uploadLogsToServer();

    expect(queue.length).toEqual(0);
    expect(item.deferred.resolve).toHaveBeenCalled();
  });

  it('should reject request', async () => {
    (requestSpy as jest.Mock).mockRejectedValue({ status: 413 });

    const resetSpy = jest.fn();

    // @ts-ignore
    logUploader.backoff = { reset: resetSpy };

    const item: ISendLogState = {
      request: {
        accessToken: 'alksjd',
        app: {
          appId: 'asdf',
          appVersion: '1.1.1'
        },
        traces: [ {} as any ]
      },
      deferred: { promise: jest.fn(), resolve: jest.fn(), reject: jest.fn() },
    } as any;

    // @ts-ignore
    const queue = logUploader.sendQueue;

    queue.push(item);

    await (logUploader as any).uploadLogsToServer();

    expect(queue.length).toEqual(0);
    expect(item.deferred.resolve).not.toHaveBeenCalled();
    expect(item.deferred.reject).toHaveBeenCalled();
    expect(resetSpy).toHaveBeenCalled();
  });

  it('handle 429', async () => {
    (requestSpy as jest.Mock).mockRejectedValue({ status: 429 });

    const resetSpy = jest.fn();

    // @ts-ignore
    logUploader.backoff = { reset: resetSpy };

    const item: ISendLogState = {
      request: {
        accessToken: 'alksjd',
        app: {
          appId: 'asdf',
          appVersion: '1.1.1'
        },
        traces: [ {} as any ]
      },
      deferred: { promise: jest.fn(), resolve: jest.fn(), reject: jest.fn() },
    } as any;

    // @ts-ignore
    const queue = logUploader.sendQueue;

    queue.push(item);

    await (logUploader as any).uploadLogsToServer();

    expect(queue.length).toEqual(0);
    expect(item.deferred.resolve).not.toHaveBeenCalled();
    expect(item.deferred.reject).toHaveBeenCalled();
    expect(resetSpy).not.toHaveBeenCalled();
  });
});