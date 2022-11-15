# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# [Unreleased](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.2.1...HEAD)

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