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
    try {
      setError('');
      await RokuService.sendCommand(command);
      
      // Update play/pause state for media controls
      if (command === 'play' || command === 'pause') {
        setIsPlaying(!isPlaying);
      }
    } catch (error) {
      setError(error.message);
      setSnackbarOpen(true);
      
      // Only disconnect if it's a network error
      if (error.message.includes('Could not connect to Roku device')) {
        setIsConnected(false);
        setDeviceInfo(null);
      }
    }
  };

  return (
    <>
      {!isConnected ? (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Connect to your Roku TV
          </Typography>
          <Button
            variant="contained"
            onClick={handleDiscovery}
            disabled={isScanning}
            sx={{ mt: 2 }}
          >
            {isScanning ? 'Connecting...' : 'Connect'}
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
            gap: 1,
            mb: 3
          }}>
            {/* D-Pad */}
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1,
              width: 'fit-content'
            }}>
              {/* Up */}
              <Box sx={{ gridColumn: '2' }}>
                <IconButton 
                  onClick={() => handleButtonClick('up')}
                  sx={{ 
                    bgcolor: '#333',
                    color: 'white',
                    '&:hover': { bgcolor: '#444' }
                  }}
                >
                  <KeyboardArrowUpIcon />
                </IconButton>
              </Box>
              
              {/* Left */}
              <IconButton 
                onClick={() => handleButtonClick('left')}
                sx={{ 
                  bgcolor: '#333',
                  color: 'white',
                  '&:hover': { bgcolor: '#444' }
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
                  '&:hover': { bgcolor: '#7E3FF2' }
                }}
              >
                <Typography variant="button">OK</Typography>
              </IconButton>
              
              {/* Right */}
              <IconButton 
                onClick={() => handleButtonClick('right')}
                sx={{ 
                  bgcolor: '#333',
                  color: 'white',
                  '&:hover': { bgcolor: '#444' }
                }}
              >
                <KeyboardArrowRightIcon />
              </IconButton>
              
              {/* Down */}
              <Box sx={{ gridColumn: '2' }}>
                <IconButton 
                  onClick={() => handleButtonClick('down')}
                  sx={{ 
                    bgcolor: '#333',
                    color: 'white',
                    '&:hover': { bgcolor: '#444' }
                  }}
                >
                  <KeyboardArrowDownIcon />
                </IconButton>
              </Box>
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