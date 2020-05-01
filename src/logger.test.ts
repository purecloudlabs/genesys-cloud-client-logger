/* tslint:disable:no-string-literal */
import { Logger } from './logger';
import { IServerOpts, LogLevels } from './interfaces';
import * as utils from './utils';
import * as logUploaderMod from './log-uploader';

import { wait } from './test-utils';

jest.mock('superagent');

describe('constructor', () => {
  it('should create with custom id', () => {
    const logger = new Logger();

    const clientId = logger['clientId'];
    expect(clientId).toBeTruthy();
  });
});

describe('initializeServerLogging', () => {
  let logger: Logger;
  let opts: IServerOpts;

  beforeEach(() => {
    logger = new Logger();
    opts = {
      accessToken: 'sdlfkj',
      environment: 'mypurecloud.com',
      appVersion: '1.2.3',
      logTopic: 'client-logger-test',
      logLevel: LogLevels.warn,
      uploadDebounceTime: 100,
    }
  });

  it('should throw if already initialized', () => {
    logger['isInitialized'] = true;

    expect(() => logger.initializeServerLogging({} as any)).toThrow(/already initialized/);
  });

  it('should default to INFO if invalid logLevel is provided', () => {
    logger.warn = jest.fn();
    (opts as any).logLevel = 'sldkfjs';

    logger.initializeServerLogging(opts);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid log level'), null, true);

    const loggerOpts = logger['opts'];
    expect(loggerOpts.logLevel).toEqual(LogLevels.info);
  });

  it('should default to INFO if no logLevel is provided', () => {
    logger.warn = jest.fn();
    (opts as any).logLevel = null;

    logger.initializeServerLogging(opts);

    const loggerOpts = logger['opts'];
    expect(loggerOpts.logLevel).toEqual(LogLevels.info);
  });

  it('should throw error if no env', () => {
    logger.error = jest.fn();
    (opts.environment as any) = null;

    expect(() => logger.initializeServerLogging(opts)).toThrow(/environment must be provided/);
  });

  it('should warn if env is unknown', () => {
    logger.warn = jest.fn();
    opts.environment = 'sdlfkjsdkfjs';

    logger.initializeServerLogging(opts);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/Unknown environment/), null, true);
  });

  it('should throw if no accessToken', () => {
    (opts.accessToken as any) = null;

    expect(() => logger.initializeServerLogging(opts)).toThrow(/provide an accessToken/);
  });

  it('happy path', () => {
    logger.initializeServerLogging(opts);

    const initialized = logger['isInitialized'];
    expect(initialized).toBeTruthy();
  });
});

describe('log methods', () => {
  let logger: Logger;
  let spy: jest.Mock;
  let message: string;
  let details: any;

  beforeEach(() => {
    logger = new Logger();

    spy = logger['processLog'] = jest.fn();

    message = 'log message';
    details = { hasInfo: true };
  });

  it('should proxy log to processLog', () => {
    logger.log(message, details);
    expect(spy).toHaveBeenCalledWith(LogLevels.log, message, details, undefined);

    logger.log(message, details, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.log, message, details, true);

    logger.log(message, null, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.log, message, null, true);
  });

  it('should proxy debug to processLog', () => {
    logger.debug(message, details);
    expect(spy).toHaveBeenCalledWith(LogLevels.debug, message, details, undefined);

    logger.debug(message, details, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.debug, message, details, true);

    logger.debug(message, null, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.debug, message, null, true);
  });

  it('should proxy info to processLog', () => {
    logger.info(message, details);
    expect(spy).toHaveBeenCalledWith(LogLevels.info, message, details, undefined);

    logger.info(message, details, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.info, message, details, true);

    logger.info(message, null, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.info, message, null, true);
  });

  it('should proxy warn to processLog', () => {
    logger.warn(message, details);
    expect(spy).toHaveBeenCalledWith(LogLevels.warn, message, details, undefined);

    logger.warn(message, details, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.warn, message, details, true);

    logger.warn(message, null, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.warn, message, null, true);
  });

  it('should proxy error to processLog', () => {
    logger.error(message, details);
    expect(spy).toHaveBeenCalledWith(LogLevels.error, message, details, undefined);

    logger.error(message, details, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.error, message, details, true);

    logger.error(message, null, true);
    expect(spy).toHaveBeenCalledWith(LogLevels.error, message, null, true);
  });
});

