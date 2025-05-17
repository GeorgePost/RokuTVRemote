class RokuService {
  constructor() {
    this.deviceIP = localStorage.getItem('rokuDeviceIP') || '';
    this.deviceInfo = JSON.parse(localStorage.getItem('rokuDeviceInfo') || 'null');
    this.isScanning = false;
  }

  async testConnection(ip) {
    try {
      const response = await fetch(`http://${ip}:8060/query/device-info`, {
        method: 'GET',
        timeout: 2000 // Reduced timeout for faster scanning
      });
      
      if (!response.ok) {
        throw new Error('Could not connect to Roku device');
      }

      const deviceInfoText = await response.text();
      return {
        success: true,
        deviceInfo: deviceInfoText
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async scanNetwork() {
    if (this.isScanning) {
      return null;
    }

    this.isScanning = true;
    console.log('Starting network scan for Roku devices...');

    try {
      // Common local IP ranges
      const ranges = [
        '192.168.1',
        '192.168.0',
        '10.0.0',
        '10.0.1',
        '172.16.0'
      ];

      // Try stored IP first
      if (this.deviceIP) {
        const testResult = await this.testConnection(this.deviceIP);
        if (testResult.success) {
          console.log('Successfully connected to stored device IP');
          this.isScanning = false;
          return this.deviceIP;
        }
      }

      // Scan common ports in parallel
      for (const range of ranges) {
        const promises = [];
        for (let i = 1; i < 255; i++) {
          const ip = `${range}.${i}`;
          promises.push(this.testConnection(ip));
          
          // Test 10 IPs at a time to avoid overwhelming the browser
          if (promises.length >= 10) {
            const results = await Promise.all(promises);
            const foundDevice = results.find(result => result.success);
            if (foundDevice) {
              const deviceIP = `${range}.${i - promises.length + results.indexOf(foundDevice) + 1}`;
              console.log('Found Roku device at:', deviceIP);
              this.deviceIP = deviceIP;
              
              // Parse device info
              const deviceInfoText = foundDevice.deviceInfo;
              const modelName = deviceInfoText.match(/<model-name>([^<]+)<\/model-name>/)?.[1];
              const modelNumber = deviceInfoText.match(/<model-number>([^<]+)<\/model-number>/)?.[1];
              const isTV = deviceInfoText.includes('<is-tv>true</is-tv>');
              const requiresPairing = deviceInfoText.includes('<requires-pairing>true</requires-pairing>');

              this.deviceInfo = {
                model: modelName,
                number: modelNumber,
                isTV,
                requiresPairing
              };

              localStorage.setItem('rokuDeviceIP', this.deviceIP);
              localStorage.setItem('rokuDeviceInfo', JSON.stringify(this.deviceInfo));
              
              this.isScanning = false;
              return this.deviceIP;
            }
            promises.length = 0;
          }
        }
      }

      this.isScanning = false;
      throw new Error('No Roku devices found on the network. Please make sure:\n1. Your Roku is turned on\n2. You\'re on the same network as your Roku');
    } catch (error) {
      this.isScanning = false;
      throw error;
    }
  }

  async discoverDevices() {
    try {
      const deviceIP = await this.scanNetwork();
      if (deviceIP) {
        return deviceIP;
      }
      
      // If automatic scanning fails, fall back to manual input
      const ip = prompt(
        'Could not automatically find your Roku device.\n\n' +
        'Please enter your Roku device IP address.\n' +
        'You can find it on your Roku device:\n' +
        '1. Go to Settings > Network\n' +
        '2. Select "About"\n' +
        '3. Look for "IP address"\n\n' +
        'Make sure your device is on the same network as the Roku TV.'
      );

      if (!ip) {
        throw new Error('No IP address provided');
      }

      const testResult = await this.testConnection(ip);
      if (!testResult.success) {
        throw new Error(`Could not connect to Roku at ${ip}. Please make sure:\n1. The IP address is correct\n2. Your Roku is turned on\n3. You're on the same network as your Roku`);
      }

      // Parse device info
      const deviceInfoText = testResult.deviceInfo;
      const modelName = deviceInfoText.match(/<model-name>([^<]+)<\/model-name>/)?.[1];
      const modelNumber = deviceInfoText.match(/<model-number>([^<]+)<\/model-number>/)?.[1];
      const isTV = deviceInfoText.includes('<is-tv>true</is-tv>');
      const requiresPairing = deviceInfoText.includes('<requires-pairing>true</requires-pairing>');

      this.deviceIP = ip;
      this.deviceInfo = {
        model: modelName,
        number: modelNumber,
        isTV,
        requiresPairing
      };

      localStorage.setItem('rokuDeviceIP', this.deviceIP);
      localStorage.setItem('rokuDeviceInfo', JSON.stringify(this.deviceInfo));

      return this.deviceIP;
    } catch (error) {
      console.error('Discovery error:', error);
      throw error;
    }
  }

  async sendCommand(command) {
    if (!this.deviceIP) {
      throw new Error('No Roku device IP set');
    }

    try {
      // First test the connection
      const testResult = await this.testConnection(this.deviceIP);
      if (!testResult.success) {
        // Clear stored IP and info
        this.clearDeviceIP();
        throw new Error('Lost connection to Roku device. Please reconnect.');
      }

      // Map commands to Roku ECP endpoints
      const commandMap = {
        power: 'Power',
        home: 'Home',
        back: 'Back',
        up: 'Up',
        down: 'Down',
        left: 'Left',
        right: 'Right',
        ok: 'Select',
        volume_up: 'VolumeUp',
        volume_down: 'VolumeDown',
        volume_mute: 'VolumeMute',
        play: 'Play',
        pause: 'Play',
        replay: 'InstantReplay',
        rewind: 'Rev',
        forward: 'Fwd',
        voice: 'Search',
        options: 'Info',
        netflix: 'Launch.12',
        disney: 'Launch.529',
        appletv: 'Launch.551728',
        paramount: 'Launch.31440'
      };

      const rokuCommand = commandMap[command];
      if (!rokuCommand) {
        throw new Error('Invalid command');
      }

      const response = await fetch(`http://${this.deviceIP}:8060/keypress/${rokuCommand}`, {
        method: 'POST',
        headers: {
          'Content-Length': '0',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        if (response.status === 403 && this.deviceInfo?.requiresPairing) {
          await this.pairDevice();
          throw new Error('Please check your TV screen and accept the pairing request');
        }
        throw new Error(`Command failed with status ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Command error:', error);
      throw error;
    }
  }

  async pairDevice() {
    if (!this.deviceIP) {
      throw new Error('No Roku device IP set');
    }

    try {
      const response = await fetch(`http://${this.deviceIP}:8060/pair/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        throw new Error('Pairing request failed');
      }

      return {
        success: true,
        message: 'Please check your TV screen and accept the pairing request'
      };
    } catch (error) {
      console.error('Pairing error:', error);
      throw error;
    }
  }

  getDeviceIP() {
    return this.deviceIP;
  }

  getDeviceInfo() {
    return this.deviceInfo;
  }

  clearDeviceIP() {
    this.deviceIP = '';
    this.deviceInfo = null;
    localStorage.removeItem('rokuDeviceIP');
    localStorage.removeItem('rokuDeviceInfo');
  }
}

export default new RokuService(); 