import { Logger } from '../src/logger';
import { ILoggerConfig } from '../src/interfaces';
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

  describe('setAccessToken()', () => {
    it('should update the access token', () => {
      expect(logger.config.accessToken).toBe(config.accessToken);
      logger.setAccessToken('new-token');
      expect(logger.config.accessToken).toBe('new-token');
    });
  });

  describe('log()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.log('hi there', { obj: 'prop' }, true);
      expect(spy).toHaveBeenCalledWith('log', 'hi there', { obj: 'prop' }, true);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.log('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('log', 'hi there', { obj: 'prop' }, false);
    });
  });

  describe('debug()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.debug('hi there', { obj: 'prop' }, true);
      expect(spy).toHaveBeenCalledWith('debug', 'hi there', { obj: 'prop' }, true);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.debug('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('debug', 'hi there', { obj: 'prop' }, false);
    });
  });

  describe('info()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.info('hi there', { obj: 'prop' }, true);
      expect(spy).toHaveBeenCalledWith('info', 'hi there', { obj: 'prop' }, true);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.info('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('info', 'hi there', { obj: 'prop' }, false);
    });
  });

  describe('warn()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.warn('hi there', { obj: 'prop' }, true);
      expect(spy).toHaveBeenCalledWith('warn', 'hi there', { obj: 'prop' }, true);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.warn('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('warn', 'hi there', { obj: 'prop' }, false);
    });
  });

  describe('error()', () => {
    it('should call through with params', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.error('hi there', { obj: 'prop' }, true);
      expect(spy).toHaveBeenCalledWith('error', 'hi there', { obj: 'prop' }, true);
    });

    it('should call through with defaults', () => {
      const spy = jest.spyOn(logger, 'logMessage' as any).mockImplementation();
      logger.error('hi there', { obj: 'prop' });
      expect(spy).toHaveBeenCalledWith('error', 'hi there', { obj: 'prop' }, false);
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

    it('should prefix the message with the appName if present', () => {
      const msg = 'I am logging this';
      logMessageFn('warn', msg, null, true);

      expect(warnSpy).toHaveBeenCalledWith(`[${config.appName}] ${msg}`, null);
    });

    it('should not prefix the message with the appName if absent', () => {
      logger.config.appName = null as any;

      const msg = 'I am logging this';
      logMessageFn('warn', msg, null, true);

      expect(warnSpy).toHaveBeenCalledWith(`${msg}`, null);
    });

    it('should stringify output if setting is true', () => {
      logger.config.stringify = true;

      const msg = 'I am logging this';
      const details = { prop: 'And here are some extra details' };
      logMessageFn('warn', msg, details, true);

      expect(warnSpy).toHaveBeenCalledWith(`[${config.appName}] ${msg}`, JSON.stringify(details));
    });

    it('should set error details', () => {
      const e = new Error('bad things happen');
      logMessageFn('warn', e, null, true);

      expect(warnSpy).toHaveBeenCalledWith(`[${config.appName}] bad things happen`, e);
    });

    it('should skip server logging', () => {
      /* with skipServer = true */
      logMessageFn('warn', 'skip server please', null, true);
      expect(addLogToSendSpy).not.toHaveBeenCalled();

      /* with skipServer = true */
      const serverLogger = logger['serverLogger'];
      delete logger['serverLogger'];
      logMessageFn('warn', 'skip server please', null, false);
      expect(addLogToSendSpy).not.toHaveBeenCalled();
      logger['serverLogger'] = serverLogger;


      /* with skipServer = true */
      logger.config.logLevel = 'error';
      logMessageFn('warn', 'skip server please', null, false);
      expect(addLogToSendSpy).not.toHaveBeenCalled();
    });

    it('should swallow errors from any custom logger', () => {
      const message = 'People who take care of chickens are literally chicken tenders';
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      logger['secondaryLogger'] = function () { } as any; // doesn't implement ILogger

      logMessageFn('info', message, null, false);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error logging using custom logger passed into `genesys-cloud-client-logger`',
        expect.any(Object)
      );
      /* still uploads to server */
      expect(addLogToSendSpy).toHaveBeenCalledWith('info', `[${config.appName}] ${message}`, null);
    });

    it('should log to server', () => {
      /* with skipServer = true */
      logMessageFn('warn', 'do not skip server', null, false);
      expect(addLogToSendSpy).toHaveBeenCalledWith('warn', `[${config.appName}] do not skip server`, null);
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
});