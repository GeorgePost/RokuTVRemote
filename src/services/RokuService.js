class RokuService {
  constructor() {
    this.deviceIP = localStorage.getItem('rokuDeviceIP') || '';
    this.deviceInfo = JSON.parse(localStorage.getItem('rokuDeviceInfo') || 'null');
    this.isScanning = false;
    this.scanAbortController = null;
    this.isHttps = window.location.protocol === 'https:';
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/RokuTVRemote/roku-service-worker.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
          // Wait for the service worker to be ready
          return navigator.serviceWorker.ready;
        })
        .then(() => {
          console.log('Service Worker is active');
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    } else {
      console.error('Service Worker is not supported in this browser');
    }
  }

  checkHttpsWarning() {
    if (this.isHttps) {
      throw new Error(
        'HTTPS Security Notice: This app needs to run over HTTP to communicate with Roku devices.\n\n' +
        'To use this remote, you have two options:\n\n' +
        '1. Run the app locally (Recommended):\n' +
        '   - Visit the GitHub repository\n' +
        '   - Follow the instructions in the README\n\n' +
        '2. Allow insecure content in your browser:\n' +
        '   Chrome/Edge:\n' +
        '   - Click the padlock icon\n' +
        '   - Click "Site Settings"\n' +
        '   - Under "Insecure content", select "Allow"\n' +
        '   - Refresh the page\n\n' +
        '   Firefox:\n' +
        '   - Click the padlock icon\n' +
        '   - Click ">" next to "Connection secure"\n' +
        '   - Click "Disable protection for now"\n' +
        '   - Refresh the page'
      );
    }
  }

  async testConnection(ip, signal) {
    try {
      console.log(`Testing connection to Roku at ${ip}:8060`);
      
      // Wait for service worker to be ready
      if (navigator.serviceWorker && !navigator.serviceWorker.controller) {
        console.log('Waiting for service worker to be ready...');
        await new Promise(resolve => {
          navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        });
      }

      const response = await fetch(`/RokuTVRemote/roku/${ip}/query/device-info`, {
        method: 'GET',
        signal,
        headers: {
          'Connection': 'close'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Could not connect to Roku device at ${ip}:8060`);
      }

      console.log(`Successfully connected to ${ip}:8060`);
      const deviceInfoText = await response.text();
      return {
        success: true,
        deviceInfo: deviceInfoText
      };
    } catch (error) {
      console.error(`Connection test failed for ${ip}:`, error);
      if (error.name === 'AbortError') {
        throw error;
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getLocalIPAddress() {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      return new Promise((resolve) => {
        pc.onicecandidate = (ice) => {
          if (!ice.candidate) return;
          
          // Look for IPv4 local address
          const localIP = ice.candidate.candidate.match(/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)([0-9]{1,3}\.)[0-9]{1,3}/);
          if (localIP) {
            pc.close();
            const baseIP = localIP[0].split('.').slice(0, 3).join('.');
            resolve(baseIP);
          }
        };
      });
    } catch (error) {
      console.warn('Could not get local IP:', error);
      return null;
    }
  }

  async scanNetwork() {
    if (this.isScanning) {
      console.log('Scan already in progress');
      return null;
    }

    this.isScanning = true;
    console.log('Starting network scan for Roku devices...');

    try {
      // Cancel any existing scan
      if (this.scanAbortController) {
        console.log('Cancelling previous scan');
        this.scanAbortController.abort();
      }
      this.scanAbortController = new AbortController();

      // Get local IP range
      const localIPBase = await this.getLocalIPAddress();
      console.log('Detected local network:', localIPBase);

      // Try stored IP first
      if (this.deviceIP) {
        console.log('Trying stored IP:', this.deviceIP);
        try {
          const testResult = await this.testConnection(this.deviceIP, this.scanAbortController.signal);
          if (testResult.success) {
            console.log('Successfully connected to stored device IP');
            this.isScanning = false;
            return this.deviceIP;
          }
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          console.log('Stored IP failed:', error);
        }
      }

      // Prioritize ranges based on local IP
      let ranges = [];
      if (localIPBase) {
        ranges.push(localIPBase);
      }
      // Add fallback ranges
      ranges = ranges.concat([
        '192.168.1',
        '192.168.0',
        '10.0.0',
        '10.0.1',
        '172.16.0'
      ].filter(range => range !== localIPBase));

      console.log('Scanning IP ranges:', ranges);

      const batchSize = 25;
      const batchTimeout = 2000;

      for (const range of ranges) {
        console.log(`Scanning range: ${range}`);
        const ipBatches = [];
        
        for (let i = 1; i < 255; i++) {
          const ip = `${range}.${i}`;
          ipBatches.push(ip);
          
          if (ipBatches.length === batchSize || i === 254) {
            try {
              console.log(`Testing batch of ${ipBatches.length} IPs in range ${range}`);
              const batchPromises = ipBatches.map(ip => 
                this.testConnection(ip, this.scanAbortController.signal)
                  .then(result => ({ ip, result }))
                  .catch(error => {
                    if (error.name === 'AbortError') throw error;
                    return { ip, result: { success: false } };
                  })
              );
              
              const results = await Promise.race([
                Promise.all(batchPromises),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('batch timeout')), batchTimeout)
                )
              ]);

              const foundDevice = results.find(({ result }) => result.success);
              if (foundDevice) {
                console.log('Found Roku device at:', foundDevice.ip);
                const deviceInfoText = foundDevice.result.deviceInfo;
                const modelName = deviceInfoText.match(/<model-name>([^<]+)<\/model-name>/)?.[1];
                const modelNumber = deviceInfoText.match(/<model-number>([^<]+)<\/model-number>/)?.[1];
                const isTV = deviceInfoText.includes('<is-tv>true</is-tv>');
                const requiresPairing = deviceInfoText.includes('<requires-pairing>true</requires-pairing>');

                this.deviceIP = foundDevice.ip;
                this.deviceInfo = {
                  model: modelName,
                  number: modelNumber,
                  isTV,
                  requiresPairing
                };

                localStorage.setItem('rokuDeviceIP', this.deviceIP);
                localStorage.setItem('rokuDeviceInfo', JSON.stringify(this.deviceInfo));
                
                this.scanAbortController.abort();
                this.isScanning = false;
                return this.deviceIP;
              }
            } catch (error) {
              if (error.name === 'AbortError') throw error;
              console.log(`Batch failed in range ${range}:`, error);
            }
            
            ipBatches.length = 0;
          }
        }
      }

      this.isScanning = false;
      throw new Error('No Roku devices found on the network. Please make sure:\n1. Your Roku is turned on\n2. You\'re on the same network as your Roku');
    } catch (error) {
      console.error('Scan error:', error);
      this.isScanning = false;
      if (error.name === 'AbortError') {
        return null;
      }
      throw error;
    } finally {
      this.scanAbortController = null;
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
        'Note: Make sure port 8060 is accessible.\n' +
        'Make sure your device is on the same network as the Roku TV.'
      );

      if (!ip) {
        throw new Error('No IP address provided');
      }

      const testResult = await this.testConnection(ip);
      if (!testResult.success) {
        throw new Error(
          `Could not connect to Roku at ${ip}:8060. Please make sure:\n` +
          '1. The IP address is correct\n' +
          '2. Your Roku is turned on\n' +
          '3. Port 8060 is not blocked\n' +
          '4. You\'re on the same network as your Roku'
        );
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

      const response = await fetch(`/roku/${this.deviceIP}/keypress/${rokuCommand}`, {
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
      const response = await fetch(`/roku/${this.deviceIP}/pair/request`, {
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