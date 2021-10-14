window.pLogger = new GenesysCloudClientLogger({
  accessToken: window.accessToken,
  url: 'https://api.inindca.com/api/v2/diagnostics/trace',
  appVersion: '1.2.3',
  appName: `gc-client-logger-testing--parent`,
  logLevel: 'info',
  uploadDebounceTime: 4000,
  debugMode: true
});

pLogger.info('Parent Logger initialized', { config: pLogger.config, clientId: pLogger.clientId });

window.cLogger = new GenesysCloudClientLogger({
  accessToken: window.accessToken,
  url: 'https://api.inindca.com/api/v2/diagnostics/trace',
  appVersion: '4.5.6',
  appName: `gc-client-logger-testing--child`,
  originAppName: pLogger.config.appName,
  originAppVersion: pLogger.config.appVersion,
  originAppId: pLogger.clientId,
  logLevel: 'info',
  uploadDebounceTime: 4000,
  debugMode: true
});

cLogger.info('Child Logger initialized', { config: cLogger.config, clientId: cLogger.clientId });

setTimeout(() => pLogger.info('a message from the parent here'), 4010);
setTimeout(() => cLogger.info('a message from the child here'), 4050);