# Home Assistant Add-on: LD2450 Zone Manager

Professional mmWave sensor zone configuration for LD2450 devices with enhanced UI and custom branding.

## Installation

Add this repository to your Home Assistant instance:

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2Fld2450-zone-manager)

## Configuration

The add-on has minimal configuration options:

```yaml
log_level: info
```

### Option: `log_level`

The `log_level` option controls the level of log output by the addon and can be changed to be more or less verbose, which might be useful when you are dealing with an unknown issue.

Possible values are:

- `trace`: Show every detail, like all called internal functions.
- `debug`: Shows detailed debug information.
- `info`: Normal (usually) interesting events.
- `notice`: Normal but significant events.
- `warning`: Exceptional occurrences that are not errors.
- `error`: Runtime errors that do not require immediate action.
- `fatal`: Something went terribly wrong. Add-on becomes unusable.

Please note that each level automatically includes log messages from a more severe level too.

## Usage

1. Start the add-on
2. Open the Web UI using the "OPEN WEB UI" button
3. The interface will be available at port 8080
4. Configure your LD2450 devices and create zones using the professional interface

## Features

- **Professional Interface**: Clean, modern design with custom branding
- **Enhanced Zone Management**: Up to 4 detection zones + 2 exclusion zones
- **Real-time Target Tracking**: Live visualization of detected targets
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Themes**: Automatic theme switching with persistence
- **Precise Controls**: Both visual drag-and-drop and manual coordinate entry

## Support

For issues and feature requests, please use the GitHub repository issues page.

## Changelog & Releases

This repository follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Credits

Built to provide a professional alternative to existing mmWave configuration tools with enhanced functionality and custom branding.