describe('processLog', () => {
  let processLog: (level: LogLevels, message: string | Error, details?: any, skipServer?: boolean) => void;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();

    processLog = logger['processLog'].bind(logger);
  });

  afterEach(() => jest.restoreAllMocks());

  it('should default to log', () => {
    const spy = console['log'] = jest.fn();

    const message = 'Fake Message';
    const error = new Error(message);
    processLog(null as any, error, null, true);

    expect(spy).toHaveBeenCalledWith(message, error);
  });

  it('should get message from Error', () => {
    const spy = console['info'] = jest.fn();

    const message = 'Fake Message';
    const error = new Error(message);
    processLog(LogLevels.info, error, null, true);

    expect(spy).toHaveBeenCalledWith(message, error);
  });

  it('should not override details with Error', () => {
    const spy = console['info'] = jest.fn();

    const message = 'Fake Message';
    const error = new Error(message);
    const details = { something: true };
    processLog(LogLevels.info, error, details, true);

    expect(spy).toHaveBeenCalledWith(message, details);
  });

  it('should use prefix', () => {
    const spy = console['info'] = jest.fn();

    const topicName = 'customTopic';
    const message = 'someMessage';
    (logger['opts'] as any) = { logTopic: topicName };

    processLog(LogLevels.info, message, null, true);

    expect(spy).toHaveBeenCalledWith(`[${topicName}] ${message}`, null);
  });

  describe('send to server', () => {
    let notifyLogs: jest.Mock;
    let calculateLogMessageSize: jest.Mock;

    beforeEach(() => {
      notifyLogs = logger['notifyLogs'] = jest.fn();
      logger['opts'] = {
        logTopic: 'testTopic',
        logLevel: LogLevels.info
      } as any;

      logger['isInitialized'] = true;
      calculateLogMessageSize = jest.spyOn(utils, 'calculateLogMessageSize') as any;
    });

    it('should not send to server if not initialized', () => {
      logger['isInitialized'] = false;
      processLog(LogLevels.error, 'fake message', null);

      expect(notifyLogs).not.toHaveBeenCalled();
    });

    it('should not send if below logLevel', () => {
      processLog(LogLevels.debug, 'fake message', null);

      expect(notifyLogs).not.toHaveBeenCalled();
    });

    it('should send immediately if full', () => {
      calculateLogMessageSize.mockReturnValue(50000);

      processLog(LogLevels.info, 'fake message', null);
      expect(notifyLogs).toHaveBeenCalledWith(true);
      expect(logger['logBuffer'].length).toBe(1);
    });

    it('should use debounced call if not full', () => {
      calculateLogMessageSize.mockReturnValue(10);

      processLog(LogLevels.info, 'fake message', null);
      expect(notifyLogs).toHaveBeenCalledWith();
      expect(logger['logBuffer'].length).toBe(1);
      expect(logger['logBufferSize']).toBe(10);
    });
  });
});

describe('notifyLogs', () => {
  let logger: Logger;
  let opts: IServerOpts;
  let notifyLogs: (sendImmediately?: boolean) => void;
  let tryToSendLogs: jest.Mock;

  beforeEach(() => {
    logger = new Logger();
    opts = logger['opts'] = { uploadDebounceTime: 1 } as any
    tryToSendLogs = logger['tryToSendLogs'] = jest.fn();
    notifyLogs = logger['notifyLogs'].bind(logger);
  });

  afterEach(() => {
    clearTimeout(logger['sendLogTimer']);
  });

  it('should send immediately', () => {
    logger['sendLogTimer'] = 1241;

    notifyLogs(true);
    expect(tryToSendLogs).toHaveBeenCalled();
  });

  it('should not send immediately if a request is already pending', () => {
    logger['sendLogTimer'] = 1241;
    logger['logRequestPending'] = true;

    notifyLogs(true);
    expect(tryToSendLogs).not.toHaveBeenCalled();
  });

  it('should not send immediately', async () => {
    logger['logRequestPending'] = true;

    notifyLogs();
    expect(tryToSendLogs).not.toHaveBeenCalled();

    await wait(2);
    expect(tryToSendLogs).toHaveBeenCalled();
  });
});

describe('tryToSendLogs', () => {
  let logger: Logger;
  let spy: jest.Mock;

  beforeEach(() => {
    logger = new Logger();
    spy = logger['queueLogsUpload'] = jest.fn()
  });

  it('should not send if already active', () => {
    logger['logRequestPending'] = true;

    logger['tryToSendLogs']();

    expect(spy).not.toHaveBeenCalled();
  });

  it('should send', () => {
    logger['tryToSendLogs']();
    expect(spy).toHaveBeenCalled();
  });
});

