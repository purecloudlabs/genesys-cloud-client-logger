import { Logger } from '../src/logger';
import { ILoggerConfig, ILogMessageOptions, LogLevel, NextFn } from '../src/interfaces';
import { ServerLogger } from '../src/server-logger';

describe('Logger', () => {
  let logger: Logger;
  let config: ILoggerConfig;

  beforeEach(() => {
    config = {
      accessToken: 'secure',
      url: 'https://inindca.com/trace',
      appVersion: '1.2.3',
      appName: 'gc-logger-unit-test',
      debugMode: false,
      stringify: false
    };

    logger = new Logger(config);
  });

  describe('constructor()', () => {
    it('should initialize with defaults', () => {
      logger = new Logger(config);

      expect(logger.config).toEqual({
        ...config,
        logLevel: 'info'
      });
      expect(logger.clientId).toBeTruthy();
      expect(logger['serverLogger'] instanceof ServerLogger).toBe(true);
      expect(logger.config.logger).toBeUndefined();
      expect(logger['secondaryLogger']).toBe(console);
      expect(logger['stopReason']).toBeUndefined();
    });

    it('should shallow copy passed in config and not store logger in the config', () => {
      config.logger = console;
      logger = new Logger(config);

      expect(logger.config).not.toBe(config);
      expect(logger.config.logger).toBeUndefined();
      expect(logger['secondaryLogger']).toBe(console);
    });

    it('should use config log level', () => {
      config.logLevel = 'debug';

      logger = new Logger(config);

      expect(logger.config.logLevel).toBe('debug');
    });

    it('should start paused', () => {
      config.startServerLoggingPaused = true;

      logger = new Logger(config);

      expect(logger['stopReason']).toBe('force');
    });

    it('should warn for invalid log level and set to "info"', () => {
      config.logLevel = 'nope' as any;
      config.logger = console;
      jest.spyOn(console, 'warn').mockImplementation();

      logger = new Logger(config);

      expect(logger.config.logLevel).toBe('info');
      expect(console.warn).toHaveBeenCalledWith('[gc-logger-unit-test] Invalid log level: "nope". Default "info" will be used instead.', null);
    });

    it('should not initialize with server logging', () => {
      config.initializeServerLogging = false;

      logger = new Logger(config);

      expect(logger['serverLogger']).toBeFalsy();
    });

    it('should unofficially still support `logTopic`', () => {
      delete config.appName;
      (config as any).logTopic = 'brad-pitt';

      logger = new Logger(config);

      expect(logger.config.appName).toBe('brad-pitt');
    });
  });

  describe('VERSION', () => {
    it('should return the VERSION (static and instance)', () => {
      expect(Logger.VERSION).toBe('__GENESYS_CLOUD_CLIENT_LOGGER_VERSION__');
      expect(logger.VERSION).toBe('__GENESYS_CLOUD_CLIENT_LOGGER_VERSION__');
    });
  });

  describe('setAccessToken()', () => {
    it('should update the access token', () => {
      expect(logger.config.accessToken).toBe(config.accessToken);
      logger.setAccessToken('new-token');
      expect(logger.config.accessToken).toBe('new-token');
    });

    it('should start sending logs again if it stopped because of a 401 error', () => {
      jest.spyOn(logger, 'startServerLogging');
      logger['stopReason'] = '401';

      logger.setAccessToken('new-token');
      expect(logger.startServerLogging).toHaveBeenCalled();
    });
  });

  describe('startServerLogging()', () => {
    it('should clear the stopReason and emit the start event', () => {
      jest.spyOn(logger, 'emit');
      logger['stopReason'] = 'force';

      logger.startServerLogging();

      expect(logger['stopReason']).toBeUndefined();
      expect(logger.emit).toHaveBeenCalledWith('onStart');
    });

    it('should log a warning if serverLogging was not initialized and not emit an event', () => {
      jest.spyOn(logger, 'emit');
      jest.spyOn(logger, 'warn');

      delete logger['serverLogger'];

      logger.startServerLogging();

      expect(logger.emit).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('`startServerLogging` called but the logger instance is not configured'),
        undefined,
        { skipServer: true }
      );
    });
  });

  describe('stopServerLogging()', () => {
    it('should set the stopReason and emit it', () => {
      const stopReason = '404';
      jest.spyOn(logger, 'emit');

      logger.stopServerLogging(stopReason);

      expect(logger['stopReason']).toBe(stopReason);
      expect(logger.emit).toHaveBeenCalledWith('onStop', stopReason);
    });

    it('should not change the reason from "force" if called with a different reason', () => {
      jest.spyOn(logger, 'emit');
      logger['stopReason'] = 'force';

      logger.stopServerLogging('404');

      expect(logger['stopReason']).toBe('force');
      expect(logger.emit).not.toHaveBeenCalled();
    });
  });

  describe('sendAllLogsInstantly()', () => {
    it('should call through to send logs if serverLogging is initialized', () => {
      const spy = jest.spyOn(logger['serverLogger'], 'sendAllLogsInstantly').mockImplementation();
      logger.sendAllLogsInstantly();
      expect(spy).toHaveBeenCalled();
    });

    it('should not call through to send logs if serverLogging is NOT initialized', () => {
      delete logger['serverLogger'];
      const res = logger.sendAllLogsInstantly();
      expect(res).toEqual([]);
      expect('it does not throw "cannot get prop from undefined" error').toBeTruthy();
    });
  });

  describe('log()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      const options = { skipServer: true };
      logger.log('hi there', { obj: 'prop' }, options);
      expect(spy).toHaveBeenCalledWith('log', 'hi there', { obj: 'prop' }, options);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      logger.log('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('log', 'hi there', { obj: 'prop' }, undefined);
    });
  });

  describe('debug()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      const options = { skipServer: true };
      logger.debug('hi there', { obj: 'prop' }, options);
      expect(spy).toHaveBeenCalledWith('debug', 'hi there', { obj: 'prop' }, options);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      logger.debug('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('debug', 'hi there', { obj: 'prop' }, undefined);
    });
  });

  describe('info()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      const options = { skipServer: true };
      logger.info('hi there', { obj: 'prop' }, options);
      expect(spy).toHaveBeenCalledWith('info', 'hi there', { obj: 'prop' }, options);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      logger.info('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('info', 'hi there', { obj: 'prop' }, undefined);
    });
  });

  describe('warn()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      const options = { skipServer: true };
      logger.warn('hi there', { obj: 'prop' }, options);
      expect(spy).toHaveBeenCalledWith('warn', 'hi there', { obj: 'prop' }, options);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      logger.warn('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('warn', 'hi there', { obj: 'prop' }, undefined);
    });
  });

  describe('error()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      const options = { skipServer: true };
      logger.error('hi there', { obj: 'prop' }, options);
      expect(spy).toHaveBeenCalledWith('error', 'hi there', { obj: 'prop' }, options);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'formatMessage' as any).mockImplementation();
      logger.error('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('error', 'hi there', { obj: 'prop' }, undefined);
    });
  });

  describe('logMessage()', () => {
    let logMessageFn: typeof logger['logMessage'];
    let warnSpy: jest.SpyInstance;
    let addLogToSendSpy: jest.SpyInstance;

    beforeEach(() => {
      logMessageFn = logger['logMessage'].bind(logger);
      warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      addLogToSendSpy = jest.spyOn(logger['serverLogger'], 'addLogToSend').mockImplementation();
    });

    it('should not pass undefined to secondary logger', () => {
      const secondaryLoggerSpy = jest.spyOn(logger['secondaryLogger'], 'info');
      logMessageFn('info', 'message', undefined, {});
      expect(secondaryLoggerSpy).toHaveBeenCalledWith('message');
    });

    it('should skip secondaryLogger', () => {
      /* with skipSecondaryLogger = true */
      warnSpy.mockReset();
      logMessageFn('warn', 'skip secondary please', null, { skipSecondaryLogger: true });
      expect(warnSpy).not.toHaveBeenCalled();

      /* with skipSecondaryLogger = false */
      logMessageFn('warn', 'skip secondary please', null, { skipSecondaryLogger: false });
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should stringify output if setting is true', () => {
      logger.config.stringify = true;

      const msg = 'I am logging this';
      const details = { prop: 'And here are some extra details' };
      const options = { skipServer: true };
      logMessageFn('warn', msg, details, options);

      expect(warnSpy).toHaveBeenCalledWith(msg, JSON.stringify(details));
    });

    it('should skip server logging', () => {
      jest.spyOn(console, 'error').mockImplementation();
      /* because of skipServer === true */
      logMessageFn('warn', 'skip server please', null, { skipServer: true });
      expect(addLogToSendSpy).not.toHaveBeenCalled();

      /* because of not having a server logger */
      const serverLogger = logger['serverLogger'];
      delete logger['serverLogger'];
      logMessageFn('warn', 'skip server please', null, { skipServer: false });
      expect(addLogToSendSpy).not.toHaveBeenCalled();
      logger['serverLogger'] = serverLogger;

      /* because too low of a logLevel */
      logger.config.logLevel = 'error';
      logMessageFn('warn', 'skip server please', null, { skipServer: false });
      expect(addLogToSendSpy).not.toHaveBeenCalled();

      /* because logging is turned off */
      logger['stopReason'] = '401';

      logMessageFn('error', 'Bad things happened.', null, { skipServer: false });
      expect(addLogToSendSpy).not.toHaveBeenCalled();
    });

    it('should swallow errors from any custom logger', () => {
      const message = 'People who take care of chickens are literally chicken tenders';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      logger['secondaryLogger'] = function () { } as any; // doesn't implement ILogger

      logMessageFn('info', message, null, { skipServer: false });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error logging using custom logger passed into `genesys-cloud-client-logger`',
        expect.any(Object)
      );
      /* still uploads to server */
      expect(addLogToSendSpy).toHaveBeenCalledWith('info', message, null);
    });

    it('should log to server', () => {
      /* with skipServer = true */
      logMessageFn('warn', 'do not skip server', null, { skipServer: false });
      expect(addLogToSendSpy).toHaveBeenCalledWith('warn', 'do not skip server', null);
    });
  });

  describe('logRank()', () => {
    let logRankFn: typeof logger['logRank'];

    beforeEach(() => {
      logRankFn = logger['logRank'].bind(logger);
    });

    it('should return 0 for log', () => { expect(logRankFn('log')).toBe(0); });
    it('should return 1 for debug', () => { expect(logRankFn('debug')).toBe(1); });
    it('should return 2 for info', () => { expect(logRankFn('info')).toBe(2); });
    it('should return 3 for warn', () => { expect(logRankFn('warn')).toBe(3); });
    it('should return 4 for error', () => { expect(logRankFn('error')).toBe(4); });
    it('should return -1 for all else', () => { expect(logRankFn(undefined)).toBe(-1); });
  });

  describe('defaultFormatter', () => {
    let spy: jest.SpyInstance;

    beforeEach(() => {
      spy = jest.fn();
    });

    it('should skip formatting', () => {
      const msg = 'I am logging this';
      const options: ILogMessageOptions = { skipServer: true, skipDefaultFormatter: true };
      logger['defaultFormatter']('warn', msg, null, options, spy as any);

      expect(spy).toHaveBeenCalledWith();
    });

    it('should prefix the message with the appName if present', () => {
      const msg = 'I am logging this';
      const options = { skipServer: true };
      logger['defaultFormatter']('warn', msg, null, options, spy as any);

      expect(spy).toHaveBeenCalledWith('warn', `[${config.appName}] ${msg}`, null, options);
    });

    it('should not prefix the message with the appName if absent', () => {
      logger.config.appName = null as any;

      const msg = 'I am logging this';
      const options = { skipServer: true };
      logger['defaultFormatter']('warn', msg, null, options, spy as any);

      expect(spy).toHaveBeenCalledWith('warn', `${msg}`, null, options);
    });

    it('should set error details', () => {
      const e = new Error('bad things happen');
      const options = { skipServer: true };
      logger['defaultFormatter']('warn', e, null, options, spy as any);

      expect(spy).toHaveBeenCalledWith('warn', `[${config.appName}] bad things happen`, e, options);
    });
  })

  describe('formatters', () => {
    function myCustomFormatter (
      level: LogLevel,
      message: string | Error,
      details: any | undefined,
      options: ILogMessageOptions,
      next: NextFn
    ) {
      if (message instanceof Error) {
        return next();
      }

      // we want to only log this to the secondary logger (usually the console) and not send this
      // specific log to the server
      if (message.includes('[confidential]')) {
        options.skipServer = true;
        return next(level, 'redacted', details, options);
      }

      // we want to completely silence these messages
      if (message.includes('[top secret]')) {
        return;
      }

      // this formatter doesn't want to do anything special with this log, send it to the next formatter
      next();
    }

    let spy: jest.SpyInstance;

    beforeEach(() => {
      config.formatters = [myCustomFormatter];
      logger = new Logger(config);
      spy = logger['logMessage'] = jest.fn();
    });

    it('next without mutation', () => {
      logger.info('my message');
      expect(spy).toHaveBeenCalledWith('info', `[${config.appName}] my message`, undefined, expect.anything());
    });

    it('next mutated message', () => {
      logger.info('[confidential]');
      expect(spy).toHaveBeenCalledWith('info', `[${config.appName}] redacted`, undefined, expect.anything());
    });

    it('should log nothing', () => {
      logger.info('[top secret]');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});