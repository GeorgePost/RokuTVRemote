// Service worker to handle Roku HTTP requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only intercept Roku-related requests
  if (url.pathname.includes('/roku/')) {
    event.respondWith(handleRokuRequest(event.request));
  }
});

async function handleRokuRequest(request) {
  try {
    // Extract the actual Roku IP and command from the URL
    const url = new URL(request.url);
    const params = url.pathname.split('/roku/')[1].split('/');
    const ip = params[0];
    const command = params.slice(1).join('/'); // Join the rest of the path
    
    // Construct the actual Roku request URL with port 8060
    const rokuUrl = `http://${ip}:8060/${command}`;
    console.log('Sending request to:', rokuUrl);
    
    // Forward the request to the Roku device
    const response = await fetch(rokuUrl, {
      method: request.method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'close' // Close connection after response
      },
      // Add a timeout
      signal: AbortSignal.timeout(2000)
    });

    // Return the response
    return new Response(await response.text(), {
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