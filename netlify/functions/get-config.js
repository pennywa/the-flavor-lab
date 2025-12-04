/**
 * Netlify serverless function to securely expose API keys
 * Keys are stored in Netlify environment variables and never exposed in code
 */
exports.handler = async () => {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Allow CORS for frontend
        },
        body: JSON.stringify({
            GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
            GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            PEXELS_API_KEY: process.env.PEXELS_API_KEY || "",
        })
    };
};

