/**
 * A robust wrapper to handle CORS and catch any unhandled exceptions.
 */
const corsWrapper = (handler) => {
    return async (request, env, ctx) => {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            const response = await handler(request, env, ctx);
            const newHeaders = new Headers(response.headers);
            Object.entries(corsHeaders).forEach(([key, value]) => newHeaders.set(key, value));
            return new Response(response.body, { ...response, headers: newHeaders });
        } catch (error) {
            console.error('Unhandled exception in handler:', error);
            return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
        }
    };
};

/**
 * DEBUGGING VERSION of the main handler.
 * This version DOES NOT make any external API calls.
 * It immediately returns a mock "valid" response for any submitted keys.
 * The purpose is to test if the Browser -> Cloudflare Pages -> Cloudflare Function communication link is working correctly without external dependencies.
 */
async function handleRequest(request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { keys } = await request.json();
        if (!Array.isArray(keys)) {
            return new Response('Invalid request body: "keys" must be an array.', { status: 400 });
        }

        // Create a mock success response. The structure matches what the frontend expects.
        const results = keys.map(key => ({ key: key, isValid: true }));

        return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        // This will catch errors if the request body is not valid JSON.
        console.error("Error parsing request body:", error);
        return new Response('Invalid JSON in request body.', { status: 400 });
    }
}

// Export the final handler, wrapped in our robust CORS/error handler.
export default {
    fetch: corsWrapper(handleRequest),
};
