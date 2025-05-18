export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Force to run in a specific region
};

// Helper function to create JSON response
const jsonResponse = (data, status = 200, headers = {}) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      ...headers
    }
  });
};

const handler = async (request) => {
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    // Ensure GET method
    if (request.method !== 'GET') {
      return jsonResponse({
        success: false,
        error: 'Method not allowed. Use GET.',
        requestId
      }, 405);
    }

    // Parse request URL
    const url = new URL(request.url);
    const rokuIp = url.searchParams.get('ip');
    const command = url.searchParams.get('command');

    // Validate parameters
    if (!rokuIp) {
      return jsonResponse({
        success: false,
        error: 'Missing Roku IP address',
        requestId
      }, 400);
    }

    if (!rokuIp.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      return jsonResponse({
        success: false,
        error: 'Invalid IP address format',
        requestId
      }, 400);
    }

    // Build Roku URL
    const isTest = !command || command === 'test';
    const rokuUrl = isTest 
      ? `http://${rokuIp}:8060/query/device-info`
      : `http://${rokuIp}:8060/keypress/${encodeURIComponent(command)}`;

    // Log request details
    console.log(`[${requestId}] Sending request to Roku:`, {
      url: rokuUrl,
      method: isTest ? 'GET' : 'POST',
      command,
      ip: rokuIp
    });

    // Make request to Roku
    const rokuResponse = await fetch(rokuUrl, {
      method: isTest ? 'GET' : 'POST',
      headers: {
        'Host': `${rokuIp}:8060`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*'
      },
      body: isTest ? null : '',
      redirect: 'manual'
    });

    // Handle command response
    if (!isTest) {
      if (rokuResponse.status >= 200 && rokuResponse.status < 400) {
        return jsonResponse({
          success: true,
          command,
          requestId,
          timestamp: new Date().toISOString()
        });
      } else {
        return jsonResponse({
          success: false,
          error: `Roku command failed with status ${rokuResponse.status}`,
          command,
          requestId,
          timestamp: new Date().toISOString()
        }, 502);
      }
    }

    // Handle test response - only reached for test requests
    try {
      const text = await rokuResponse.text();
      
      if (!rokuResponse.ok) {
        return jsonResponse({
          success: false,
          error: 'Roku test request failed',
          status: rokuResponse.status,
          response: text,
          requestId
        }, 502);
      }

      if (!text.includes('device-info')) {
        return jsonResponse({
          success: false,
          error: 'Invalid Roku response',
          response: text,
          requestId
        }, 502);
      }

      return jsonResponse({
        success: true,
        command: 'test',
        response: text,
        requestId
      });
    } catch (error) {
      return jsonResponse({
        success: false,
        error: 'Failed to read Roku response',
        details: error.message,
        requestId
      }, 502);
    }
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return jsonResponse({
      success: false,
      error: `Proxy error: ${error.message}`,
      requestId
    }, 500);
  }
};

export default handler; 