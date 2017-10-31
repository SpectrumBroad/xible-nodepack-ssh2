# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased][]
Nothing notable at the moment.

## [0.8.0][] - 2017-10-31
### Changed
-   THe input fields which are required in the editor now have that flag set which keeps them visible in XIBLE versions 0.9.0 and above if the node is not focused.

## [0.7.0][] - 2017-09-08
### Added
-   The ssh2.client.exec node allows commands to run under sudo or another user, by introducing a new "sudo user" field. This makes it easier to write `sudo su - user -c 'command'` commands.

### Fixed
-   ssh2.client.sftp.copy could cause an unexpected 'failure' message when copying many files in multiple directories. This has been fixed by making the copying of files a synchronize task per client.

## [0.6.0][] - 2017-09-08
### Added
-   Typedefs

### Changed
-   Dependencies are shrinkwrapped on publish.

## [0.5.0][] - 2017-04-28
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

[Unreleased]: https://github.com/SpectrumBroad/xible-nodepack-ssh2/compare/v0.8.0...HEAD
[0.8.0]: https://github.com/SpectrumBroad/xible-nodepack-ssh2/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/SpectrumBroad/xible-nodepack-ssh2/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/SpectrumBroad/xible-nodepack-ssh2/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/SpectrumBroad/xible-nodepack-ssh2/compare/v0.4.0...v0.5.0
