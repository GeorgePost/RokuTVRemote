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
import SearchIcon from '@mui/icons-material/Search';
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
      await RokuService.discoverDevices();
      setIsConnected(true);
      setDeviceInfo(RokuService.getDeviceInfo());
      setSnackbarOpen(true);
    } catch (error) {
      setError('Failed to find Roku device. Make sure it\'s on the same network.');
      setSnackbarOpen(true);
    }
  };

  const handleButtonClick = async (command) => {
    try {
      setError('');
      await RokuService.sendCommand(command);
    } catch (error) {
      let errorMessage = 'Failed to send command. Please try reconnecting.';
      
      if (error.response?.data) {
        errorMessage = error.response.data.details;
        
        // Handle pairing requirement
        if (error.response.data.requiresPairing) {
          try {
            setError('Initiating pairing process...');
            setSnackbarOpen(true);
            
            // Attempt to pair
            const pairResult = await RokuService.pairDevice();
            
            if (pairResult.success) {
              errorMessage = 'Please check your TV screen and accept the pairing request. After accepting, wait a few seconds and try your command again.';
              // Add a visual indicator that we're waiting for pairing
              setError(errorMessage);
              setSnackbarOpen(true);
              return;
            }
          } catch (pairError) {
            errorMessage = 'Failed to initiate pairing. Please ensure your TV is on and try again.';
          }
        }
        
        // Update device info if provided
        if (error.response.data.deviceInfo) {
          setDeviceInfo(error.response.data.deviceInfo);
        }
        
        // Special handling for 403 errors
        if (error.response.status === 403) {
          errorMessage = `${error.response.data.details} Please ensure your TV is not in a system menu and try again.`;
        }
      }
      
      setError(errorMessage);
      setSnackbarOpen(true);
      
      // Only disconnect if it's a network error or 404
      if (!error.response || error.response.status === 404) {
        setIsConnected(false);
      }
    }
  };

  return (
    <>
      <Paper 
        elevation={3}
        sx={{
          padding: 2,
          borderRadius: 10,
          width: '100%',
          maxWidth: 280,
          backgroundColor: '#2F2F2F',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {!isConnected && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleDiscovery}
              fullWidth
              sx={{ borderRadius: 2 }}
            >
              Find Roku Device
            </Button>
          </Box>
        )}

        {/* Top Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <IconButton 
            sx={{ 
              color: 'error.main',
              '&.MuiIconButton-root': { borderRadius: '50%' }
            }}
            onClick={() => handleButtonClick('power')}
          >
            <PowerSettingsNewIcon />
          </IconButton>
          <IconButton sx={{ color: 'white' }}>
            <MicIcon />
          </IconButton>
        </Box>

        {/* Back and Home Buttons */}
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

        {/* Navigation Pad */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          bgcolor: '#5A1E96',
          borderRadius: '50%',
          p: 1
        }}>
          <IconButton onClick={() => handleButtonClick('up')} sx={{ color: 'white' }}>
            <KeyboardArrowUpIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <IconButton onClick={() => handleButtonClick('left')} sx={{ color: 'white' }}>
              <KeyboardArrowLeftIcon />
            </IconButton>
            <Button 
              onClick={() => handleButtonClick('ok')}
              sx={{ 
                minWidth: 40,
                height: 40,
                borderRadius: '50%',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              OK
            </Button>
            <IconButton onClick={() => handleButtonClick('right')} sx={{ color: 'white' }}>
              <KeyboardArrowRightIcon />
            </IconButton>
          </Box>
          <IconButton onClick={() => handleButtonClick('down')} sx={{ color: 'white' }}>
            <KeyboardArrowDownIcon />
          </IconButton>
        </Box>

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
          <IconButton sx={{ color: 'white' }}>
            <ReplayIcon />
          </IconButton>
          <IconButton sx={{ color: 'white' }}>
            <MicIcon />
          </IconButton>
          <IconButton sx={{ color: 'white' }}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        {/* Playback Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2 }}>
          <IconButton sx={{ color: 'white' }}>
            <FastRewindIcon />
          </IconButton>
          <IconButton 
            sx={{ color: 'white' }}
            onClick={() => {
              setIsPlaying(!isPlaying);
              handleButtonClick(isPlaying ? 'pause' : 'play');
            }}
          >
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <IconButton sx={{ color: 'white' }}>
            <FastForwardIcon />
          </IconButton>
        </Box>

        {/* Shortcut Numbers */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button 
            variant="text" 
            sx={{ color: 'white', minWidth: 40 }}
          >
            1
          </Button>
          <Button 
            variant="text" 
            sx={{ color: 'white', minWidth: 40 }}
          >
            2
          </Button>
        </Box>

        {/* Streaming Service Shortcuts */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1 }}>
            <Button 
              variant="contained" 
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={error ? "error" : "success"}
          sx={{ width: '100%' }}
        >
          {error || 'Successfully connected to Roku device!'}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Remote; 