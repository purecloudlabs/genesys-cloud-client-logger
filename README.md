# Genesys Cloud Client Logger
Logger to send client logs to a remote server.

See [CHANGELOG.md](CHANGELOG.md) for version updates.

### Install

``` sh
npm install genesys-cloud-client-logger
```

### Basic Concept
Each Logger instance will have it's own configuration meaning you can have multiple apps using their own individual loggers. One thing to note is the loggers
will share a "log-uploader" for each given `url`. For example, if `app1` and `app2` both POST logs to the same endpoint, they will have their own logger and
config, but will share the same uploader. Meaning only one POST request will happen at a time. This is to help reduce rate limiting by having multiple loggers
all sending POST requests to the same endpoint at the same time.


### Usage
``` ts
import { Logger } from 'genesys-cloud-client-logger';

const logger = new Logger({
  url: 'https://yoursite.com/logs',
  accessToken: 'your-access-token',
  appVersion: '1.2.3',
  logTopic: 'your-client-app1'
});

logger.info('Logger initialized');
```

Available options and their defaults:

``` ts
interface ILoggerConfig {
  /** JWT access token to use in HTTP request */
  accessToken: string;
  /**
   * url to send the logs to (note this needs to be the full URL)
   * an HTTP `POST` request will be issued to this url
   */
  url: string;
  /** version of app using the logging library */
  appVersion: string;
  /** all local logs will be prefixed by this. */
  logTopic: string;
  /** initialize server logging. defaults to `true` */
  initializeServerLogging?: boolean;
  /** logs at this level or high get sent to the server. defaults to 'info' */
  logLevel?: 'log' | 'debug' | 'info' | 'warn' | 'error';;
  /** time to debounce logs uploads to the server. defaults to 4000 */
  uploadDebounceTime?: number;
  /** debug logger events. defaults to `false` */
  debugMode?: boolean;
  /** stringify log details when writing to console. defaults to `false` */
  stringify?: boolean;
}
```