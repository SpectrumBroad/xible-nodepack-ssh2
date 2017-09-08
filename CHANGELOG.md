# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [0.6.0] - 2017-09-08
### Added
-   Typedefs

### Changed
-   Dependencies are shrinkwrapped on publish.

## [0.5.0] - 2017-04-28
### Added
-   ssh2.client.sftp.copy node.

-   ssh2.client.local node.

-   [LICENSE.md](LICENSE.md) file.

-   [README.md](README.md) file.

### Changed
-   eslint/airbnb is now the default code style.

-   ssh2.client automatically reconnects when required after a disconnect.

### Fixed
-   ssh2.client.disconnect now waits for all connections to actually end before triggering 'done'.

[Unreleased]: https://github.com/SpectrumBroad/xible-nodepack-ssh2/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/SpectrumBroad/xible-nodepack-ssh2/compare/v0.4.0...v0.5.0
