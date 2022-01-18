# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# [Unreleased](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v4.0.0...HEAD)
### Changed
* [PCM-1791](https://inindca.atlassian.net/browse/PCM-1791) – migrated to new build pipeline. This repo now uses _gitflow_ to manage development, release, and feature branches.

### Added
* Added static and instance `logger.VERSION` methods.
* Added CDN urls for major and exact version (see the **Install** section of the `README.md`)

# [v4.0.0](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v3.0.0...v4.0.0)
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