# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

# [Unreleased](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v3.0.0...HEAD)

# [v3.0.0](https://github.com/purecloudlabs/genesys-cloud-client-logger/compare/v2.0.0...v3.0.0)
### BREAKING CHANGES
* Renamed `ILoggerConfig` option `logTopic` to `appName` to stay more uniform with the addition of `secondaryApp[Name|Version]` fields (see **Added** below).

### Added
* [PCM-1735](https://inindca.atlassian.net/browse/PCM-1735) – Add `secondaryAppName`, `secondaryAppVersion`, `secondaryAppId` to logger constructor.

### Changed
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