/**
 * Cloudflare Worker to check AI API keys.
 * Responds to POST requests at /api/check (or /check if deployed as a standalone worker).
 */

// A map of API providers and their validation logic
const providers = {
    openai: {
        // OpenAI keys usually start with 'sk-'
        apiKeyPattern: /^sk-[a-zA-Z0-9]{20,}T3BlbkFJ[a-zA-Z0-9]{20,}$/,
        // A lightweight endpoint to check for authentication
        validationUrl: 'https://api.openai.com/v1/models',
        // How to use the key for authentication
        authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    },
    anthropic: {
        // Anthropic keys usually start with 'sk-ant-'
        apiKeyPattern: /^sk-ant-api[0-9]{2}-[a-zA-Z0-9_\-]{95}$/,
        // Requires a POST request to validate
        validationUrl: 'https://api.anthropic.com/v1/messages',
        authHeader: (key) => ({
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        }),
        // A minimal body for the POST request
        validationBody: () => JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "." }]
        })
    },
    google: {
        // Google AI Studio keys
        apiKeyPattern: /^AIzaSy[a-zA-Z0-9_\-]{33}$/,
        // Validation URL includes the key
        validationUrl: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        // No special headers needed as key is in URL
        authHeader: () => ({}),
    },
    mistral: {
        // Mistral AI keys
        apiKeyPattern: /^[a-zA-Z0-9]{32}$/,
        validationUrl: 'https://api.mistral.ai/v1/models',
        authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    }
};

/**
 * Identifies the provider for a given API key.
 * @param {string} key The API key.
 * @returns {object|null} The provider object or null if not found.
 */
function identifyProvider(key) {
    for (const providerName in providers) {
        const provider = providers[providerName];
        if (provider.apiKeyPattern.test(key)) {
            return provider;
        }
    }
    // Fallback for OpenAI keys that might not match the strict pattern
    if (key.startsWith('sk-')) return providers.openai;
    return null;
}

/**
 * Checks if a single API key is valid.
 * @param {string} key The API key to validate.
 * @param {string} providerHint A hint from the user about which provider to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the key is valid, false otherwise.
 */
async function checkApiKey(key, providerHint) {
    let provider;
    if (providerHint && providerHint !== 'auto' && providers[providerHint]) {
        provider = providers[providerHint];
    } else {
        provider = identifyProvider(key);
    }

    if (!provider) {
        console.log(`Provider not found for key starting with: ${key.substring(0, 8)}...`);
        return false;
    }

    const url = typeof provider.validationUrl === 'function' ? provider.validationUrl(key) : provider.validationUrl;
    const headers = provider.authHeader(key);
    const body = typeof provider.validationBody === 'function' ? provider.validationBody() : null;
    const method = body ? 'POST' : 'GET';

    // Cloudflare Workers can use `AbortController` to timeout fetch requests.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

    try {
        const response = await fetch(url, {
            method,
            headers,
            body,
            signal: controller.signal // Attach the abort signal to the fetch request
        });
        clearTimeout(timeoutId);
        return response.ok;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.error(`Request timed out for key starting with ${key.substring(0, 8)}...`);
        } else {
            console.error(`Error validating key starting with ${key.substring(0, 8)}...:`, error.message);
        }
        return false;
    }
}

/**
 * The main worker handler.
 * @param {Request} request The incoming request.
 * @returns {Promise<Response>} The response.
 */
async function handleRequest(request) {
    // Define CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*', // Allow any origin
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    try {
        const { keys, provider } = await request.json();
        if (!Array.isArray(keys)) {
            return new Response('Invalid request body: "keys" should be an array.', { status: 400, headers: corsHeaders });
        }

        const validationPromises = keys.map(async (key) => {
            const isValid = await checkApiKey(key, provider);
            return { key, isValid };
        });

        const results = await Promise.all(validationPromises);

        // Add CORS headers to the actual response
        const headers = {
            ...corsHeaders,
            'Content-Type': 'application/json',
        };

        return new Response(JSON.stringify(results), { headers });
    } catch (error) {
        return new Response('Invalid JSON in request body.', { status: 400, headers: corsHeaders });
    }
}

// Export a default object containing the fetch handler
export default {
    async fetch(request, env, ctx) {
        return handleRequest(request);
    },
};