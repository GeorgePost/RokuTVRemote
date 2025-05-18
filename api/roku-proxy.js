export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const rokuIp = url.searchParams.get('ip');
  const command = url.searchParams.get('command');

  if (!rokuIp) {
    return new Response('Missing Roku IP address', { status: 400 });
  }

  try {
    // Forward the request to Roku
    const rokuResponse = await fetch(`http://${rokuIp}:8060/keypress/${command}`, {
      method: 'POST',
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