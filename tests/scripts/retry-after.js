let promise = Promise.resolve();

promise.then(() => {
  window.logger1 = new GenesysCloudClientLogger({
    accessToken: window.accessToken,
    url: 'https://api.inindca.com/api/v2/diagnostics/trace',
    appVersion: '2.0.0',
    appName: `gc-client-logger-testing--1`,
    logLevel: 'info',
    uploadDebounceTime: 1,
    debugMode: true
  });

  logger1.info('Logger 1 initialized');

  window.logger2 = new GenesysCloudClientLogger({
    accessToken: window.accessToken,
    url: 'https://api.inindca.com/api/v2/diagnostics/trace',
    appVersion: '2.0.0',
    appName: `gc-client-logger-testing--2`,
    logLevel: 'info',
    uploadDebounceTime: 1,
    debugMode: true
  });

  logger2.info('Logger 2 initialized');

  // postABunchOfLogs(20);
  postABunchOfLogs(200);
});

let count = 1;
const ipsum = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut ac est at velit venenatis egestas at ac est. Cras quis gravida mauris. Fusce efficitur varius urna vel porttitor. Duis velit ante, semper a fermentum aliquet, elementum at turpis. Suspendisse mattis venenatis condimentum. Nam elementum purus sed augue tincidunt, tincidunt egestas dolor vehicula. Interdum et malesuada fames ac ante ipsum primis in faucibus. Quisque eleifend aliquet erat, bibendum tempus mauris tincidunt non. Vestibulum enim turpis, rhoncus vitae tristique in, pellentesque at justo. Fusce quis tellus dapibus, venenatis purus vel, tempus orci. Donec vel ullamcorper neque. Phasellus eleifend sed quam id convallis. Nunc in hendrerit sapien. Ut rhoncus aliquam arcu. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam lacinia tellus at quam sagittis vestibulum. Sed vestibulum libero id mi gravida vulputate. In sed faucibus massa. In et est tincidunt, semper sapien nec, viverra nec. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut ac est at velit venenatis egestas at ac est. Cras quis gravida mauris. Fusce efficitur varius urna vel porttitor. Duis velit ante, semper a fermentum aliquet, elementum at turpis. Suspendisse mattis venenatis condimentum. Nam elementum purus sed augue tincidunt, tincidunt egestas dolor vehicula. Interdum et malesuada fames ac ante ipsum primis in faucibus. Quisque eleifend aliquet erat, bibendum tempus mauris tincidunt non. Vestibulum enim turpis, rhoncus vitae tristique in, pellentesque at justo. Fusce quis tellus dapibus, venenatis purus vel, tempus orci. Donec vel ullamcorper neque. Phasellus eleifend sed quam id convallis. Nunc in hendrerit sapien. Ut rhoncus aliquam arcu. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam lacinia tellus at quam sagittis vestibulum. Sed vestibulum libero id mi gravida vulputate. In sed faucibus massa. In et est tincidunt, semper sapien nec, viverra nec. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut ac est at velit venenatis egestas at ac est. Cras quis gravida mauris. Fusce efficitur varius urna vel porttitor. Duis velit ante, semper a fermentum aliquet, elementum at turpis. Suspendisse mattis venenatis condimentum. Nam elementum purus sed augue tincidunt, tincidunt egestas dolor vehicula. Interdum et malesuada fames ac ante ipsum primis in faucibus. Quisque eleifend aliquet erat, bibendum tempus mauris tincidunt non. Vestibulum enim turpis, rhoncus vitae tristique in, pellentesque at justo. Fusce quis tellus dapibus, venenatis purus vel, tempus orci. Donec vel ullamcorper neque. Phasellus eleifend sed quam id convallis. Nunc in hendrerit sapien. Ut rhoncus aliquam arcu. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam lacinia tellus at quam sagittis vestibulum. Sed vestibulum libero id mi gravida vulputate. In sed faucibus massa. In et est tincidunt, semper sapien nec, viverra nec.';

async function postABunchOfLogs (num = 55) {
  const even = (num % 2) === 0;

  const c = count++;

  for (let i = 0; i < num; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 1);
    });

    if (even) {
      // logger2.info(`Lorum Ipsom [${c}#${i}]`, ipsum);
      logger2.info(`Devices log [${c}#${i}]`, window.devices);
    } else {
      // logger1.info(`Lorum Ipsom [${c}#${i}]`, ipsum);
      logger1.info(`Devices log [${c}#${i}]`, window.devices);
    }
  }
}