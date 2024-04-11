# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# [Unreleased](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/4.2.12...HEAD)

# [4.2.12](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.11...4.2.12)
### Added
* [PCM-2343](https://inindca.atlassian.net/browse/PCM-2343) Added ability to pass in custom headers for telemetry purposes (internal use only).

# [4.2.11](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.10...4.2.11)
### Fixed
* [PCM-2349](https://inindca.atlassian.net/browse/PCM-2349) - Fixed several medium/high/critical Snyk vulnerabilities.

# [4.2.10](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.9...4.2.10)
### Fixed
* [PCM-2312](https://inindca.atlassian.net/browse/PCM-2312) Stop server logging if we get a 403

# [4.2.9](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.8...4.2.9)
### Changed
* [PCM-2296](https://inindca.atlassian.net/browse/PCM-2296) Updated Axios to v1.6.5 to fix Snyk vulnerabilities. 

# [4.2.8](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.7...4.2.8)
### Changed
* [no-jira] Update uuid to v9.0.1

# [4.2.7](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.6...4.2.7)
### Fixed
* [PCM-2262](https://inindca.atlassian.net/browse/PCM-2262) Fixed snyk vulnerability SNYK-JS-AXIOS-6032459

# [4.2.6](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.5...4.2.6)
### Fixed
* [no-jira] Fixed snyk vulnerability

# [4.2.5](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.4...4.2.5)
### Fixed
* [PCM-2238](https://inindca.atlassian.net/browse/PCM-2238) - Made it so checks on the error object were looking for the right things and that we stop logging to the server on a 401.

# [v4.2.4](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.3...v4.2.4)
### Fixed
* [PCM-2088](https://inindca.atlassian.net/browse/PCM-2088) – Allow unique log uploaders (really only useful for internal reasons)

# [4.2.3](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.2...4.2.3)
### Fixed
* [PCM-2075](https://inindca.atlassian.net/browse/PCM-2075) – Respect the retry-after header returned by a 429 response. Handle the case where axios returns an xmlhttprequest as the response object.

# [v4.2.2](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.1...v4.2.2)
### Fixed
* [PCM-2075](https://inindca.atlassian.net/browse/PCM-2075) – Respect the retry-after header returned by a 429 response.

# [v4.2.1](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.0...v4.2.1)
* [PCM-2031](https://inindca.atlassian.net/browse/PCM-2031) – Set the response type as 'text' for uploading logs so ff doesn't throw an error

# [v4.2.0](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.1.1...v4.2.0)
* [PCM-1992](https://inindca.atlassian.net/browse/PCM-1992) – Save logs that were unable to send so they can be sent next time we connect.

# [v4.1.1](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.1.0...v4.1.1)
### Changed
* [ACE-2053](https://inindca.atlassian.net/browse/ACE-2053) – Remove superagent and use axios. Update jest.

# [v4.1.0](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.0.2...v4.1.0)
### Added
* [PCM-1833](https://inindca.atlassian.net/browse/PCM-1833) – Added the ability to stop/stop server logging. See `README` for more information.
    * **New functions**
        * `startServerLogging (): void;`
        * `stopServerLogging (): void;`
        * `sendAllLogsInstantly (): Promise<any>[]`
    * **New events**
        * `logger.on('onError', (error: any) => { });`
        * `logger.on('onStart', () => { });`
        * `logger.on('onStop', (reason: StopReason) => { });`
# [v4.0.2](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.0.1...v4.0.2)
### Changed
* [PCM-1791](https://inindca.atlassian.net/browse/PCM-1791) – migrated to new build pipeline. This repo now uses _gitflow_ to manage development, release, and feature branches.

### Added
* Added static and instance `logger.VERSION` methods.
* Added CDN urls for major and exact version (see the **Install** section of the `README.md`)

# [v4.0.1](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.0.0...v4.0.1)
### Fixed
* [PCM-1786](https://inindca.atlassian.net/browse/PCM-1786) – fixed infinite recursion if an instance of the ClientLogger is passed
  into another instance of the ClientLogger as `options.logger`.
# [v4.0.0](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v3.0.0...v4.0.0)
### BREAKING CHANGES
* Logging interface changed. This applies to *all* logging levels.
``` ts
// old signature
info (message: string | Error, details?: any, skipServer?: boolean): void;

// new signature
info (message: string | Error, details?: any, opts?: ILogMessageOptions): void;
```

### Added
* [PCM-1766](https://inindca.atlassian.net/browse/PCM-1766) – Add log formatters

### Fixed
* [PCM-1641](https://inindca.atlassian.net/browse/PCM-1741) – secondary logger is no longer passed undefined for details

# [v3.0.0](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v2.0.0...v3.0.0)
### BREAKING CHANGES
* Renamed `ILoggerConfig` option `logTopic` to `appName` to stay more uniform with the addition of `originApp[Name|Version|Id]` fields (see **Added** below).

### Added
* [PCM-1735](https://inindca.atlassian.net/browse/PCM-1735) – Add `originAppName`, `originAppVersion`, `originAppId` to logger constructor.
* [PCM-1736](https://inindca.atlassian.net/browse/PCM-1736) – Added `logger: ILogger` to constructor config. If a logger is passed it, it will be used _instead of_ the default `console`.
Note that passing in a logger does not stop the logger from uploading server logs.

### Changed
* [PCM-1665](https://inindca.atlassian.net/browse/PCM-1665) – wrote custom deep clone function and removed `lodash` dependency.
* Changed package.json entry points:
    * `"main"` -> points to commonJS build (unchanged)
    * `"browser"` -> renamed to `"web"` but still points to bundled CDN built file
    * `"module"` -> added esModule build
* Moved to eslint.

# [v2.0.0](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v1.0.3...v2.0.0)
### BREAKING CHANGES

* The `IServerOpts` has been renamed to `ILoggerConfig`
* The config option **`environment`** has been replaced with the **`url`** config option. This will need to be the _full_ url of the endpoint to send logs to. Example: `https://api.example.com/v2/logs`.
* See README for new usage and configuration