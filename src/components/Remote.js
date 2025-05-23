import React, { useState, useEffect } from 'react';
import { Box, Button, IconButton, Paper, Typography, Snackbar, Alert } from '@mui/material';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import HomeIcon from '@mui/icons-material/Home';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeDownIcon from '@mui/icons-material/VolumeDown';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import MicIcon from '@mui/icons-material/Mic';
import ReplayIcon from '@mui/icons-material/Replay';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RokuService from '../services/RokuService';

const Remote = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const deviceIP = RokuService.getDeviceIP();
    const storedDeviceInfo = RokuService.getDeviceInfo();
    if (deviceIP) {
      setIsConnected(true);
      setDeviceInfo(storedDeviceInfo);
    }
  }, []);

  const getMobileInstructions = () => {
    // Detect browser
    const ua = navigator.userAgent;
    const isSafari = /Safari/i.test(ua) && !/Chrome/i.test(ua);
    const isChrome = /Chrome/i.test(ua);
    const isFirefox = /Firefox/i.test(ua);
    const isSamsung = /SamsungBrowser/i.test(ua);

    if (isSafari) {
      return `To allow insecure content on Safari (iOS):
1. Go to Settings -> Safari
2. Scroll down to "Privacy & Security"
3. Turn off "Prevent Cross-Site Tracking"
4. Return to this app and refresh`;
    } else if (isChrome) {
      return `To allow insecure content on Chrome (Mobile):
1. Tap the three dots (⋮) menu
2. Tap "Site settings"
3. Tap "Insecure content"
4. Select "Allow"
5. Refresh this page`;
    } else if (isFirefox) {
      return `To allow insecure content on Firefox (Mobile):
1. Type "about:config" in the address bar
2. Search for "security.mixed_content.block_active_content"
3. Tap to set it to "false"
4. Return to this app and refresh`;
    } else if (isSamsung) {
      return `To allow insecure content on Samsung Browser:
1. Tap the three dots (⋮) menu
2. Tap "Settings"
3. Tap "Privacy and security"
4. Enable "Allow insecure content"
5. Refresh this page`;
    } else {
      return `To allow insecure content:
1. Open your browser settings
2. Look for "Site settings" or "Privacy & Security"
3. Find and allow "Insecure content" or "Mixed content"
4. Refresh this page`;
    }
  };

  const handleDiscovery = async () => {
    try {
      setError('');
      setIsScanning(true);
      setSnackbarOpen(true);

      await RokuService.discoverDevices();
      setIsConnected(true);
      setDeviceInfo(RokuService.getDeviceInfo());
      setError('');
      setSnackbarOpen(true);
    } catch (error) {
      setError(error.message);
      setSnackbarOpen(true);
    } finally {
      setIsScanning(false);
    }
  };

  const handleButtonClick = async (command) => {
    console.log('Remote: Sending command:', command);
    try {
      setError('');
      
      // Add command timestamp for tracking
      const timestamp = new Date().toISOString();
      console.log(`Remote: Command ${command} started at ${timestamp}`);
      
      await RokuService.sendCommand(command);
      console.log(`Remote: Command ${command} completed successfully`);
      
      // Update play/pause state for media controls
      if (command === 'play' || command === 'pause') {
        setIsPlaying(!isPlaying);
        console.log('Remote: Updated playing state:', !isPlaying);
      }
    } catch (error) {
      console.error('Remote: Command error:', {
        command,
        error: error.message,
        stack: error.stack
      });
      
      setError(error.message);
      setSnackbarOpen(true);
      
      // Only disconnect if it's a network error
      if (error.message.includes('Could not connect to Roku device')) {
        console.log('Remote: Network error detected, disconnecting');
        setIsConnected(false);
        setDeviceInfo(null);
        RokuService.clearDeviceIP(); // Clear stored device info
      }
    }
  };

  return (
    <>
      {!isConnected ? (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Connect to your Roku TV
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            To use this remote, you'll need to enter your Roku TV's IP address.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            To find your Roku's IP address:
            <br />1. On your Roku, go to Settings {'->'} Network
            <br />2. Select "About"
            <br />3. Look for "IP address"
          </Typography>
          <Button
            variant="contained"
            onClick={handleDiscovery}
            disabled={isScanning}
            sx={{ 
              mt: 2,
              bgcolor: '#6200EE',
              '&:hover': { bgcolor: '#7E3FF2' }
            }}
          >
            {isScanning ? 'Connecting...' : 'Enter IP Address'}
          </Button>
        </Box>
      ) : (
        <Paper 
          elevation={3}
          sx={{
            p: 2,
            bgcolor: '#1A1A1A',
            borderRadius: '16px',
            maxWidth: 400,
            mx: 'auto'
          }}
        >
          {/* Device Info */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.75rem'
              }}
            >
              {deviceInfo?.ip || 'Connected'}
            </Typography>
            <IconButton 
              onClick={() => handleButtonClick('power')}
              sx={{ 
                color: '#E91E63',
                '&:hover': { bgcolor: 'rgba(233,30,99,0.1)' }
              }}
            >
              <PowerSettingsNewIcon />
            </IconButton>
          </Box>

          {/* Navigation Controls */}
          <Box sx={{ 
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            mb: 3
          }}>
            {/* D-Pad */}
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: 1,
              width: 'fit-content',
              position: 'relative'
            }}>
              {/* Empty top-left corner */}
              <Box />
              
              {/* Up */}
              <IconButton 
                onClick={() => handleButtonClick('up')}
                sx={{ 
                  bgcolor: '#333',
                  color: 'white',
                  '&:hover': { bgcolor: '#444' },
                  width: 48,
                  height: 48
                }}
              >
                <KeyboardArrowUpIcon />
              </IconButton>
              
              {/* Empty top-right corner */}
              <Box />
              
              {/* Left */}
              <IconButton 
                onClick={() => handleButtonClick('left')}
                sx={{ 
                  bgcolor: '#333',
                  color: 'white',
                  '&:hover': { bgcolor: '#444' },
                  width: 48,
                  height: 48
                }}
              >
                <KeyboardArrowLeftIcon />
              </IconButton>
              
              {/* OK */}
              <IconButton 
                onClick={() => handleButtonClick('ok')}
                sx={{ 
                  bgcolor: '#6200EE',
                  color: 'white',
                  '&:hover': { bgcolor: '#7E3FF2' },
                  width: 48,
                  height: 48,
                  fontSize: '0.875rem'
                }}
              >
                <Typography variant="button" sx={{ fontWeight: 'bold' }}>OK</Typography>
              </IconButton>
              
              {/* Right */}
              <IconButton 
                onClick={() => handleButtonClick('right')}
                sx={{ 
                  bgcolor: '#333',
                  color: 'white',
                  '&:hover': { bgcolor: '#444' },
                  width: 48,
                  height: 48
                }}
              >
                <KeyboardArrowRightIcon />
              </IconButton>
              
              {/* Empty bottom-left corner */}
              <Box />
              
              {/* Down */}
              <IconButton 
                onClick={() => handleButtonClick('down')}
                sx={{ 
                  bgcolor: '#333',
                  color: 'white',
                  '&:hover': { bgcolor: '#444' },
                  width: 48,
                  height: 48
                }}
              >
                <KeyboardArrowDownIcon />
              </IconButton>
              
              {/* Empty bottom-right corner */}
              <Box />
            </Box>
          </Box>

          {/* Back and Home */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <IconButton 
              sx={{ 
                bgcolor: '#1A1A1A',
                color: 'white',
                '&:hover': { bgcolor: '#333' }
              }}
              onClick={() => handleButtonClick('back')}
            >
              <ArrowBackIcon />
            </IconButton>
            <IconButton 
              sx={{ 
                bgcolor: '#1A1A1A',
                color: 'white',
                '&:hover': { bgcolor: '#333' }
              }}
              onClick={() => handleButtonClick('home')}
            >
              <HomeIcon />
            </IconButton>
          </Box>

          {/* Volume Controls */}
          <Box sx={{ 
            position: 'relative', 
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#1A1A1A',
            padding: 1,
            borderRadius: '8px',
            width: '100%',
            zIndex: 1
          }}>
            <IconButton 
              onClick={() => handleButtonClick('volume_down')}
              sx={{ 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <VolumeDownIcon />
            </IconButton>
            <IconButton 
              onClick={() => handleButtonClick('volume_mute')}
              sx={{ 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <VolumeOffIcon />
            </IconButton>
            <IconButton 
              onClick={() => handleButtonClick('volume_up')}
              sx={{ 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <VolumeUpIcon />
            </IconButton>
          </Box>

          {/* Playback Controls */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            mt: 2
          }}>
            <IconButton 
              onClick={() => handleButtonClick('rewind')}
              sx={{ color: 'white' }}
            >
              <FastRewindIcon />
            </IconButton>
            <IconButton 
              onClick={() => handleButtonClick(isPlaying ? 'pause' : 'play')}
              sx={{ color: 'white' }}
            >
              {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
            <IconButton 
              onClick={() => handleButtonClick('forward')}
              sx={{ color: 'white' }}
            >
              <FastForwardIcon />
            </IconButton>
          </Box>

          {/* Additional Controls */}
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            mt: 2
          }}>
            <IconButton 
              onClick={() => handleButtonClick('voice')}
              sx={{ color: 'white' }}
            >
              <MicIcon />
            </IconButton>
            <IconButton 
              onClick={() => handleButtonClick('replay')}
              sx={{ color: 'white' }}
            >
              <ReplayIcon />
            </IconButton>
            <IconButton 
              onClick={() => handleButtonClick('options')}
              sx={{ color: 'white' }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          {/* Streaming Service Shortcuts */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
              <Button 
                variant="contained" 
                onClick={() => handleButtonClick('netflix')}
                sx={{ 
                  bgcolor: '#E50914',
                  minWidth: 100,
                  '&:hover': { bgcolor: '#B2070F' }
                }}
              >
                NETFLIX
              </Button>
              <Button 
                variant="contained" 
                onClick={() => handleButtonClick('disney')}
                sx={{ 
                  bgcolor: '#113CCF',
                  minWidth: 100,
                  '&:hover': { bgcolor: '#0C2A99' }
                }}
              >
                Disney+
              </Button>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
              <Button 
                variant="contained" 
                onClick={() => handleButtonClick('appletv')}
                sx={{ 
                  bgcolor: '#000000',
                  minWidth: 100,
                  '&:hover': { bgcolor: '#333' }
                }}
              >
                Apple TV+
              </Button>
              <Button 
                variant="contained" 
                onClick={() => handleButtonClick('paramount')}
                sx={{ 
                  bgcolor: '#0064FF',
                  minWidth: 100,
                  '&:hover': { bgcolor: '#0046B2' }
                }}
              >
                Paramount+
              </Button>
            </Box>
          </Box>

          {/* Roku Logo */}
          <Box 
            sx={{ 
              bgcolor: '#5A1E96',
              p: 1,
              borderRadius: 1,
              textAlign: 'center',
              mt: 1
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
              Roku
            </Typography>
          </Box>
        </Paper>
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={error ? "error" : isScanning ? "info" : "success"}
          sx={{ width: '100%' }}
        >
          {error || (isScanning ? 'Scanning for Roku devices on your network...' : 'Successfully connected to Roku device!')}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Remote; 