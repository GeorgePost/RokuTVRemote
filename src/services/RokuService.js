class RokuService {
  constructor() {
    this.deviceIP = localStorage.getItem('rokuDeviceIP') || '';
    this.deviceInfo = JSON.parse(localStorage.getItem('rokuDeviceInfo') || 'null');
    this.isHttps = window.location.protocol === 'https:';
    this.lastCommandTime = 0;
    this.commandQueue = [];
    this.isProcessingQueue = false;
    this.ws = null;
    // Automatically use WebSocket when on HTTPS
    this.useWebSocket = this.isHttps;
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
      
      if (this.isHttps) {
        // Use proxy for HTTPS
        const response = await fetch(`/api/roku-proxy?ip=${ip}&command=test`, {
          method: 'GET'
        });
        
        if (!response.ok) {
          throw new Error('Connection test failed');
        }
      } else {
        // Direct HTTP request for non-HTTPS
        await fetch(`http://${ip}:8060/query/device-info`, {
          method: 'GET',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      }

      // If we get here, the request succeeded
      console.log('Connection test successful');
      
      const deviceInfo = {
        ip: ip,
        lastConnected: new Date().toISOString(),
        isTV: true
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

  async testWebSocketConnection(ip) {
    return new Promise((resolve) => {
      try {
        // Create WebSocket connection - use proxy for HTTPS
        const wsUrl = this.isHttps 
          ? `wss://${window.location.host}/api/roku-proxy?ip=${ip}`
          : `ws://${ip}:8060`;
        
        const ws = new WebSocket(wsUrl);
        
        // Set timeout for connection attempt
        const timeout = setTimeout(() => {
          ws.close();
          resolve({
            success: false,
            error: 'WebSocket connection timed out. Please check your Roku TV is on and connected to the network.'
          });
        }, 5000);

        ws.onopen = () => {
          clearTimeout(timeout);
          this.ws = ws;
          resolve({
            success: true,
            deviceInfo: {
              ip: ip,
              lastConnected: new Date().toISOString(),
              isTV: true,
              useWebSocket: true
            }
          });
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          console.error('WebSocket error:', error);
          resolve({
            success: false,
            error: 'Could not establish connection to your Roku TV. Please check your network connection and try again.'
          });
        };
      } catch (error) {
        resolve({
          success: false,
          error: this.getFormattedError(error)
        });
      }
    });
  }

  getFormattedError(error) {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return 'Could not connect to Roku device. Please check:\n' +
             '1. The IP address is correct\n' +
             '2. Your Roku is turned on\n' +
             '3. You\'re on the same network as your Roku\n' +
             (this.isHttps ? '4. You\'ve allowed insecure content in your browser settings\n' : '');
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

      // Log the full request details
      const requestDetails = {
        originalCommand: command,
        mappedCommand: rokuCommand,
        deviceIP: this.deviceIP,
        isHttps: this.isHttps,
        timestamp: new Date().toISOString()
      };
      console.log('Command request details:', requestDetails);

      if (this.isHttps) {
        // Use proxy for HTTPS
        const proxyUrl = `/api/roku-proxy?ip=${this.deviceIP}&command=${rokuCommand}`;
        console.log('Sending command via proxy:', {
          url: proxyUrl,
          fullUrl: window.location.origin + proxyUrl
        });

        const response = await fetch(proxyUrl, {
          method: 'GET', // The proxy will convert this to POST for Roku
          mode: 'cors', // We want CORS for proxy requests
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        // Check if response is ok
        const contentType = response.headers.get('content-type');
        let errorText = '';
        
        try {
          // Try to get the response text first
          errorText = await response.text();
          console.log('Raw proxy response:', errorText);
          
          // If it's JSON and the response is not ok, parse it
          if (contentType?.includes('application/json')) {
            const data = JSON.parse(errorText);
            console.log('Proxy response data:', data);
            
            if (!response.ok) {
              throw new Error(data.error || `Command failed: ${response.status}`);
            }
            
            // Log successful response
            console.log('Proxy success response:', data);
          } else if (!response.ok) {
            // If it's not JSON and not ok, throw with the text
            console.error('Non-JSON error response:', errorText);
            throw new Error(`Command failed: ${response.status} - ${errorText.substring(0, 100)}...`);
          }
        } catch (parseError) {
          console.error('Error parsing proxy response:', parseError);
          if (!response.ok) {
            throw new Error(`Command failed: ${response.status} - ${errorText.substring(0, 100)}...`);
          }
        }
      } else {
        // Direct HTTP request for non-HTTPS
        const rokuUrl = `http://${this.deviceIP}:8060/keypress/${rokuCommand}`;
        console.log('Sending direct command to Roku:', {
          url: rokuUrl,
          command: command,
          mappedCommand: rokuCommand
        });

        const response = await fetch(rokuUrl, {
          method: 'POST', // Roku requires POST for keypress
          mode: 'no-cors', // Required for direct Roku requests
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
          },
          body: '' // Roku expects an empty body for POST requests
        });

        console.log('Direct command response:', response);
      }

      this.lastCommandTime = Date.now();
      return true;
    } catch (error) {
      console.error('Command error:', error);
      throw new Error(this.getFormattedError(error));
    }
  }

  mapCommand(command) {
    // Log the command mapping process
    console.log('Mapping command:', command);
    
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

    const mappedCommand = commandMap[command];
    console.log('Command mapped to:', mappedCommand);
    
    return mappedCommand;
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const rokuService = new RokuService();
export default rokuService; 