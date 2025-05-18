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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      // For button commands, use keypress endpoint with proper formatting
      rokuUrl = `http://${rokuIp}:8060/keypress/${encodeURIComponent(command)}`;
    }

    console.log('Sending request to Roku:', {
      url: rokuUrl,
      method: isTest ? 'GET' : 'POST',
      command: command
    });

    // Forward the request to Roku
    const rokuResponse = await fetch(rokuUrl, {
      method: isTest ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      },
      // For POST requests, send an empty body as required by Roku
      ...(isTest ? {} : { body: '' })
    });

    // Log the complete response details for debugging
    const responseText = await rokuResponse.text();
    console.log('Roku response:', {
      status: rokuResponse.status,
      ok: rokuResponse.ok,
      body: responseText,
      headers: Object.fromEntries(rokuResponse.headers.entries())
    });

    // If the response wasn't ok, throw an error
    if (!rokuResponse.ok) {
      throw new Error(`Roku request failed with status ${rokuResponse.status}: ${responseText}`);
    }

    // For successful responses, return 200 OK
    return new Response(JSON.stringify({ 
      success: true,
      command: command,
      status: rokuResponse.status 
    }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
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