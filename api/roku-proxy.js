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
    console.log(`[${requestId}] Proxy request received:`, {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log(`[${requestId}] Handling CORS preflight request`);
      return new Response(null, {
        status: 204,
        headers: {
          ...commonHeaders,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400'
        }
      });
    }

    const url = new URL(req.url);
    const rokuIp = url.searchParams.get('ip');
    const command = url.searchParams.get('command');

    console.log(`[${requestId}] Request parameters:`, { rokuIp, command });

    if (!rokuIp) {
      return sendError(400, 'Missing Roku IP address');
    }

    let rokuUrl;
    const isTest = !command || command === 'test';

    // For test connection, use device-info endpoint
    if (isTest) {
      rokuUrl = `http://${rokuIp}:8060/query/device-info`;
    } else {
      // For button commands, use keypress endpoint with proper formatting
      rokuUrl = `http://${rokuIp}:8060/keypress/${encodeURIComponent(command)}`;
    }

    console.log(`[${requestId}] Preparing Roku request:`, {
      url: rokuUrl,
      method: isTest ? 'GET' : 'POST',
      command: command,
      isTest: isTest
    });

    // Forward the request to Roku
    const rokuResponse = await fetch(rokuUrl, {
      method: isTest ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Accept': '*/*'
      },
      // For POST requests, send an empty body as required by Roku
      ...(isTest ? {} : { body: '' })
    });

    // Log the complete response details for debugging
    let responseText = '';
    try {
      responseText = await rokuResponse.text();
      console.log(`[${requestId}] Roku raw response text:`, responseText);
    } catch (e) {
      console.error(`[${requestId}] Could not read response text:`, e);
    }

    console.log(`[${requestId}] Roku response details:`, {
      status: rokuResponse.status,
      ok: rokuResponse.ok,
      statusText: rokuResponse.statusText,
      headers: Object.fromEntries(rokuResponse.headers.entries())
    });

    // If the response wasn't ok, throw an error
    if (!rokuResponse.ok) {
      return sendError(
        rokuResponse.status,
        `Roku request failed with status ${rokuResponse.status} (${rokuResponse.statusText}): ${responseText}`
      );
    }

    const successResponse = {
      success: true,
      command: command,
      status: rokuResponse.status,
      response: responseText || null,
      timestamp: new Date().toISOString(),
      requestId
    };

    console.log(`[${requestId}] Sending success response:`, successResponse);

    // For successful responses, return 200 OK
    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: commonHeaders
    });
  } catch (error) {
    console.error(`[${requestId}] Roku proxy error:`, {
      message: error.message,
      stack: error.stack
    });

    return sendError(500, error.message);
  }
} 