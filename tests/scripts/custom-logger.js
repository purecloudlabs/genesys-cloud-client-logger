const myLogger = {};

['log', 'debug', 'info', 'warn', 'error'].forEach(level => {
  myLogger[level] = console[level].bind('__my-custom-logger__');
});

window.logger = new GenesysCloudClientLogger({
  accessToken: window.accessToken,
  url: 'https://api.inindca.com/api/v2/diagnostics/trace',
  appVersion: '1.2.3',
  appName: `gc-client-logger-testing--custom-logger`,
  logLevel: 'info',
  uploadDebounceTime: 4000,
  debugMode: false,
  logger: myLogger
});

logger.info('Logger initialized', logger.config);

setTimeout(() => logger.info('another message from the logger here'), 1200);