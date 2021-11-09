function myCustomFormatter (level, message, details, options, next) {
  // we want to only log this to the secondary logger (usually the console) and not send this 
  // specific log to the server
  if (message.includes('[confidential]')) {
    options.skipServer = true;
    return next(level, 'this message is confidential and redacted', details, options);
  }

  // we want to completely silence these messages
  if (message.includes('[top secret]')) {
    return;
  }

  // this formatter doesn't want to do anything special with this log, send it to the next formatter
  next();
}

function messageFanner (level, message, details, options, next) {
  if (!message.includes('[fanned message]')) {
    return next();
  }

  next(level, 'fanned server message', details, { skipSecondaryLogger: true });
  next(level, 'fanned local message', details, { skipServer: true });
  next(level, 'fanned local message without default formatter', details, { skipServer: true, skipDefaultFormatter: true });
}

window.logger = new GenesysCloudClientLogger({
  accessToken: window.accessToken,
  url: 'https://api.inindca.com/api/v2/diagnostics/trace',
  appVersion: '1.2.3',
  appName: `gc-client-logger-testing--custom-formatter`,
  logLevel: 'info',
  uploadDebounceTime: 4000,
  debugMode: false,
  formatters: [ myCustomFormatter, messageFanner ]
});

logger.info('Logger initialized', logger.config);
setTimeout(() => logger.info('here is a [confidential] message'), 1200);
setTimeout(() => logger.info('here is a [top secret] message'), 2000);
setTimeout(() => logger.info('here is [fanned message]'), 3000);