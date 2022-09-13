import stringify from 'safe-json-stringify';
import flushPromises from "flush-promises";

import { ILoggerConfig, ITrace, ILogMessage, ILogBufferItem } from '../src/interfaces';
import { getOrCreateLogUploader } from '../src/log-uploader';
import { Logger } from '../src/logger';
import { ServerLogger } from '../src/server-logger';
import { STRING_SIZE_15090_BYTES, STRING_SIZE_7546_BYTES } from './misc/messages';
import * as utils from '../src/utils';
import { getDeferred } from '../src/utils';

process.on('unhandledRejection', (reason, promise) => {
  console.error('unandledRejection', { reason, promise });
})

describe('ServerLogger', () => {
  let logger: Logger;
  let config: ILoggerConfig;
  let serverLogger: ServerLogger;

  beforeEach(() => {
    config = {
      accessToken: 'secure',
      url: 'https://inindca.com/trace',
      appVersion: '1.2.3',
      appName: 'gc-logger-unit-test',
      debugMode: false
    };

    logger = new Logger(config);
    serverLogger = new ServerLogger(logger);

    jest.spyOn(console, 'error').mockImplementation();
  });

  describe('constructor()', () => {
    it('should throw errors for missing params', () => {
      const expectedErrorMsg = 'Missing `url` and/or `appVersion` config options to set up server logging. ' +
        'Not sending logs to server for this logger instance';
      /* no url */
      logger.config.url = null as any;

      try {
        new ServerLogger(logger);
      } catch (e: any) {
        expect(e.message).toBe(expectedErrorMsg);
      }

      /* no appVersion */
      logger.config.url = 'http';
      logger.config.appVersion = null as any;

      try {
        new ServerLogger(logger);
      } catch (e: any) {
        expect(e.message).toBe(expectedErrorMsg);
      }
    });

    it('should set config to passed in options', () => {
      logger.config.uploadDebounceTime = 14000;
      jest.spyOn(window, 'addEventListener').mockImplementation();

      serverLogger = new ServerLogger(logger);

      expect(serverLogger['logger']).toBe(logger);
      expect(serverLogger['debounceLogUploadTime']).toBe(14000);
      expect(serverLogger['logUploader']).toBe(getOrCreateLogUploader(config.url));
      expect(window.addEventListener).toHaveBeenCalledWith('unload', expect.any(Function));
    });

    it('should set defaults', () => {
      expect(serverLogger['logger']).toBe(logger);
      expect(serverLogger['debounceLogUploadTime']).toBe(4000);
      expect(serverLogger['logUploader']).toBe(getOrCreateLogUploader(config.url));
    });
  });

  describe('addLogToSend()', () => {
    let sendLogsToServerSpy: jest.SpyInstance;
    let debugSpy: jest.SpyInstance;
    let convertToLogMessageFn: typeof serverLogger['convertToLogMessage'];
    let convertToTraceFn: typeof serverLogger['convertToTrace'];

    beforeEach(() => {
      sendLogsToServerSpy = jest.spyOn(serverLogger, 'sendLogsToServer' as any).mockImplementation();
      debugSpy = jest.spyOn(serverLogger, 'debug' as any).mockImplementation();

      convertToLogMessageFn = serverLogger['convertToLogMessage'].bind(serverLogger);
      convertToTraceFn = serverLogger['convertToTrace'].bind(serverLogger);
    });

    it('should do nothing if not initialized', () => {
      serverLogger['isInitialized'] = false;

      serverLogger.addLogToSend('info', 'something');

      jest.spyOn(serverLogger, 'convertToLogMessage' as any);
      expect(serverLogger['convertToLogMessage']).not.toHaveBeenCalled();
      expect(serverLogger['logBuffer'].length).toBe(0);
    });

    it('should truncate log if it is too large', () => {
      const details = { deets: STRING_SIZE_15090_BYTES };
      const truncatedTrace: ITrace = {
        topic: config.appName,
        level: 'info',
        message: 'I was truncated'
      };

      jest.spyOn(serverLogger, 'truncateLog' as any).mockReturnValue(truncatedTrace);

      serverLogger.addLogToSend('info', 'msg', details);

      expect(serverLogger['logBuffer'].length).toBe(1);
      expect(serverLogger['logBuffer'][0]).toEqual({
        size: utils.calculateLogMessageSize(truncatedTrace),
        traces: [truncatedTrace]
      });
    });

    it('should log an error and do nothing if the truncated log is still too large', () => {
      const details = { deets: STRING_SIZE_15090_BYTES };
      const truncatedTrace = null;

      jest.spyOn(serverLogger, 'truncateLog' as any).mockReturnValue(truncatedTrace);
      jest.spyOn(serverLogger['logger'], 'error').mockImplementation();

      serverLogger.addLogToSend('info', 'msg', details);

      expect(serverLogger['logBuffer'].length).toBe(0);
      expect(serverLogger['logger'].error).toHaveBeenCalledWith('truncated message is too large to send to server. not sending message', expect.any(Object), { skipServer: true });
    });

    it('should push a new bufferItem if the current log would put bufferSize over max allowed size', () => {
      /* load one item into the buffer */
      serverLogger.addLogToSend('info', STRING_SIZE_7546_BYTES);
      expect(serverLogger['logBuffer'].length).toBe(1);
      expect(sendLogsToServerSpy).toHaveBeenCalledTimes(1);

      /* call through with a second item to load into the buffer */
      const logMessageString = 'New string ' + STRING_SIZE_7546_BYTES;
      const expected2ndTrace = convertToTraceFn('info', convertToLogMessageFn(logMessageString));
      serverLogger.addLogToSend('info', logMessageString);


      expect(debugSpy).toHaveBeenCalledWith('`exceedsMaxLogSize` was `true`', expect.any(Object));
      expect(serverLogger['logBuffer'].length).toBe(2);
      expect(serverLogger['logBuffer'][1]).toEqual({
        size: utils.calculateLogMessageSize(expected2ndTrace),
        traces: [{
          ...expected2ndTrace, // `level` & `topic`
          message: expect.stringContaining(JSON.stringify(logMessageString))
        }]
      });
      /* should set `immediate` to true if a second item was pushed to the buffer */
      expect(sendLogsToServerSpy).toHaveBeenNthCalledWith(2, true);
    });

    it('should push a new bufferItem if the current buffer is empty', () => {
      const expectedTrace = convertToTraceFn('info', convertToLogMessageFn(STRING_SIZE_7546_BYTES));

      serverLogger.addLogToSend('info', STRING_SIZE_7546_BYTES);

      expect(serverLogger['logBuffer'].length).toBe(1);
      expect(sendLogsToServerSpy).toHaveBeenCalledTimes(1);
      expect(serverLogger['logBuffer'][0]).toEqual({
        size: utils.calculateLogMessageSize(expectedTrace),
        traces: [{
          ...expectedTrace, // `level` & `topic`
          message: expect.stringContaining(JSON.stringify(STRING_SIZE_7546_BYTES))
        }]
      });
      expect(debugSpy).toHaveBeenCalledWith('`this.logBuffer` was empty. pushing new buffer item', expect.any(Object));
    });

    it('should use existing bufferItem if the current buffer is not empty and the size will not go over the max allowed', () => {
      const message1 = 'first message';
      const message2 = 'second message';

      const expectedTrace1 = convertToTraceFn('info', convertToLogMessageFn(message1));
      const expectedTrace2 = convertToTraceFn('info', convertToLogMessageFn(message2));

      /* log the first message */
      serverLogger.addLogToSend('info', message1);
      expect(serverLogger['logBuffer'].length).toBe(1);
      expect(sendLogsToServerSpy).toHaveBeenCalledTimes(1);

      expect(serverLogger['logBuffer'][0]).toEqual({
        size: utils.calculateLogMessageSize(expectedTrace1),
        traces: [{
          ...expectedTrace1, // `level` & `topic`
          message: expect.stringContaining(JSON.stringify(message1))
        }]
      });
      expect(debugSpy).toHaveBeenCalledWith('`this.logBuffer` was empty. pushing new buffer item', expect.any(Object));

      /* log the second message */
      debugSpy.mockReset();

      serverLogger.addLogToSend('info', message2);
      expect(serverLogger['logBuffer'].length).toBe(1);
      expect(sendLogsToServerSpy).toHaveBeenCalledTimes(2);

      expect(serverLogger['logBuffer'][0]).toEqual({
        size: utils.calculateLogMessageSize(expectedTrace1) + utils.calculateLogMessageSize(expectedTrace2),
        traces: [
          {
            ...expectedTrace1, // `level` & `topic`
            message: expect.stringContaining(JSON.stringify(message1))
          },
          {
            ...expectedTrace2,
            message: expect.stringContaining(JSON.stringify(message2))
          }
        ]
      });
      /* this should not have been called again */
      expect(debugSpy).not.toHaveBeenCalledWith('`this.logBuffer` was empty. pushing new buffer item', expect.any(Object));
    });
  });

  describe('sendLogsToServer()', () => {
    let sendLogsToServerFn: typeof serverLogger['sendLogsToServer'];
    let sendLogsToServerSpy: jest.SpyInstance;
    let postLogsToEndpointSpy: jest.SpyInstance;
    let debugSpy: jest.SpyInstance;

    beforeEach(() => {
      sendLogsToServerSpy = jest.spyOn(serverLogger, 'sendLogsToServer' as any);

      sendLogsToServerFn = serverLogger['sendLogsToServer'].bind(serverLogger);
      postLogsToEndpointSpy = jest.spyOn(serverLogger['logUploader'], 'postLogsToEndpoint' as any).mockResolvedValue(undefined);
      debugSpy = jest.spyOn(serverLogger, 'debug' as any).mockImplementation();

      jest.useFakeTimers();
    });

    afterEach(async () => {
      jest.clearAllTimers();
      await flushPromises();
    });

    it('should do nothing if logBuffer is empty', async () => {
      await sendLogsToServerFn();

      expect(debugSpy).toHaveBeenCalledWith('buffer empty, not sending http request');
      expect(sendLogsToServerSpy).toHaveBeenCalledTimes(1);
    });

    it('should set debounceTimer if not immediate and there is not already a timer running', async () => {
      /* load the buffer item */
      const bufferItem: ILogBufferItem = { size: 0, traces: [{ id: 'asdf' }, { id: 'qwerty' }] as any };
      serverLogger['logBuffer'].push(bufferItem);

      expect(serverLogger['debounceTimer']).toBe(null);

      await sendLogsToServerFn();

      /* should have setup the timer */
      expect(serverLogger['debounceTimer']).toBeTruthy();
      expect(debugSpy).toHaveBeenCalledWith("sendLogsToServer() 'immediate' is false. setting up 'debounceTimer' to 4000ms");

      /* after the timer runs out, it should call itself and post logs */
      jest.advanceTimersByTime(4002);
      await Promise.resolve();

      expect(sendLogsToServerSpy).toHaveBeenNthCalledWith(2, true);
      expect(postLogsToEndpointSpy).toHaveBeenCalledWith(
        serverLogger['convertToRequestParams'](bufferItem.traces.reverse())
      );
    });

    it('should do nothing if not immediate and there is already a timer running', async () => {
      /* load the buffer item */
      const bufferItem: ILogBufferItem = { size: 0, traces: [] as any };
      serverLogger['logBuffer'].push(bufferItem);

      expect(serverLogger['debounceTimer']).toBe(null);

      await sendLogsToServerFn();

      /* should have setup the timer */
      const firstTimer = serverLogger['debounceTimer'];
      expect(firstTimer).toBeTruthy();
      expect(debugSpy).toHaveBeenCalledWith("sendLogsToServer() 'immediate' is false. setting up 'debounceTimer' to 4000ms");

      /* 2nd call should not re-setup the timer */
      await sendLogsToServerFn();
      expect(serverLogger['debounceTimer']).toBe(firstTimer);
      expect(debugSpy).toHaveBeenCalledWith(`sendLogsToServer() 'immediate' is false. 'debounceTimer' is already running`);
    });

    it('should postLogsToEndpoint and update logBuffer if immediate is `true`', async () => {
      /* load the buffer item */
      const bufferItem: ILogBufferItem = { size: 0, traces: [{}] as any };
      serverLogger['logBuffer'].push(bufferItem);

      const deferred = getDeferred();
      postLogsToEndpointSpy.mockReturnValue(deferred.promise);

      const originalPromise = sendLogsToServerFn(true);

      /* should not have have setup the timer yet (since we are sending imediately) */
      expect(serverLogger['debounceTimer']).toBe(null);
      expect(debugSpy).toHaveBeenCalledWith('calling logUploader.postLogsToEndpoint() with', { bufferItem, newLogBuffer: [] });

      /* after the http request completes, it should call itself to setup the timer */
      deferred.resolve(null);
      await originalPromise;
      expect(sendLogsToServerSpy).toHaveBeenNthCalledWith(2);
    });

    it('should handle POST errors and reset the timer if immediate is `true`', async () => {
      /* load the buffer item */
      const bufferItem: ILogBufferItem = { size: 0, traces: [{}] as any };
      serverLogger['logBuffer'].push(bufferItem);

      const err = new Error('Something broke');
      postLogsToEndpointSpy.mockRejectedValue(err);

      const errorSpy = jest.spyOn(serverLogger['logger'], 'error').mockImplementation();

      await sendLogsToServerFn(true);

      /* should log the error */
      expect(errorSpy).toHaveBeenCalledWith('Error sending logs to server', err, { skipServer: true });

      /* after the http request rejects, it should call itself to setup the timer */
      expect(sendLogsToServerSpy).toHaveBeenNthCalledWith(2);
    });

    it('should handle POST errors for 401/404 responses by stopping the server logging and emitted the error', async () => {
      /* load the buffer item */
      const bufferItem1: ILogBufferItem = { size: 0, traces: [{}] as any };
      const bufferItem2: ILogBufferItem = { size: 0, traces: [{}] as any };
      serverLogger['logBuffer'].push(bufferItem1);

      const err = new Error('Something broke') as any;
      err['status'] = '401';
      postLogsToEndpointSpy.mockRejectedValue(err);

      jest.spyOn(serverLogger['logger'], 'error').mockImplementation();
      const emitSpy = jest.spyOn(logger, 'emit');
      const stopServerLoggingSpy = jest.spyOn(logger, 'stopServerLogging');
      const resetSendQueueSpy =  jest.spyOn(serverLogger['logUploader'], 'resetSendQueue');

      const req = sendLogsToServerFn(true);

      /* simulate adding more items to the buffer while the POST is in flight */
      serverLogger['logBuffer'].push(bufferItem2);

      await req;

      /* should emit the error, stop logging, reset queue, and clear out the logBuffer */
      expect(emitSpy).toHaveBeenCalledWith('onError', err);
      expect(stopServerLoggingSpy).toHaveBeenCalledWith(err['status']);
      expect(resetSendQueueSpy).toHaveBeenCalled();
      expect(serverLogger['logBuffer'].length).toBe(0);
    });

    it('should handle undefined errors', async () => {
      /* load the buffer item */
      const bufferItem: ILogBufferItem = { size: 0, traces: [{}] as any };
      serverLogger['logBuffer'].push(bufferItem);

      postLogsToEndpointSpy.mockRejectedValue(undefined);

      await sendLogsToServerFn(true);
      expect('it does not throw an error checking for the "status" prop on an "undefined" error').toBeTruthy();
    });
  });

  describe('sendAllLogsInstantly()', () => {
    it('should load the uploader queue with each buffer item and then trigger to send the entire queue', async () => {
      /* load the buffer item */
      const bufferItem1: ILogBufferItem = { size: 0, traces: [{ id: 'asdf' }, { id: 'qwerty' }] as any };
      serverLogger['logBuffer'].push(bufferItem1);
      const bufferItem2: ILogBufferItem = { size: 0, traces: [{ id: 'hjkl' }, { id: 'yuio' }] as any };
      serverLogger['logBuffer'].push(bufferItem2);

      const postLogsToEndpointInstantlySpy = jest.spyOn(serverLogger['logUploader'], 'postLogsToEndpointInstantly').mockResolvedValue(undefined);
      const sendEntireQueueSpy = jest.spyOn(serverLogger['logUploader'], 'sendEntireQueue').mockReturnValue([]);

      serverLogger['sendAllLogsInstantly']();

      expect(postLogsToEndpointInstantlySpy).toHaveBeenNthCalledWith(1, serverLogger['convertToRequestParams'](bufferItem1.traces.reverse()), { saveOnFailure: true });
      expect(postLogsToEndpointInstantlySpy).toHaveBeenNthCalledWith(2, serverLogger['convertToRequestParams'](bufferItem2.traces.reverse()), { saveOnFailure: true });
      expect(sendEntireQueueSpy).toHaveBeenCalled();

      await Promise.resolve();
    });
  });

  describe('truncateLog()', () => {
    let convertToTraceFn: typeof serverLogger['convertToTrace'];
    let convertToLogMessageFn: typeof serverLogger['convertToLogMessage'];
    let truncateLogFn: typeof serverLogger['truncateLog'];

    beforeEach(() => {
      convertToTraceFn = serverLogger['convertToTrace'].bind(serverLogger);
      convertToLogMessageFn = serverLogger['convertToLogMessage'].bind(serverLogger);
      truncateLogFn = serverLogger['truncateLog'].bind(serverLogger);

      jest.spyOn(console, 'warn').mockImplementation();
    });

    it('should truncate details', () => {
      const inputLog: ILogMessage = convertToLogMessageFn('normal message', STRING_SIZE_15090_BYTES);
      const expectedTrace: ITrace = convertToTraceFn('info', { ...inputLog, details: '[[TRUNCATED]]' });
      expect(truncateLogFn('info', inputLog)).toEqual(expectedTrace);
    });

    it('should truncate message and details', () => {
      const inputLog: ILogMessage = convertToLogMessageFn(STRING_SIZE_15090_BYTES, STRING_SIZE_15090_BYTES);
      const expectedTrace: ITrace = convertToTraceFn('info', {
        ...inputLog,
        message: `${STRING_SIZE_15090_BYTES.substr(0, 150)}... [[TRUNCATED]]`,
        details: '[[TRUNCATED]]'
      });

      expect(truncateLogFn('info', inputLog)).toEqual(expectedTrace);
    });

    it('should return `null` if truncated message it too large (which honestly, should never happen)', () => {
      const inputLog: ILogMessage = convertToLogMessageFn(STRING_SIZE_15090_BYTES, STRING_SIZE_15090_BYTES);
      jest.spyOn(utils, 'calculateLogMessageSize').mockReturnValue(14501);
      expect(truncateLogFn('info', inputLog)).toBe(null);
    });
  });

  describe('convertToLogMessage()', () => {
    it('should return an ILogMessage', () => {
      const message = "log me I'm Irish";
      const details = { origin: 'Ireland' };
      const expected: ILogMessage = {
        clientTime: expect.any(String),
        clientId: logger.clientId,
        message,
        details
      };

      expect(serverLogger['convertToLogMessage'](message, details)).toEqual(expected);
    });

    it('should add originApp fields if they exist in the config', () => {
      const originAppName = 'Batman';
      const originAppVersion = '2.0';
      const originAppId = 'top-secret-bat-cave-hash';

      logger.config.originAppName = originAppName;
      logger.config.originAppVersion = originAppVersion;
      logger.config.originAppId = originAppId;

      const message = 'It’s not who I am underneath, but what I do that defines me.';
      const expected: ILogMessage = {
        clientTime: expect.any(String),
        clientId: logger.clientId,
        message,
        originAppName,
        originAppVersion,
        originAppId,
        details: undefined
      };

      expect(serverLogger['convertToLogMessage'](message)).toEqual(expected);
    });
  });

  describe('convertToTrace()', () => {
    it('should return an ILogMessage', () => {
      const level = 'warn';
      const logMessage: ILogMessage = {
        clientTime: '2020-20-20',
        clientId: logger.clientId,
        message: 'wait for it',
        details: { outcoming: 'great things come in small packages' }
      };

      expect(serverLogger['convertToTrace'](level, logMessage)).toEqual({
        topic: logger.config.appName,
        level: 'WARN',
        message: stringify(logMessage)
      });
    });
  });

  describe('convertToRequestParams()', () => {
    it('should return http request params', () => {
      const traces: ITrace[] = [];

      expect(serverLogger['convertToRequestParams'](traces)).toEqual({
        accessToken: logger.config.accessToken,
        app: {
          appId: logger.config.appName,
          appVersion: logger.config.appVersion
        },
        traces
      });
    });
  });

  describe('debug()', () => {
    let consoleLogSpy: jest.SpyInstance;
    let debugFn: typeof serverLogger['debug'];

    beforeEach(() => {
      debugFn = serverLogger['debug'].bind(serverLogger);
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    it('should not log if debugMode is `false`', () => {
      serverLogger['logger'].config.debugMode = false;
      debugFn('message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log if debugMode is `true`', () => {
      serverLogger['logger'].config.debugMode = true;
      debugFn('message', { details: 'object' });
      expect(consoleLogSpy).toHaveBeenCalledWith(`%c [DEBUG:${serverLogger['logger'].config.appName}] message`, 'color: #32a852', { details: 'object' });
    });
  });
});