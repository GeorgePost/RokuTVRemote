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

    // Create a no-cors request to bypass HTTPS restrictions
    const rokuRequest = new Request(rokuUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'close'
      },
      mode: 'no-cors',
      signal: AbortSignal.timeout(2000)
    });
    
    // Send the request
    const response = await fetch(rokuRequest);
    
    // Since we're using no-cors, we need to create a new response
    // that we can modify and send back to the client
    return new Response(response.body, {
      status: response.status || 200,
      headers: {
        'Content-Type': 'application/xml',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Roku request error:', error);
    
    // Return a more detailed error response
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Make sure your Roku device is powered on and on port 8060',
      allowInsecureContent: 'You may need to allow insecure content in your browser settings'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
} 