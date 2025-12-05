/**
 * Netlify serverless function to fetch images from Pexels API
 * API keys are stored in Netlify environment variables and never exposed to client
 */
exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        const queryParams = event.queryStringParameters || {};
        const query = queryParams.query || '';
        const page = parseInt(queryParams.page || '1', 10);

        if (!query) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Missing query parameter' }),
            };
        }

        const pexelsApiKey = process.env.PEXELS_API_KEY;
        if (!pexelsApiKey) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ imageUrl: null, message: 'Pexels API key not configured' }),
            };
        }

        const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&page=${page}`;

        const response = await fetch(pexelsUrl, {
            headers: {
                'Authorization': pexelsApiKey,
            },
        });

        if (!response.ok) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ imageUrl: null, message: `Pexels API error: ${response.status}` }),
            };
        }

        const data = await response.json();

        if (data.photos && data.photos.length > 0) {
            const imageUrl = data.photos[0].src.large || 
                           data.photos[0].src.original || 
                           data.photos[0].src.medium;
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ imageUrl }),
            };
        } else {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ imageUrl: null }),
            };
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: `Server error: ${error.message}` }),
        };
    }
};

