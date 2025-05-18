class RokuService {
  constructor() {
    this.deviceIP = localStorage.getItem('rokuDeviceIP') || '';
    this.deviceInfo = JSON.parse(localStorage.getItem('rokuDeviceInfo') || 'null');
    this.isHttps = window.location.protocol === 'https:';
    this.lastCommandTime = 0;
    this.commandQueue = [];
    this.isProcessingQueue = false;
  }

  async discoverDevices() {
    try {
      // Try stored IP first
      if (this.deviceIP) {
        console.log('Trying stored IP:', this.deviceIP);
        const testResult = await this.testConnection(this.deviceIP);
        if (testResult.success) {
          console.log('Successfully connected to stored device IP');
          this.deviceInfo = testResult.deviceInfo;
          localStorage.setItem('rokuDeviceInfo', JSON.stringify(this.deviceInfo));
          return this.deviceIP;
        }
        this.clearDeviceIP(); // Clear invalid stored IP
      }

      // Prompt for IP address
      const ip = prompt(
        'Enter your Roku TV\'s IP address\n\n' +
        'To find your Roku\'s IP address:\n' +
        '1. On your Roku, go to Settings > Network\n' +
        '2. Select "About"\n' +
        '3. Look for "IP address"\n\n' +
        'Example: 192.168.1.100'
      );

      if (!ip) {
        throw new Error('No IP address provided');
      }

      // Validate IP format
      if (!this.isValidIP(ip)) {
        throw new Error('Invalid IP address format. Please enter a valid IPv4 address (e.g., 192.168.1.100)');
      }

      // Test the connection
      const testResult = await this.testConnection(ip);
      if (!testResult.success) {
        throw new Error(testResult.error);
      }

      this.deviceIP = ip;
      this.deviceInfo = testResult.deviceInfo;

      localStorage.setItem('rokuDeviceIP', this.deviceIP);
      localStorage.setItem('rokuDeviceInfo', JSON.stringify(this.deviceInfo));

      return this.deviceIP;
    } catch (error) {
      console.error('Discovery error:', error);
      throw error;
    }
  }

  async testConnection(ip) {
    try {
      console.log(`Testing connection to Roku at ${ip}:8060`);
      
      // Try to fetch device info - with no-cors we can only check if the request doesn't throw
      await fetch(`http://${ip}:8060/query/device-info`, {
        method: 'GET',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // If we get here, the request succeeded (didn't throw)
      console.log('Connection test successful');
      
      // Store a minimal device info object since we can't read the actual response with no-cors
      const deviceInfo = {
        ip: ip,
        lastConnected: new Date().toISOString(),
        isTV: true // Assuming TV for now since we can't detect with no-cors
      };

      return {
        success: true,
        deviceInfo
      };
    } catch (error) {
      console.error(`Connection test failed for ${ip}:`, error);
      return {
        success: false,
        error: this.getFormattedError(error)
      };
    }
  }

  getFormattedError(error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return 'Could not connect to Roku device. Please check:\n' +
             '1. The IP address is correct\n' +
             '2. Your Roku is turned on\n' +
             '3. You\'re on the same network as your Roku\n' +
             '4. You\'ve allowed insecure content in your browser settings';
    }
    return error.message;
  }

  isValidIP(ip) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  async sendCommand(command) {
    if (!this.deviceIP) {
      throw new Error('No Roku device IP set');
    }

    // Add command to queue
    this.commandQueue.push(command);
    
    // Process queue if not already processing
    if (!this.isProcessingQueue) {
      await this.processCommandQueue();
    }
  }

  async processCommandQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    try {
      while (this.commandQueue.length > 0) {
        const command = this.commandQueue.shift();
        await this.executeCommand(command);
        
        // Add a small delay between commands to prevent overwhelming the device
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  async executeCommand(command) {
    try {
      const rokuCommand = this.mapCommand(command);
      if (!rokuCommand) {
        throw new Error('Invalid command');
      }

      // Rate limiting - ensure at least 100ms between commands
      const now = Date.now();
      const timeSinceLastCommand = now - this.lastCommandTime;
      if (timeSinceLastCommand < 100) {
        await new Promise(resolve => setTimeout(resolve, 100 - timeSinceLastCommand));
      }

      // Send command - with no-cors we can only check if it doesn't throw
      await fetch(`http://${this.deviceIP}:8060/keypress/${rokuCommand}`, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.lastCommandTime = Date.now();
      return true;
    } catch (error) {
      console.error('Command error:', error);
      throw new Error(this.getFormattedError(error));
    }
  }

  mapCommand(command) {
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
    return commandMap[command];
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

const rokuService = new RokuService();
export default rokuService; 