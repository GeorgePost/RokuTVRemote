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

    console.log(`[${requestId}] Preparing Roku request:`, {
      url: rokuUrl,
      method: isTest ? 'GET' : 'POST',
      command,
      ip: rokuIp
    });

    try {
      // Make the request to Roku using native fetch
      const response = await fetch(rokuUrl, {
        method: isTest ? 'GET' : 'POST',
        headers: {
          'Host': `${rokuIp}:8060`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*'
        },
        body: isTest ? null : '',
        // Don't follow redirects
        redirect: 'manual',
        // Don't cache
        cache: 'no-store'
      });

      // For keypress commands, just check if the request went through
      if (!isTest) {
        // Any response from Roku is good for keypresses
        const success = response.status < 400;
        
        if (!success) {
          const text = await response.text();
          return sendError(502, 'Roku command failed', {
            status: response.status,
            response: text
          });
        }

        return new Response(JSON.stringify({
          success: true,
          command,
          timestamp: new Date().toISOString(),
          requestId,
          status: response.status
        }), {
          status: 200,
          headers: commonHeaders
        });
      }

      // For test requests, verify we got XML back
      const text = await response.text();
      
      if (!response.ok) {
        return sendError(502, 'Roku test request failed', {
          status: response.status,
          response: text
        });
      }

      if (!text.includes('device-info')) {
        return sendError(502, 'Invalid Roku response', {
          response: text
        });
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
      console.error(`[${requestId}] Roku request failed:`, {
        error: error.message,
        stack: error.stack,
        url: rokuUrl
      });
      
      return sendError(502, `Failed to communicate with Roku: ${error.message}`, {
        url: rokuUrl,
        command
      });
    }
  } catch (error) {
    console.error(`[${requestId}] Proxy error:`, {
      error: error.message,
      stack: error.stack
    });
    return sendError(500, `Proxy error: ${error.message}`);
  }
} 