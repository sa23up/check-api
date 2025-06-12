/**
 * A wrapper to handle CORS preflight (OPTIONS) requests and add CORS headers to responses.
 * @param {function} handler The original request handler.
 * @returns {function} A new handler that includes CORS logic.
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
            Object.entries(corsHeaders).forEach(([key, value]) => {
                newHeaders.set(key, value);
            });
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            });
        } catch (error) {
            console.error('Unhandled error in request handler:', error);
            return new Response('Internal Server Error', { status: 500, headers: corsHeaders });
        }
    };
};

/**
 * Checks if a single Google Gemini API key is valid.
 * @param {string} key The API key to validate.
 * @returns {Promise<boolean>} A promise that resolves to true if the key is valid, false otherwise.
 */
async function checkGeminiApiKey(key) {
    // Google AI Studio keys typically start with "AIzaSy".
    if (!key.startsWith('AIzaSy')) {
        return false;
    }
    
    const validationUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    try {
        const response = await fetch(validationUrl, {
            method: 'GET',
            signal: controller.signal
        });
        return response.ok;
    } catch (error) {
        console.error(`Error validating Gemini key starting with ${key.substring(0, 8)}...:`, error.message);
        return false;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * The main worker handler for checking Gemini keys.
 * @param {Request} request The incoming request.
 * @returns {Promise<Response>} The response.
 */
async function handleRequest(request) {
    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { keys } = await request.json();
        if (!Array.isArray(keys)) {
            return new Response('Invalid request body: "keys" should be an array.', { status: 400 });
        }

        const validationPromises = keys.map(async (key) => {
            const isValid = await checkGeminiApiKey(key);
            return { key, isValid };
        });

        const results = await Promise.all(validationPromises);

        return new Response(JSON.stringify(results), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error("Error parsing JSON or processing request:", error);
        return new Response('Invalid JSON in request body.', { status: 400 });
    }
}

// Export a default object containing the fetch handler, wrapped in the CORS handler.
export default {
    fetch: corsWrapper(handleRequest),
};
