// Service worker to handle Roku HTTP requests
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  console.log('Service Worker intercepted request:', url.pathname);
  
  // Only intercept Roku-related requests
  if (url.pathname.includes('/roku/')) {
    event.respondWith(handleRokuRequest(event.request));
  }
});

async function handleRokuRequest(request) {
  try {
    // Extract the actual Roku IP and command from the URL
    const url = new URL(request.url);
    const rokuPath = url.pathname.split('/roku/')[1];
    console.log('Processing Roku request:', rokuPath);
    
    if (!rokuPath) {
      throw new Error('Invalid Roku request path');
    }

    const params = rokuPath.split('/');
    const ip = params[0];
    const command = params.slice(1).join('/');
    
    // Construct the actual Roku request URL with port 8060
    const rokuUrl = `http://${ip}:8060/${command}`;
    console.log('Sending request to:', rokuUrl);
    
    // Forward the request to the Roku device
    const response = await fetch(rokuUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'close'
      },
      signal: AbortSignal.timeout(2000)
    });

    const responseText = await response.text();
    console.log('Received response:', response.status, responseText.substring(0, 100));

    // Return the response
    return new Response(responseText, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type'),
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Roku request error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Make sure your Roku device is powered on and on port 8060'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 