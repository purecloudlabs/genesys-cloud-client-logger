window.logger1 = new GenesysCloudClientLogger({
  accessToken: window.accessToken,
  url: 'https://api.inindca.com/api/v2/diagnostics/trace',
  appVersion: '1.2.3',
  appName: `gc-client-logger-testing--custom-logger-1`,
  logLevel: 'info',
  uploadDebounceTime: 4000,
  debugMode: false,
  // logger: console // default
});

window.logger2 = new GenesysCloudClientLogger({
  accessToken: window.accessToken,
  url: 'https://api.inindca.com/api/v2/diagnostics/trace',
  appVersion: '1.2.3',
  appName: `gc-client-logger-testing--custom-logger-2`,
  logLevel: 'info',
  uploadDebounceTime: 4000,
  debugMode: false,
  logger: logger1
});

window.logger2.log('A message from logger2', ['data', 'barrier'], { skipDefaultFormatter: true });
window.logger1.log('A message from logger1', { hulk: 'Only knows SMASH' }, { skipDefaultFormatter: false });