describe('queueLogsUpload', () => {
  let logger: Logger;
  let getLogPayload: jest.Mock;
  let reset: jest.SpyInstance;
  let notifySpy: jest.Mock;
  let sendSpy: jest.Mock;

  beforeEach(() => {
    logger = new Logger();
    logger['opts'] = { logTopic: 'customTopic' } as any;
    sendSpy = jest.fn();
    // @ts-ignore
    logUploaderMod.default = { sendLogs: sendSpy } as any;

    // @ts-ignore
    getLogPayload = jest.spyOn(logger, 'getLogPayload').mockReturnValue();
    reset = logger['reset'] = jest.fn();
    notifySpy = logger['notifyLogs'] = jest.fn();
  });

  it('should not send anything if there are no traces', async () => {
    getLogPayload.mockReturnValue([]);

    await logger['queueLogsUpload']();

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('should succeed and reset flags', async () => {
    sendSpy.mockResolvedValue(null);
    getLogPayload.mockReturnValue([{ message: 'here we go' }]);

    await logger['queueLogsUpload']();

    expect(reset).toHaveBeenCalled();
    expect(sendSpy).toHaveBeenCalled();
    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('should fire again if buffer is not empty', async () => {
    sendSpy.mockResolvedValue(null);
    getLogPayload.mockReturnValue([{ message: 'here we go' }]);
    logger['logBuffer'] = [{} as any];

    await logger['queueLogsUpload']();

    expect(reset).toHaveBeenCalled();
    expect(notifySpy).toHaveBeenCalled();
  });

  describe('send failure cases', () => {
    it('should inc failed attempts and add traces back to buffer', async () => {
      let rejectRequest: any;
      sendSpy.mockImplementation(() => new Promise((resolve, reject) => {
        rejectRequest = reject;
      }));

      // use real value
      getLogPayload.mockRestore();

      const trace1 = { message: 'message 1' };
      const trace2 = { message: 'message 2' };
      const trace3 = { message: 'message 3' };
      const trace4 = { message: 'message 4' };

      logger['logBuffer'] = [trace1, trace2, trace3] as any

      const sendPromise = logger['queueLogsUpload']();

      expect(logger['logBuffer'].length).toBe(0);
      logger['logBuffer'] = [trace4] as any

      rejectRequest!({ status: 500 });

      await sendPromise;

      expect(logger['logBuffer'].length).toBe(4);
      expect(logger['logBuffer']).toEqual([trace1, trace2, trace3, trace4]);
      expect(logger['failedLogAttempts']).toEqual(1);
    });

    it('413 error should reduce payload', async () => {
      let rejectRequest: any;
      sendSpy.mockImplementation(() => new Promise((resolve, reject) => {
        rejectRequest = reject;
      }));

      const trace1 = { message: 'message 1' };
      const trace2 = { message: 'message 2' };
      const trace3 = { message: 'message 3' };
      const trace4 = { message: 'message 4' };

      getLogPayload.mockReturnValue([ trace1, trace2, trace3 ]);

      const sendPromise = logger['queueLogsUpload']();

      expect(logger['logBuffer'].length).toBe(0);
      logger['logBuffer'] = [trace4] as any

      rejectRequest!({ status: 413 });

      await sendPromise;

      expect(logger['logBuffer'].length).toBe(4);
      expect(logger['logBuffer']).toEqual([trace1, trace2, trace3, trace4]);
      expect(logger['failedLogAttempts']).toBeTruthy();
      expect(notifySpy).not.toHaveBeenCalled()
    });

    it('413 with only one trace should drop the trace', async () => {
      let rejectRequest: any;
      sendSpy.mockImplementation(() => new Promise((resolve, reject) => {
        rejectRequest = reject;
      }));

      const trace1 = { message: 'message 1' };
      getLogPayload.mockReturnValue([ trace1 ]);


      const sendPromise = logger['queueLogsUpload']();

      const trace4 = { message: 'message 4' };

      expect(logger['logBuffer'].length).toBe(0);
      logger['logBuffer'] = [trace4] as any

      rejectRequest!({ status: 413 });

      await sendPromise;

      expect(logger['logBuffer'].length).toBe(1);
      expect(logger['logBuffer']).toEqual([trace4]);
      expect(logger['failedLogAttempts']).toEqual(1);
      expect(reset).toHaveBeenCalled();
    });
  });
});

describe('getLogPayload', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
  });

  it('should grab all traces', () => {
    const trace1 = { message: 'trace1' };
    const trace2 = { message: 'trace2' };
    const trace3 = { message: 'trace3' };
    logger['logBuffer'] = [trace1, trace2, trace3] as any;

    const payload = logger['getLogPayload']();

    expect(payload).toEqual([trace1, trace2, trace3]);
    expect(logger['logBuffer'].length).toBe(0);
  });

  it('should grab traces until max size exceeded', () => {
    const trace1 = { message: 'trace1' };
    const trace2 = { message: 'trace2' };
    const trace3 = { message: 'trace3' };
    logger['logBuffer'] = [trace1, trace2, trace3] as any;

    jest.spyOn(utils, 'calculateLogMessageSize')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(10022222);

    const payload = logger['getLogPayload']();

    expect(payload).toEqual([trace1, trace2]);
    expect(logger['logBuffer'].length).toBe(1);
  });

  it('should not get items too big', () => {
    const trace1 = { message: 'trace1' };
    const trace2 = { message: 'trace2' };
    const trace3 = { message: 'trace3' };
    logger['logBuffer'] = [trace1, trace2, trace3] as any;

    jest.spyOn(utils, 'calculateLogMessageSize')
      .mockReturnValueOnce(1002222)
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(105455540);

    const payload = logger['getLogPayload']();

    expect(payload).toEqual([trace2]);
    expect(logger['logBuffer'].length).toBe(1);
  });
});

describe('reset', () => {
  it('should reset stuff', () => {
    const logger = new Logger();
    logger['logRequestPending'] = true;
    logger['failedLogAttempts'] = 5;

    logger['reset']();

    expect(logger['logRequestPending']).toBeFalsy();
    expect(logger['failedLogAttempts']).toBeFalsy();
  });
});

