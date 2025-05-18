export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const rokuIp = url.searchParams.get('ip');

  if (!rokuIp) {
    return new Response('Missing Roku IP address', { status: 400 });
  }

  try {
    const upgradeHeader = req.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket connection', { status: 400 });
    }

    // Connect to Roku WebSocket
    const rokuWs = new WebSocket(`ws://${rokuIp}:8060`);
    
    // Create WebSocket pair
    const { 0: clientWs, 1: serverWs } = new WebSocketPair();

    // Forward messages from client to Roku
    clientWs.addEventListener('message', (event) => {
      if (rokuWs.readyState === WebSocket.OPEN) {
        rokuWs.send(event.data);
      }
    });

    // Forward messages from Roku to client
    rokuWs.addEventListener('message', (event) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(event.data);
      }
    });

    // Handle connection close
    clientWs.addEventListener('close', () => rokuWs.close());
    rokuWs.addEventListener('close', () => clientWs.close());

    // Accept the client connection
    serverWs.accept();

    return new Response(null, {
      status: 101,
      webSocket: clientWs,
    });
  } catch (error) {
    return new Response(`Failed to establish connection: ${error.message}`, { 
      status: 500 
    });
  }
} 