export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  console.log('Proxy request received:', {
    method: req.method,
    url: req.url
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }

  const url = new URL(req.url);
  const rokuIp = url.searchParams.get('ip');
  const command = url.searchParams.get('command');

  console.log('Request parameters:', { rokuIp, command });

  if (!rokuIp) {
    console.error('Missing Roku IP address');
    return new Response(JSON.stringify({ error: 'Missing Roku IP address' }), { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }

  try {
    let rokuUrl;
    const isTest = !command || command === 'test';

    // For test connection, use device-info endpoint
    if (isTest) {
      rokuUrl = `http://${rokuIp}:8060/query/device-info`;
    } else {
      // For button commands, use keypress endpoint
      rokuUrl = `http://${rokuIp}:8060/keypress/${command}`;
    }

    // Add timestamp to prevent caching
    rokuUrl += `?_t=${Date.now()}`;

    console.log('Sending request to Roku:', {
      url: rokuUrl,
      method: isTest ? 'GET' : 'POST'
    });

    // Forward the request to Roku
    const rokuResponse = await fetch(rokuUrl, {
      method: isTest ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    // Get response content if it's a test request
    let responseContent = null;
    if (isTest) {
      responseContent = await rokuResponse.text();
    }

    // Log the Roku response
    console.log('Roku response:', {
      status: rokuResponse.status,
      ok: rokuResponse.ok,
      content: responseContent,
      headers: Object.fromEntries(rokuResponse.headers.entries())
    });

    // If the response wasn't ok, throw an error
    if (!rokuResponse.ok) {
      throw new Error(`Roku request failed with status ${rokuResponse.status}`);
    }

    // Send success response
    return new Response(JSON.stringify({ 
      success: true,
      rokuStatus: rokuResponse.status,
      command: command,
      deviceInfo: isTest ? responseContent : undefined
    }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Roku proxy error:', {
      message: error.message,
      stack: error.stack
    });

    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to communicate with Roku device',
      timestamp: new Date().toISOString(),
      command: command
    }), { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
} 