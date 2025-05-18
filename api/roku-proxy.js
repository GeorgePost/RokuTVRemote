export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  const url = new URL(req.url);
  const rokuIp = url.searchParams.get('ip');
  const command = url.searchParams.get('command');

  if (!rokuIp) {
    return new Response('Missing Roku IP address', { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    let rokuUrl;
    let method;

    // For test connection, use device-info endpoint
    if (!command || command === 'test') {
      rokuUrl = `http://${rokuIp}:8060/query/device-info`;
      method = 'GET';
    } else {
      // For commands, use keypress endpoint
      rokuUrl = `http://${rokuIp}:8060/keypress/${command}`;
      method = 'POST';
    }

    // Forward the request to Roku
    const rokuResponse = await fetch(rokuUrl, {
      method: method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return new Response(null, {
      status: rokuResponse.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
} 