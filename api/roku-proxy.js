export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Force to run in a specific region
};

const handler = async (req) => {
  const requestId = Math.random().toString(36).substring(7);
  
  // Common headers for all responses
  const commonHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache'
  };

  // Helper function to send error response
  const sendError = (status, message, details = {}) => {
    const errorResponse = {
      success: false,
      error: message,
      ...details,
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

    // Parse URL and get parameters
    const reqUrl = new URL(req.url);
    const rokuIp = reqUrl.searchParams.get('ip');
    const command = reqUrl.searchParams.get('command');

    console.log(`[${requestId}] Request received:`, {
      method: req.method,
      url: reqUrl.toString(),
      ip: rokuIp,
      command
    });

    if (!rokuIp) {
      return sendError(400, 'Missing Roku IP address');
    }

    // Validate IP address format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(rokuIp)) {
      return sendError(400, 'Invalid IP address format');
    }

    // Construct the Roku URL
    const isTest = !command || command === 'test';
    const rokuUrl = isTest 
      ? `http://${rokuIp}:8060/query/device-info`
      : `http://${rokuIp}:8060/keypress/${encodeURIComponent(command)}`;

    console.log(`[${requestId}] Sending request to Roku:`, {
      url: rokuUrl,
      method: isTest ? 'GET' : 'POST'
    });

    // Send request to Roku
    const rokuResponse = await fetch(rokuUrl, {
      method: isTest ? 'GET' : 'POST',
      headers: {
        'Host': `${rokuIp}:8060`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: isTest ? null : '',
      redirect: 'manual'
    });

    // For non-test commands, just verify the request was accepted
    if (!isTest) {
      const success = rokuResponse.status >= 200 && rokuResponse.status < 400;
      
      if (!success) {
        return sendError(502, 'Roku command failed', {
          status: rokuResponse.status
        });
      }

      return new Response(JSON.stringify({
        success: true,
        command,
        status: rokuResponse.status,
        timestamp: new Date().toISOString(),
        requestId
      }), {
        status: 200,
        headers: commonHeaders
      });
    }

    // For test requests, verify the response
    const text = await rokuResponse.text();
    
    if (!rokuResponse.ok) {
      return sendError(502, 'Roku test request failed', {
        status: rokuResponse.status
      });
    }

    if (!text.includes('device-info')) {
      return sendError(502, 'Invalid Roku response');
    }

    return new Response(JSON.stringify({
      success: true,
      command: 'test',
      response: text,
      timestamp: new Date().toISOString(),
      requestId
    }), {
      status: 200,
      headers: commonHeaders
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return sendError(500, `Proxy error: ${error.message}`);
  }
};

export default handler; 