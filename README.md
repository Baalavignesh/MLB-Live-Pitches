# MLB Live Pitch Tracker Chrome Extension

A Chrome extension that provides real-time MLB pitch tracking functionality directly on MLB.com game pages. Track every pitch with detailed information including pitch type, speed, location, and results.

## Features

- **Real-Time Pitch Tracking**: Live pitch data for current at-bat including type, speed, and results
- **Strike Zone Visualization**: Interactive strike zone with pitch location plotting
- **Current At-Bat Focus**: Displays current batter vs pitcher matchup with live pitch sequence
- **Delayed Data Queue**: Configurable delay system for pitch reveals (default 6 seconds with +/- controls)
- **Auto-Detection**: Automatically detects MLB.com game pages and injects tracking interface
- **Dual Mode Operation**: Works both as popup extension and injected content on MLB.com pages

## Installation

### Prerequisites
- Google Chrome browser (version 88 or later recommended)
- Internet connection for accessing MLB Stats API

### Step-by-Step Installation

1. **Download the Extension Files**
   - Download all files from this repository
   - Ensure you have all required files: `manifest.json`, `popup.html`, `popup.js`, and `icon.svg`

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Navigate to `chrome://extensions/` in your address bar
   - Or go to Chrome menu → More Tools → Extensions

3. **Enable Developer Mode**
   - In the top-right corner of the Extensions page, toggle on **"Developer mode"**
   - This will reveal additional options for loading unpacked extensions

4. **Load the Extension**
   - Click the **"Load unpacked"** button that appears after enabling Developer mode
   - Browse to the folder containing the extension files
   - Select the folder and click **"Select Folder"** (or "Open" on some systems)

5. **Verify Installation**
   - The extension should now appear in your extensions list
   - You should see "MLB Live Pitch Tracker" with a toggle to enable/disable
   - The extension icon should appear in your Chrome toolbar


## Version Information

- **Current Version**: 1.0
- **Manifest Version**: 3 (Chrome Extensions Manifest V3)
- **Minimum Chrome Version**: 88
- **Last Updated**: September 2025

## Legal Notice

This extension uses publicly available MLB Stats API data. It is not affiliated with or endorsed by Major League Baseball. All MLB team names, logos, and related content are trademarks of their respective organizations.