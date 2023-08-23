# Changelog
All notable changes to this project will be documented in this file.

# &#x2757;**WARNING**&#x2757;
# *If using `Switcheroo` type accessories, please see [README](https://github.com/iSteve-O/homebridge-multiswitcheroo/blob/OffFix/README.md) note before updating to v2.0!!
# *Version 2.0 contains breaking changes for `Switcheroo` type accessories.


</br>
</br>

## *Version 3.0 is a total re-write for optimization*

</br>

# Changelog
## [3.0.1] - 2023-08-23
### Fixed
- Changed how status polling works to update switch status even when server status has not changed.
- Minor errors in README.md corrected.


## [3.0.0] - 2023-08-21
### Added
- Ability to set `firmwareVersion` in the config.
- Proper error, warning & debug logging (almost).

### Changed
- Removed unnecessary & outdated `require` dependancy. Should clear some install warnings.
- Changed from using deprecated `request` to `axios` for http requests.
- Fixed status polling so each accessory's `statusUrl` is called only once to update all switch statuses, instead of calling once for each switch at the `pollingInterval`.
- Version 3.0 uses about 75% less CPU & 15% less memory, on average, than even v2.0 (based on `top`)!


## [2.0.0] - 2023-08-19
### Changed
- Optimized code to remove unnecessary `Switcheroo` accessory
    (Install [`homebridge-http-switch`](https://github.com/Supereg/homebridge-http-switch/tree/master) to replace functionality as stated in [README](https://github.com/iSteve-O/homebridge-multiswitcheroo/blob/OffFix/README.md)).
- Added ability to create `MultiSwitcheroo` accessories in the ConfigUI.

### Fixed
- Error logging is better now


## [1.0.3] - 2023-07-29
### Changed
- Changed default `manufacturer` and `model`
    (If you do not like them change them in your config).
- Added ChatGPT note to `README.md` file

### Fixed
- Errors in `README.md`


## [1.0.2] - 2023-07-27
### Changed
- Added `displayName` to `package.js` file
- Added `CHANGELOG.md` file

### Fixed
- Errors in & formatting of `README.md`


## [1.0.1] - 2023-07-26
- Initial commit
