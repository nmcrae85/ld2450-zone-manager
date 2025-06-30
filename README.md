# LD2450 Zone Manager

[![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FYOUR_USERNAME%2Fld2450-zone-manager)

A professional Home Assistant add-on for configuring and managing LD2450 mmWave sensor zones. Built with custom branding and enhanced features that improve upon the Everything Presence Lite configurator.

## Quick Installation

Click the button above or manually add this repository URL to your Home Assistant add-on store:

```
https://github.com/YOUR_USERNAME/ld2450-zone-manager
```

## Installation Steps

1. **Add Repository**:
   - Go to Settings → Add-ons → Add-on Store
   - Click the three dots (⋮) in the top right
   - Select "Repositories"
   - Add: `https://github.com/YOUR_USERNAME/ld2450-zone-manager`

2. **Install Add-on**:
   - Find "LD2450 Zone Manager" in the add-on store
   - Click "Install"
   - Start the add-on
   - Open the Web UI

3. **Configure**:
   - The web interface will be available at `http://homeassistant.local:8080`
   - Enter your Home Assistant details in settings
   - Select your LD2450 device and start configuring zones

## Features

### Enhanced Over Everything Presence Lite

- **Modern Professional Interface**: Clean, responsive design with dark/light themes
- **Advanced Zone Management**: Up to 4 detection zones + 2 exclusion zones with precise coordinate control
- **Real-time Target Tracking**: Live visualization of up to 3 targets with movement trails
- **Professional Branding**: Your own "LD2450 Zone Manager" branding instead of Everything Presence
- **Enhanced UX**: Better modal dialogs, zone previews, and intuitive drag-and-drop zone creation
- **Improved Canvas**: Grid overlay, fullscreen mode, coordinate display, and smooth interactions
- **Settings Management**: Persistent configuration with local storage
- **Mobile Responsive**: Works on tablets and mobile devices

### Core Functionality

- **Visual Zone Creation**: Click and drag to create zones directly on the radar display
- **Precise Coordinate Entry**: Manual coordinate input with real-time preview
- **Live Device Connection**: Connect to Home Assistant for real-time data
- **Zone Persistence**: Save zones directly to your LD2450 device via Home Assistant
- **Target Tracking**: Real-time visualization of detected targets with trails
- **Multi-device Support**: Auto-discovery and selection of LD2450 devices

## Installation & Setup

### Quick Start

1. Open the application at `http://localhost:8080`
2. Click the settings icon in the header
3. Enter your Home Assistant details:
   - **URL**: `http://your-homeassistant:8123`
   - **Token**: Your long-lived access token
4. Select your LD2450 device from the dropdown
5. Start creating zones by clicking "Edit Zones"

### Home Assistant Setup

1. Create a long-lived access token in Home Assistant:
   - Go to Profile → Security → Long-lived access tokens
   - Click "Create Token"
   - Copy the token for use in the app

2. Ensure your LD2450 device is connected via ESPHome and visible in Home Assistant

### Creating Zones

1. **Visual Creation**:
   - Click "Edit Zones" button
   - Click and drag on the radar display to create a zone
   - Adjust coordinates in the zone editor that appears
   - Save the zone

2. **Manual Creation**:
   - Click on any zone card in the zone management panel
   - Enter precise coordinates manually
   - Preview the zone before saving

3. **Zone Types**:
   - **Detection Zones**: Areas where presence should be detected
   - **Exclusion Zones**: Areas to ignore (like ceiling fans)

## Key Improvements Over Everything Presence

### Design & UX
- Modern gradient header with professional branding
- Clean card-based layout with better visual hierarchy
- Responsive grid system that works on all screen sizes
- Smooth animations and transitions
- Better color coding and visual feedback

### Functionality
- More intuitive zone editing with live preview
- Better coordinate display and grid system
- Enhanced target tracking with configurable trails
- Fullscreen canvas mode for detailed work
- Settings persistence across sessions

### Technical
- Pure vanilla JavaScript (no framework dependencies)
- Modern CSS Grid and Flexbox layouts
- Responsive design patterns
- Clean separation of concerns
- Extensible architecture for future features

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Android Chrome)

## Usage Tips

1. **Zone Creation**: Start with larger zones and refine them based on real-world testing
2. **Target Tracking**: Use the trail feature to understand movement patterns
3. **Exclusion Zones**: Create exclusion zones for static objects that trigger false positives
4. **Grid Overlay**: Enable the grid to help with precise zone placement
5. **Fullscreen Mode**: Use fullscreen for detailed zone editing on smaller screens

## Comparison with Everything Presence Lite

| Feature | Everything Presence | LD2450 Zone Manager |
|---------|-------------------|-------------------|
| Branding | Everything Presence | Your own branding |
| Interface | Basic HTML/CSS | Modern professional UI |
| Zone Creation | Click and drag only | Drag + precise manual entry |
| Zone Preview | None | Real-time preview |
| Mobile Support | Limited | Fully responsive |
| Theme Support | None | Light/Dark themes |
| Settings | Basic | Comprehensive with persistence |
| Target Trails | Basic | Configurable with clearing |
| Zone Management | Sequential only | Independent zone editing |

This standalone application gives you complete control over the interface and branding while providing a superior user experience for LD2450 zone configuration.