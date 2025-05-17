# Roku Web Remote

A web-based remote control application for Roku devices, built with React and Material-UI.

## Features

- Modern, responsive UI matching the physical Roku remote
- Support for all basic Roku commands (power, navigation, volume, etc.)
- Quick launch buttons for popular streaming services
- Automatic pairing support for newer Roku TVs
- Dark theme with Roku's signature purple accents

## Prerequisites

Before using the app, you'll need:

1. A Roku device (TV or streaming device) on your local network
2. The IP address of your Roku device (see below)
3. Node.js and npm installed on your development machine

### Finding Your Roku's IP Address

You can find your Roku device's IP address in one of these ways:

1. **On your Roku device**:
   - Go to Settings > Network
   - Select "About"
   - Look for "IP address"

2. **Using your router**:
   - Log into your router's admin interface
   - Look for connected devices or DHCP clients
   - Find the device named "Roku"

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/GeorgePost/RokuTVRemote.git
   cd roku-web-remote
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

The application is deployed using GitHub Pages. You can access the live version at:
[https://georgepost.github.io/RokuTVRemote](https://georgepost.github.io/RokuTVRemote)

To deploy your own version:

1. Fork this repository
2. Update the `homepage` field in `package.json` with your GitHub Pages URL
3. Run the deployment command:
   ```bash
   npm run deploy
   ```

Note: Make sure your Roku device and the device running the web app are on the same local network for the remote to work.

## Usage

1. When you first open the app, you'll be prompted to enter your Roku device's IP address
2. Once connected, you can use all remote functions just like a physical remote
3. For newer Roku TVs that require pairing:
   - The app will automatically send a pairing request
   - Accept the pairing request on your TV screen
   - After pairing, all remote functions will work normally

## Supported Commands

- Power on/off
- Navigation (up, down, left, right, OK)
- Volume control
- Home and Back
- Playback controls (play/pause, forward, rewind)
- Voice search button
- Quick launch buttons for:
  - Netflix
  - Disney+
  - Apple TV+
  - Paramount+

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
