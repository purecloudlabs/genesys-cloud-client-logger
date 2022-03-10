window.logger = new GenesysCloudClientLogger({
  accessToken: window.accessToken,
  url: 'https://api.inindca.com/api/v2/diagnostics/trace',
  appVersion: '1.2.3',
  appName: `gc-client-logger-testing--stop-logger`,
  logLevel: 'info',
  uploadDebounceTime: 100,
  debugMode: false,
  startServerLoggingPaused: true,
  // logger: console // default
});

['onError', 'onStart', 'onStop'].forEach(event => logger.on(event, (payload) => console.log(`=== [${event}]:`, payload)));

const wait = (ms = 1000) => new Promise(r => setTimeout(r, ms));

async function run () {
  logger.info('This will not go to the server because we started paused');

  logger.startServerLogging();

  logger.info('First log after startServerLogging() sends fine');

  await wait();

  logger.setAccessToken('BAD_TOKEN');
  logger.info('Ut-oh, second log gets a 401 :(');

  await wait();

  if (logger.stopReason != '401') {
    throw new Error('The test broke... fix it.')
  }

  logger.setAccessToken(window.accessToken);
  logger.info('After reseting the token, I send logs again');

  await wait();

  logger.stopServerLogging();
  logger.info('after calling logger.stopServerLoggin(), it stops sending logs');

  await wait();

  logger.setAccessToken(window.accessToken);
  logger.info('even if you reset the access token – still will not send log');

  if (logger.stopReason !== 'force') {
    throw new Error('The test broke... fix it.')
  }

  await wait();

  logger.startServerLogging();

  logger.info('but calling startServerLogging() will start sending logs again');
}

run();