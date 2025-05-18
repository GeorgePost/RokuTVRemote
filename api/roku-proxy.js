export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const requestId = Math.random().toString(36).substring(7);
  
  // Common headers for all responses
  const commonHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
  };

  // Helper function to send error response
  const sendError = (status, message) => {
    const errorResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      requestId
    };
    console.error(`[${requestId}] Error response:`, errorResponse);
    return new Response(JSON.stringify(errorResponse), { 
      status,
      headers: commonHeaders
    });
  };

  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...commonHeaders,
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
      return sendError(400, 'Missing Roku IP address');
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(rokuIp)) {
      return sendError(400, 'Invalid IP address format');
    }

    // Construct the absolute Roku URL
    const isTest = !command || command === 'test';
    const rokuUrl = isTest 
      ? `http://${rokuIp}:8060/query/device-info`
      : `http://${rokuIp}:8060/keypress/${encodeURIComponent(command)}`;

    console.log(`[${requestId}] Sending request to Roku:`, {
      url: rokuUrl,
      method: isTest ? 'GET' : 'POST',
      command,
      ip: rokuIp
    });

    try {
      // Create Request object to ensure proper URL handling
      const rokuRequest = new Request(rokuUrl, {
        method: isTest ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*',
          'Host': `${rokuIp}:8060`,
          'Connection': 'keep-alive'
        },
        body: isTest ? undefined : '',
        redirect: 'follow',
        // Important: Don't let the runtime try to resolve the IP as a domain
        mode: 'no-cors',
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      });

      const rokuResponse = await fetch(rokuRequest);

      // For keypress commands, we don't need to wait for or parse the response
      if (!isTest) {
        // If we get here, the request was sent
        return new Response(JSON.stringify({
          success: true,
          command,
          timestamp: new Date().toISOString(),
          requestId,
          message: 'Command sent successfully'
        }), {
          status: 200,
          headers: commonHeaders
        });
      }

      // For test requests, we need to verify the response
      const responseText = await rokuResponse.text();
      
      if (!rokuResponse.ok) {
        throw new Error(`Roku responded with status ${rokuResponse.status}`);
      }

      // Verify it's a valid Roku response
      if (!responseText.includes('device-info')) {
        throw new Error('Invalid Roku response');
      }

      return new Response(JSON.stringify({
        success: true,
        command: 'test',
        response: responseText,
        timestamp: new Date().toISOString(),
        requestId
      }), {
        status: 200,
        headers: commonHeaders
      });

    } catch (error) {
      console.error(`[${requestId}] Roku request failed:`, {
        error: error.message,
        url: rokuUrl,
        command
      });
      
      return sendError(502, `Failed to communicate with Roku at ${rokuIp}: ${error.message}`);
    }
  } catch (error) {
    console.error(`[${requestId}] Proxy error:`, error);
    return sendError(500, `Proxy error: ${error.message}`);
  }
} 