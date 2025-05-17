class RokuService {
  constructor() {
    this.deviceIP = localStorage.getItem('rokuDeviceIP') || '';
    this.deviceInfo = JSON.parse(localStorage.getItem('rokuDeviceInfo') || 'null');
  }

  async discoverDevices() {
    try {
      // Since we can't do SSDP discovery from the browser,
      // we'll need the user to input the Roku IP address
      const ip = prompt('Please enter your Roku device IP address:');
      if (!ip) {
        throw new Error('No IP address provided');
      }

      // Verify the IP by trying to get device info
      const deviceInfoResponse = await fetch(`http://${ip}:8060/query/device-info`);
      if (!deviceInfoResponse.ok) {
        throw new Error('Could not connect to Roku device at this IP');
      }

      const deviceInfoText = await deviceInfoResponse.text();
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

      // Try both HTTP and HTTPS
      const protocols = ['http', 'https'];
      let lastError = null;

      for (const protocol of protocols) {
        try {
          const response = await fetch(`${protocol}://${this.deviceIP}:8060/keypress/${rokuCommand}`, {
            method: 'POST',
            headers: {
              'Content-Length': '0',
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });

          if (!response.ok) {
            // If we get a 403 and haven't tried pairing
            if (response.status === 403 && this.deviceInfo?.requiresPairing) {
              await this.pairDevice();
              throw new Error('Please check your TV screen and accept the pairing request');
            }
            throw new Error(`Command failed with status ${response.status}`);
          }

          return true;
        } catch (error) {
          lastError = error;
          if (error.message.includes('pairing')) {
            throw error;
          }
        }
      }

      throw lastError;
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