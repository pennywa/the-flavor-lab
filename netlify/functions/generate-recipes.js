/**
 * Netlify serverless function to generate recipes using OpenAI API
 * API keys are stored in Netlify environment variables and never exposed to client
 */
exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    if (event.httpMethod !== 'POST') {
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
        const requestData = JSON.parse(event.body);
        const { selectedIngredients, flavorPreferences, dietaryRestrictions, prompt } = requestData;

        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'OpenAI API key not configured' }),
            };
        }

        const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const openaiUrl = 'https://api.openai.com/v1/chat/completions';

        // For GPT-4 models with JSON mode, we need to request an object with a "recipes" key
        // For other models (like gpt-4o-mini), we can request the array directly
        const useJsonMode = openaiModel.toLowerCase().includes('gpt-4') && !openaiModel.toLowerCase().includes('o');
        
        const systemPrompt = useJsonMode
            ? 'You are a helpful recipe generator. Always return ONLY valid JSON objects with a "recipes" key containing an array. No text before or after the JSON. No markdown code blocks. Format: {"recipes": [...]}'
            : 'You are a helpful recipe generator. Always return ONLY valid JSON arrays. No text before or after the JSON. No markdown code blocks. Just the JSON array.';

        const payload = {
            model: openaiModel,
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 6000,
        };

        // Add JSON mode only for GPT-4 models (not GPT-4o which handles arrays better)
        if (useJsonMode) {
            payload.response_format = { type: 'json_object' };
        }

        const response = await fetch(openaiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            const errorMsg = errorData.error?.message || JSON.stringify(errorData);
            return {
                statusCode: response.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: `OpenAI API error: ${errorMsg}` }),
            };
        }

        const data = await response.json();
        
        // Extract content from OpenAI response
        if (data.choices && data.choices.length > 0) {
            let content = data.choices[0].message.content.trim();
            
            // Remove markdown code blocks if present
            if (content.startsWith('```')) {
                content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            }
            
            // Parse JSON
            let recipes;
            try {
                recipes = JSON.parse(content);
                // Handle different response formats
                if (Array.isArray(recipes)) {
                    // Already an array, use as-is
                    // recipes stays as array
                } else if (typeof recipes === 'object' && recipes !== null) {
                    if (recipes.recipes) {
                        // Object with "recipes" key (from JSON mode)
                        recipes = recipes.recipes;
                    } else {
                        // Single recipe object, wrap in array
                        recipes = [recipes];
                    }
                } else {
                    throw new Error(`Unexpected recipe format: ${typeof recipes}`);
                }
                
                // Ensure recipes is an array
                if (!Array.isArray(recipes)) {
                    recipes = recipes ? [recipes] : [];
                }
            } catch (e) {
                // Try to extract JSON array from text
                const firstBracket = content.indexOf('[');
                const lastBracket = content.lastIndexOf(']');
                if (firstBracket >= 0 && lastBracket > firstBracket) {
                    const jsonStr = content.substring(firstBracket, lastBracket + 1);
                    recipes = JSON.parse(jsonStr);
                } else {
                    throw new Error('Failed to parse JSON from OpenAI response');
                }
            }

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ recipes }),
            };
        } else {
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Unexpected response format from OpenAI API' }),
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

