/**
 * Recipe Generator - Simple AI-Powered Recipe Generation
 * Takes selected ingredients, flavor preferences, and dietary restrictions
 * Generates recipes using Google Gemini AI and displays them in the UI
 */

// Configuration from config.js
const CONFIG_LOADED = typeof CONFIG !== 'undefined' ? CONFIG : {
    GEMINI_API_KEY: '',
    GEMINI_MODEL: 'gemini-2.5-flash'
};

const GEMINI_API_KEY = CONFIG_LOADED.GEMINI_API_KEY;
const GEMINI_MODEL = CONFIG_LOADED.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Build the prompt for Gemini AI
 */
function buildRecipePrompt(selectedIngredients, flavorPreferences, dietaryRestrictions) {
    const ingredientsList = selectedIngredients.map(ing => ing.replace(/_/g, ' ')).join(', ');
    
    // Build dietary restrictions text
    const dietaryText = dietaryRestrictions.length > 0 
        ? `Dietary requirements: ${dietaryRestrictions.join(', ')}.`
        : 'No specific dietary restrictions.';
    
    return `Return ONLY a JSON array. No text before. No text after. No explanations. No markdown. Just the JSON array starting with [ and ending with ].

CRITICAL: Generate EXACTLY 5 COMPLETE recipes. Each recipe MUST be fully complete with ALL fields (name, ingredients, steps, prepTime, cookTime, flavorScores). Do not truncate or cut off any recipe.

Each recipe MUST include ALL ingredients: ${ingredientsList}
${dietaryText}

FLAVOR PREFERENCES (scale 1-5, where 3 is neutral/standard):
- Umami/Savory: ${flavorPreferences.umami} (3 = neutral, 1-2 = less umami, 4-5 = more umami)
- Sweet: ${flavorPreferences.sweet} (3 = neutral, 1-2 = less sweet, 4-5 = more sweet)
- Spice: ${flavorPreferences.spice} (3 = neutral, 1-2 = less spicy, 4-5 = more spicy)
- Sour/Tangy: ${flavorPreferences.sour} (3 = neutral, 1-2 = less sour, 4-5 = more sour)
- Salty: ${flavorPreferences.salty} (3 = neutral, 1-2 = less salty, 4-5 = more salty)

IMPORTANT: For each recipe, include a "flavorScores" field that rates how well the recipe matches each preference on a scale of 1-5:
- 1 = Very low/weak in this flavor
- 2 = Low/weak in this flavor
- 3 = Moderate/neutral in this flavor
- 4 = High/strong in this flavor
- 5 = Very high/very strong in this flavor

JSON format:
[
  {
    "name": "Recipe Name",
    "ingredients": ["${selectedIngredients[0] || 'ingredient1'}", "other"],
    "steps": ["Step 1", "Step 2"],
    "prepTime": 15,
    "cookTime": 20,
    "flavorScores": {
      "umami": 4,
      "sweet": 2,
      "spice": 3,
      "sour": 3,
      "salty": 3
    }
  },
  {
    "name": "Recipe Name",
    "ingredients": ["${selectedIngredients[0] || 'ingredient1'}", "other"],
    "steps": ["Step 1", "Step 2"],
    "prepTime": 15,
    "cookTime": 20,
    "flavorScores": {
      "umami": 3,
      "sweet": 4,
      "spice": 2,
      "sour": 2,
      "salty": 3
    }
  },
  {
    "name": "Recipe Name",
    "ingredients": ["${selectedIngredients[0] || 'ingredient1'}", "other"],
    "steps": ["Step 1", "Step 2"],
    "prepTime": 15,
    "cookTime": 20,
    "flavorScores": {
      "umami": 3,
      "sweet": 3,
      "spice": 5,
      "sour": 2,
      "salty": 3
    }
  },
  {
    "name": "Recipe Name",
    "ingredients": ["${selectedIngredients[0] || 'ingredient1'}", "other"],
    "steps": ["Step 1", "Step 2"],
    "prepTime": 15,
    "cookTime": 20,
    "flavorScores": {
      "umami": 2,
      "sweet": 3,
      "spice": 2,
      "sour": 4,
      "salty": 3
    }
  },
  {
    "name": "Recipe Name",
    "ingredients": ["${selectedIngredients[0] || 'ingredient1'}", "other"],
    "steps": ["Step 1", "Step 2"],
    "prepTime": 15,
    "cookTime": 20,
    "flavorScores": {
      "umami": 3,
      "sweet": 3,
      "spice": 2,
      "sour": 2,
      "salty": 4
    }
  }
]`;
}

/**
 * List available Gemini models (for debugging)
 */
async function listAvailableModels() {
    if (!GEMINI_API_KEY) {
        console.warn('No API key to list models');
        return;
    }
    
    try {
        // Try both v1 and v1beta
        const urls = [
            `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`,
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        ];
        
        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Available Gemini models from', url.includes('v1/') ? 'v1' : 'v1beta', ':', data);
                    if (data.models && data.models.length > 0) {
                        console.log('📋 Model names:', data.models.map(m => m.name).join(', '));
                        return data;
                    }
                }
            } catch (err) {
                console.log('❌ Failed to list models from', url.includes('v1/') ? 'v1' : 'v1beta');
            }
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

/**
 * Validate and fix incomplete recipes
 */
function validateAndFixRecipes(recipes) {
    return recipes.map((recipe, index) => {
        // Ensure all recipes have required fields with defaults
        const fixedRecipe = {
            name: recipe.name || recipe.recipe_name || 'Unnamed Recipe',
            recipe_name: recipe.recipe_name || recipe.name || 'Unnamed Recipe',
            ingredients: recipe.ingredients || [],
            steps: recipe.steps || recipe.instructions || [],
            instructions: recipe.instructions || recipe.steps || [],
            prepTime: recipe.prepTime || recipe.prep_time_minutes || 'N/A',
            cookTime: recipe.cookTime || recipe.cook_time_minutes || 'N/A',
            prep_time_minutes: recipe.prep_time_minutes || recipe.prepTime || 'N/A',
            cook_time_minutes: recipe.cook_time_minutes || recipe.cookTime || 'N/A',
            flavorScores: recipe.flavorScores || {}
        };
        
        // Check if this recipe is incomplete (especially the last one)
        const isIncomplete = 
            (!fixedRecipe.cookTime || fixedRecipe.cookTime === 'N/A') && 
            (!fixedRecipe.cook_time_minutes || fixedRecipe.cook_time_minutes === 'N/A') &&
            (!fixedRecipe.flavorScores || Object.keys(fixedRecipe.flavorScores).length === 0);
        
        if (isIncomplete && index === recipes.length - 1) {
            console.warn(`⚠️ Last recipe (${index + 1}) appears incomplete - missing cookTime or flavorScores`);
            console.warn('Original recipe data:', JSON.stringify(recipe, null, 2));
        }
        
        return fixedRecipe;
    });
}

/**
 * Generate recipes using Google Gemini AI
 */
async function generateRecipes(selectedIngredients, flavorPreferences, dietaryRestrictions) {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not set in config.js');
    }
    
    const prompt = buildRecipePrompt(selectedIngredients, flavorPreferences, dietaryRestrictions);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🍳 RECIPE GENERATION - STARTING');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 INPUT DATA:');
    console.log('  • Selected Ingredients:', selectedIngredients);
    console.log('  • Flavor Preferences:', flavorPreferences);
    console.log('  • Dietary Restrictions:', dietaryRestrictions);
    console.log('');
    console.log('📤 PROMPT BEING SENT TO AI:');
    console.log('───────────────────────────────────────────────────────────');
    console.log(prompt);
    console.log('───────────────────────────────────────────────────────────');
    
    // List available models for debugging (first time only) - wait for it
    if (!window._modelsListed) {
        window._modelsListed = true;
        const modelsData = await listAvailableModels();
        if (modelsData && modelsData.models && modelsData.models.length > 0) {
            const availableModelNames = modelsData.models
                .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));
            console.log('🎯 Models that support generateContent:', availableModelNames);
            
            // If current model not available, try first available one
            if (availableModelNames.length > 0 && !availableModelNames.includes(GEMINI_MODEL)) {
                console.warn(`⚠️ Model ${GEMINI_MODEL} not available. Available models: ${availableModelNames.join(', ')}`);
                console.warn(`💡 Try setting GEMINI_MODEL to one of: ${availableModelNames[0]}`);
            }
        }
    }
    
    try {
        // Build URL with model name - format: models/{model-name}:generateContent
        const modelName = GEMINI_MODEL.startsWith('models/') ? GEMINI_MODEL : `models/${GEMINI_MODEL}`;
        
        // Try v1 API first, fallback to v1beta
        let url = `https://generativelanguage.googleapis.com/v1/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
        
        console.log('Using model:', modelName);
        console.log('Trying v1 API first...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Return ONLY valid JSON. No text before the JSON. No text after the JSON. No explanations. No markdown. Just the JSON array.\n\n${prompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7, // Slightly lower for more consistent JSON
                        maxOutputTokens: 6000 // Increased to handle longer recipe responses and prevent truncation
                        // Note: responseMimeType not supported in v1 API for all models
                    }
                })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
            console.error('v1 API failed, trying v1beta...', errorData);
            
            // Try v1beta as fallback
            const urlV1Beta = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
            const responseV1Beta = await fetch(urlV1Beta, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Return ONLY valid JSON. No text before the JSON. No text after the JSON. No explanations. No markdown. Just the JSON array.\n\n${prompt}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7, // Slightly lower for more consistent JSON
                        maxOutputTokens: 6000, // Increased to handle longer recipe responses and prevent truncation
                        responseMimeType: "application/json" // Request JSON response format
                    }
                })
            });
            
            if (!responseV1Beta.ok) {
                const errorDataV1Beta = await responseV1Beta.json().catch(() => ({ error: { message: 'Unknown error' } }));
                console.error('v1beta API also failed:', errorDataV1Beta);
                const errorMsg = errorDataV1Beta.error?.message || errorDataV1Beta.message || JSON.stringify(errorDataV1Beta);
                throw new Error(`Gemini API error: ${errorMsg}`);
            }
            
            // Use v1beta response
            const data = await responseV1Beta.json();
            
            // Check if response was truncated
            if (data.candidates && data.candidates[0] && data.candidates[0].finishReason) {
                const finishReason = data.candidates[0].finishReason;
                if (finishReason === 'MAX_TOKENS' || finishReason === 'OTHER') {
                    console.warn('⚠️ API response may have been truncated (finishReason:', finishReason + ')');
                }
            }
            
            console.log('');
            console.log('📥 RAW API RESPONSE (v1beta):');
            console.log('───────────────────────────────────────────────────────────');
            console.log(JSON.stringify(data, null, 2));
            console.log('───────────────────────────────────────────────────────────');
            
            // Check response structure
            let content = null;
            
            if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0 && data.candidates[0] && data.candidates[0].content) {
                if (data.candidates[0].content.parts && Array.isArray(data.candidates[0].content.parts) && data.candidates[0].content.parts.length > 0 && data.candidates[0].content.parts[0]) {
                    content = data.candidates[0].content.parts[0].text || data.candidates[0].content.parts[0].text;
                } else if (data.candidates[0].content.text) {
                    content = data.candidates[0].content.text;
                }
            } else if (data.text) {
                content = data.text;
            } else if (data.response && data.response.text) {
                content = data.response.text;
            }
            
            if (!content) {
                console.error('Unexpected v1beta response structure:', data);
                throw new Error('Invalid response from Gemini API - unexpected structure. Check console for details.');
            }
            
            content = content.trim();
            
            console.log('');
            console.log('📄 EXTRACTED TEXT CONTENT (first 500 chars):');
            console.log('───────────────────────────────────────────────────────────');
            console.log(content.substring(0, 500));
            console.log('───────────────────────────────────────────────────────────');
            
            // Remove markdown code blocks if present
            if (content.startsWith('```')) {
                content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            }
            
            // Extract JSON array - find the first [ and last ]
            const firstBracket = content.indexOf('[');
            let lastBracket = content.lastIndexOf(']');
            
            // If last bracket is too close to the end, the JSON might be incomplete
            // Try to find a better closing bracket by counting brackets
            if (lastBracket > 0 && lastBracket < content.length - 10) {
                // Count opening and closing brackets to find the real end
                let bracketCount = 0;
                let foundLastBracket = -1;
                for (let i = firstBracket; i < content.length; i++) {
                    if (content[i] === '[') bracketCount++;
                    if (content[i] === ']') {
                        bracketCount--;
                        if (bracketCount === 0) {
                            foundLastBracket = i;
                            break;
                        }
                    }
                }
                if (foundLastBracket > lastBracket) {
                    lastBracket = foundLastBracket;
                }
            }
            
            if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
                console.error('No JSON array found in v1beta response');
                console.error('Full content length:', content.length);
                console.error('Full content (last 500 chars):', content.substring(Math.max(0, content.length - 500)));
                throw new Error('AI response does not contain a valid JSON array. Check console for full response.');
            }
            
            // Extract just the JSON array part
            content = content.substring(firstBracket, lastBracket + 1);
            
            // Check if JSON seems incomplete (doesn't end properly)
            if (!content.trim().endsWith(']')) {
                console.warn('⚠️ JSON might be incomplete - trying to fix...');
                // Try to close any unclosed objects/arrays
                let openBraces = (content.match(/\{/g) || []).length;
                let closeBraces = (content.match(/\}/g) || []).length;
                let openBrackets = (content.match(/\[/g) || []).length;
                let closeBrackets = (content.match(/\]/g) || []).length;
                
                // Add missing closing brackets/braces
                while (openBrackets > closeBrackets) {
                    content += ']';
                    closeBrackets++;
                }
                while (openBraces > closeBraces) {
                    content += '}';
                    closeBraces++;
                }
                console.log('Attempted to fix incomplete JSON');
            }
            
            console.log('');
            console.log('🔍 EXTRACTED JSON ARRAY (first 500 chars):');
            console.log('───────────────────────────────────────────────────────────');
            console.log(content.substring(0, 500));
            console.log('───────────────────────────────────────────────────────────');
            
            // Clean up common JSON issues
            // Remove trailing commas before closing brackets/braces
            content = content.replace(/,(\s*[}\]])/g, '$1');
            
            // More aggressive JSON cleaning
            // Remove literal newlines and replace with spaces (preserve JSON structure)
            content = content.replace(/\n/g, ' ');
            // Remove extra whitespace
            content = content.replace(/\s+/g, ' ');
            // Remove any control characters except spaces
            content = content.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
            
            // Parse JSON with multiple fallback strategies
            let recipes;
            try {
                recipes = JSON.parse(content);
                console.log('');
                console.log('✅ JSON PARSED SUCCESSFULLY!');
                console.log('───────────────────────────────────────────────────────────');
                console.log('📋 PARSED RECIPES (JSON):');
                console.log(JSON.stringify(recipes, null, 2));
                console.log('───────────────────────────────────────────────────────────');
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Error at position:', parseError.message.match(/position (\d+)/)?.[1]);
                
                // Try to find and fix the issue at the error position
                const errorPos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
                if (errorPos > 0) {
                    console.log('Content around error position:', content.substring(Math.max(0, errorPos - 50), errorPos + 50));
                }
                
                // Strategy 1: Try to extract just the JSON array with regex
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    try {
                        let cleaned = jsonMatch[0];
                        // Remove trailing commas more aggressively
                        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
                        recipes = JSON.parse(cleaned);
                        console.log('✅ Parsed using extracted array');
                    } catch (e) {
                        console.error('Extracted array also failed:', e);
                    }
                }
                
            // Strategy 2: If still failed, try to parse each recipe individually
            if (!recipes) {
                try {
                    // Find all recipe objects - use a more flexible regex
                    const recipeMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
                    if (recipeMatches && recipeMatches.length > 0) {
                        recipes = recipeMatches.map(match => {
                            try {
                                return JSON.parse(match);
                            } catch (e) {
                                return null;
                            }
                        }).filter(r => r !== null && (r.name || r.recipe_name));
                        console.log('✅ Parsed', recipes.length, 'recipes individually');
                    }
                } catch (e) {
                    console.error('Individual parsing failed:', e);
                }
            }
            
            if (!recipes) {
                console.error('Full content that failed:', content);
                throw new Error(`Failed to parse JSON: ${parseError.message}. Check console for full response.`);
            }
        }
        
        if (!Array.isArray(recipes)) {
            console.error('Parsed result is not an array:', recipes);
            throw new Error('AI did not return an array of recipes');
        }
        
        // Validate and fix incomplete recipes
        recipes = validateAndFixRecipes(recipes);
        
        console.log('');
        console.log('📊 FINAL RECIPES SUMMARY:');
        console.log('───────────────────────────────────────────────────────────');
        console.log(`  • Total recipes: ${recipes.length}`);
        console.log(`  • Recipe names: ${recipes.map(r => r.name || r.recipe_name || 'Unnamed').join(', ')}`);
        console.log('');
        recipes.forEach((recipe, idx) => {
            console.log(`  Recipe ${idx + 1}: ${recipe.name || recipe.recipe_name || 'Unnamed'}`);
            console.log(`    - Ingredients: ${(recipe.ingredients || []).length} items`);
            console.log(`    - Steps: ${(recipe.steps || recipe.instructions || []).length} steps`);
            console.log(`    - Prep: ${recipe.prepTime || recipe.prep_time_minutes || 'N/A'} min`);
            console.log(`    - Cook: ${recipe.cookTime || recipe.cook_time_minutes || 'N/A'} min`);
            if (recipe.flavorScores && Object.keys(recipe.flavorScores).length > 0) {
                console.log(`    - Flavor Scores: Umami=${recipe.flavorScores.umami || 'N/A'}, Sweet=${recipe.flavorScores.sweet || 'N/A'}, Spice=${recipe.flavorScores.spice || 'N/A'}, Sour=${recipe.flavorScores.sour || 'N/A'}, Salty=${recipe.flavorScores.salty || 'N/A'}`);
            } else {
                console.log(`    - Flavor Scores: Missing`);
            }
        });
        console.log('───────────────────────────────────────────────────────────');
        console.log('✅ RECIPE GENERATION COMPLETE (using v1beta)');
        console.log('═══════════════════════════════════════════════════════════');
            return recipes;
        }
        
        // v1 API succeeded, process the response
        const data = await response.json();
        
        // Check if response was truncated
        if (data.candidates && data.candidates[0] && data.candidates[0].finishReason) {
            const finishReason = data.candidates[0].finishReason;
            if (finishReason === 'MAX_TOKENS' || finishReason === 'OTHER') {
                console.warn('⚠️ API response may have been truncated (finishReason:', finishReason + ')');
            }
        }
        
        console.log('');
        console.log('📥 RAW API RESPONSE (v1):');
        console.log('───────────────────────────────────────────────────────────');
        console.log(JSON.stringify(data, null, 2));
        console.log('───────────────────────────────────────────────────────────');
        
        // Check response structure - might be different for v1 API
        let content = null;
        
        if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0 && data.candidates[0] && data.candidates[0].content) {
            // Standard v1beta format
            if (data.candidates[0].content.parts && Array.isArray(data.candidates[0].content.parts) && data.candidates[0].content.parts.length > 0 && data.candidates[0].content.parts[0]) {
                content = data.candidates[0].content.parts[0].text || data.candidates[0].content.parts[0].text;
            } else if (data.candidates[0].content.text) {
                content = data.candidates[0].content.text;
            }
        } else if (data.text) {
            // Direct text response
            content = data.text;
        } else if (data.response && data.response.text) {
            // Alternative response format
            content = data.response.text;
        }
        
        if (!content) {
            console.error('Unexpected response structure:', data);
            throw new Error('Invalid response from Gemini API - unexpected structure. Check console for details.');
        }
        
        content = content.trim();
        
        console.log('');
        console.log('📄 EXTRACTED TEXT CONTENT (first 500 chars):');
        console.log('───────────────────────────────────────────────────────────');
        console.log(content.substring(0, 500));
        console.log('───────────────────────────────────────────────────────────');
        
        // Remove markdown code blocks if present
        if (content.startsWith('```')) {
            content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        // Extract JSON array - find the first [ and last ]
        const firstBracket = content.indexOf('[');
        let lastBracket = content.lastIndexOf(']');
        
        // If last bracket is too close to the end, the JSON might be incomplete
        // Try to find a better closing bracket by counting brackets
        if (lastBracket > 0 && lastBracket < content.length - 10) {
            // Count opening and closing brackets to find the real end
            let bracketCount = 0;
            let foundLastBracket = -1;
            for (let i = firstBracket; i < content.length; i++) {
                if (content[i] === '[') bracketCount++;
                if (content[i] === ']') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        foundLastBracket = i;
                        break;
                    }
                }
            }
            if (foundLastBracket > lastBracket) {
                lastBracket = foundLastBracket;
            }
        }
        
        if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
            console.error('No JSON array found in response');
            console.error('Full content length:', content.length);
            console.error('Full content (last 500 chars):', content.substring(Math.max(0, content.length - 500)));
            throw new Error('AI response does not contain a valid JSON array. Check console for full response.');
        }
        
        // Extract just the JSON array part
        content = content.substring(firstBracket, lastBracket + 1);
        
        // Check if JSON seems incomplete (doesn't end properly)
        if (!content.trim().endsWith(']')) {
            console.warn('⚠️ JSON might be incomplete - trying to fix...');
            // Try to close any unclosed objects/arrays
            let openBraces = (content.match(/\{/g) || []).length;
            let closeBraces = (content.match(/\}/g) || []).length;
            let openBrackets = (content.match(/\[/g) || []).length;
            let closeBrackets = (content.match(/\]/g) || []).length;
            
            // Add missing closing brackets/braces
            while (openBrackets > closeBrackets) {
                content += ']';
                closeBrackets++;
            }
            while (openBraces > closeBraces) {
                content += '}';
                closeBraces++;
            }
            console.log('Attempted to fix incomplete JSON');
        }
        
        console.log('');
        console.log('🔍 EXTRACTED JSON ARRAY (first 500 chars):');
        console.log('───────────────────────────────────────────────────────────');
        console.log(content.substring(0, 500));
        console.log('───────────────────────────────────────────────────────────');
        
        // Clean up common JSON issues
        // Remove trailing commas before closing brackets/braces
        content = content.replace(/,(\s*[}\]])/g, '$1');
        
        // More aggressive JSON cleaning
        // First, try to escape newlines that are inside string values (between quotes)
        // This is complex, so we'll use a simpler approach: remove all unescaped newlines
        // and replace them with spaces, except for structural newlines (outside strings)
        // For now, let's just remove unescaped newlines and replace with spaces
        // We need to be careful not to break the JSON structure
        
        // Remove literal newlines that aren't escaped (but keep the JSON structure)
        // Replace newlines with spaces, but preserve the JSON structure
        content = content.replace(/\n/g, ' ');
        // Remove extra whitespace
        content = content.replace(/\s+/g, ' ');
        // Remove any control characters except spaces
        content = content.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
        
        // Parse JSON with multiple fallback strategies
        let recipes;
        try {
            recipes = JSON.parse(content);
            console.log('');
            console.log('✅ JSON PARSED SUCCESSFULLY!');
            console.log('───────────────────────────────────────────────────────────');
            console.log('📋 PARSED RECIPES (JSON):');
            console.log(JSON.stringify(recipes, null, 2));
            console.log('───────────────────────────────────────────────────────────');
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('Error at position:', parseError.message.match(/position (\d+)/)?.[1]);
            
            // Try to find and fix the issue at the error position
            const errorPos = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
            if (errorPos > 0) {
                console.log('Content around error position:', content.substring(Math.max(0, errorPos - 100), Math.min(content.length, errorPos + 100)));
                console.log('Content length:', content.length);
                console.log('Error at position:', errorPos, 'out of', content.length);
            }
            
            // Strategy 1: Try to fix incomplete JSON by closing unclosed objects
            if (errorPos > content.length * 0.8) {
                // Error near the end - likely incomplete JSON
                console.log('⚠️ Error near end of content - JSON might be truncated');
                console.log('Last 200 chars:', content.substring(Math.max(0, content.length - 200)));
                
                // Try to complete the last recipe object
                let lastOpenBrace = content.lastIndexOf('{');
                if (lastOpenBrace > 0) {
                    let afterLastBrace = content.substring(lastOpenBrace);
                    // Count what's missing
                    let openBraces = (afterLastBrace.match(/\{/g) || []).length;
                    let closeBraces = (afterLastBrace.match(/\}/g) || []).length;
                    let openBrackets = (afterLastBrace.match(/\[/g) || []).length;
                    let closeBrackets = (afterLastBrace.match(/\]/g) || []).length;
                    
                    // Try to complete it
                    let fixed = content.substring(0, lastOpenBrace);
                    let incomplete = content.substring(lastOpenBrace);
                    
                    // If we're in the middle of an array, try to close it
                    if (incomplete.includes('"ingredients"') && !incomplete.includes(']')) {
                        // Try to find where ingredients array should end
                        let ingredientsStart = incomplete.indexOf('"ingredients"');
                        if (ingredientsStart > -1) {
                            let afterIngredients = incomplete.substring(ingredientsStart);
                            // Try to close the array and object
                            if (!afterIngredients.includes(']')) {
                                // Find the last item or add closing
                                let lastComma = afterIngredients.lastIndexOf(',');
                                if (lastComma > -1) {
                                    incomplete = incomplete.substring(0, lastComma + 1) + ' ] }';
                                } else {
                                    incomplete += ' ] }';
                                }
                            }
                        }
                    }
                    
                    // Close any remaining open structures
                    while (openBrackets > closeBrackets) {
                        incomplete += ']';
                        closeBrackets++;
                    }
                    while (openBraces > closeBraces) {
                        incomplete += '}';
                        closeBraces++;
                    }
                    
                    content = fixed + incomplete + ']';
                    console.log('Attempted to fix truncated JSON');
                    
                    try {
                        recipes = JSON.parse(content);
                        console.log('✅ Parsed after fixing truncation');
                    } catch (e2) {
                        console.error('Fixed version also failed:', e2);
                    }
                }
            }
            
            // Strategy 2: Try to extract just the JSON array with regex
            if (!recipes) {
                const jsonMatch = content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    try {
                        let cleaned = jsonMatch[0];
                        // Remove trailing commas more aggressively
                        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
                        recipes = JSON.parse(cleaned);
                        console.log('✅ Parsed using extracted array');
                    } catch (e) {
                        console.error('Extracted array also failed:', e);
                    }
                }
            }
            
            // Strategy 2: If still failed, try to parse each recipe individually
            if (!recipes) {
                try {
                    // Find all recipe objects
                    const recipeMatches = content.match(/\{[^{}]*"name"[^{}]*\}/g);
                    if (recipeMatches && recipeMatches.length > 0) {
                        recipes = recipeMatches.map(match => {
                            try {
                                return JSON.parse(match);
                            } catch (e) {
                                return null;
                            }
                        }).filter(r => r !== null);
                        console.log('✅ Parsed', recipes.length, 'recipes individually');
                    }
                } catch (e) {
                    console.error('Individual parsing failed:', e);
                }
            }
            
            if (!recipes) {
                console.error('Full content that failed:', content);
                throw new Error(`Failed to parse JSON: ${parseError.message}. Check console for full response.`);
            }
        }
        
        if (!Array.isArray(recipes)) {
            console.error('Parsed result is not an array:', recipes);
            throw new Error('AI did not return an array of recipes');
        }
        
        // Validate and fix incomplete recipes
        recipes = validateAndFixRecipes(recipes);
        
        console.log('');
        console.log('📊 FINAL RECIPES SUMMARY:');
        console.log('───────────────────────────────────────────────────────────');
        console.log(`  • Total recipes: ${recipes.length}`);
        console.log(`  • Recipe names: ${recipes.map(r => r.name || r.recipe_name || 'Unnamed').join(', ')}`);
        console.log('');
        recipes.forEach((recipe, idx) => {
            console.log(`  Recipe ${idx + 1}: ${recipe.name || recipe.recipe_name || 'Unnamed'}`);
            console.log(`    - Ingredients: ${(recipe.ingredients || []).length} items`);
            console.log(`    - Steps: ${(recipe.steps || recipe.instructions || []).length} steps`);
            console.log(`    - Prep: ${recipe.prepTime || recipe.prep_time_minutes || 'N/A'} min`);
            console.log(`    - Cook: ${recipe.cookTime || recipe.cook_time_minutes || 'N/A'} min`);
            if (recipe.flavorScores && Object.keys(recipe.flavorScores).length > 0) {
                console.log(`    - Flavor Scores: Umami=${recipe.flavorScores.umami || 'N/A'}, Sweet=${recipe.flavorScores.sweet || 'N/A'}, Spice=${recipe.flavorScores.spice || 'N/A'}, Sour=${recipe.flavorScores.sour || 'N/A'}, Salty=${recipe.flavorScores.salty || 'N/A'}`);
            } else {
                console.log(`    - Flavor Scores: Missing`);
            }
        });
        console.log('───────────────────────────────────────────────────────────');
        console.log('✅ RECIPE GENERATION COMPLETE (using v1)');
        console.log('═══════════════════════════════════════════════════════════');
        
        return recipes;
        
    } catch (error) {
        console.error('Error generating recipes:', error);
        throw error;
    }
}

/**
 * Get flavor preferences from sliders
 * Returns values on a 1-5 scale (3 is neutral/standard)
 */
function getFlavorPreferences() {
    const getValue = (sliderId) => {
        const slider = document.getElementById(sliderId);
        return parseInt(slider?.getAttribute('data-value') || '3');
    };
    
    return {
        umami: getValue('umamiSlider'),
        sweet: getValue('sweetSlider'),
        spice: getValue('spiceSlider'),
        sour: getValue('sourSlider'),
        salty: getValue('saltySlider')
    };
}

/**
 * Get dietary restrictions from dropdown
 */
function getDietaryRestrictions() {
    const select = document.getElementById('dietarySelect');
    const selected = Array.from(select.selectedOptions).map(opt => opt.value);
    return selected.filter(v => v !== '');
}

/**
 * Display recipes in the UI
 */
function displayRecipes(recipes) {
    const container = document.getElementById('recipeResults');
    
    if (!recipes || recipes.length === 0) {
        console.error('displayRecipes called with empty or null recipes:', recipes);
        container.innerHTML = `
            <h2>Generated Recipes</h2>
            <div class="no-recipes">
                <p><strong>No recipes generated.</strong></p>
                <p>Please try again or check the browser console for details.</p>
            </div>
        `;
        return;
    }
    
    console.log('Displaying', recipes.length, 'recipes');
    
    container.innerHTML = `
        <h2>Generated Recipes</h2>
        ${recipes.map((recipe, index) => {
        // Validate recipe has required fields (only log if critical data is missing)
        if (!recipe.name && !recipe.recipe_name) {
            console.warn(`Recipe ${index} missing name`);
        }
        
        const name = recipe.name || recipe.recipe_name || 'Unnamed Recipe';
        const ingredients = recipe.ingredients || [];
        
        // Handle steps/instructions - check multiple possible formats
        let steps = recipe.steps || recipe.instructions || recipe.instruction || [];
        
        // If steps is a string, try to split it into an array
        if (typeof steps === 'string') {
            // Try splitting by newlines, periods, or numbered lists
            steps = steps.split(/\n+|\.\s+(?=\d+\.)|(?=\d+\.)/).filter(s => s.trim().length > 0);
        }
        
        // Ensure steps is an array
        if (!Array.isArray(steps)) {
            steps = [];
        }
        const prepTime = recipe.prepTime || recipe.prep_time_minutes || 'N/A';
        const cookTime = recipe.cookTime || recipe.cook_time_minutes || 'N/A';
        const flavorScores = recipe.flavorScores || {};
        
        // Debug: log flavor scores
        console.log(`Recipe "${name}" flavorScores:`, flavorScores);
        
        // Build flavor scores display - show even if some are missing
        const hasAnyScores = flavorScores.umami !== undefined || flavorScores.sweet !== undefined || 
                            flavorScores.spice !== undefined || flavorScores.sour !== undefined || 
                            flavorScores.salty !== undefined;
        
        // Helper function to create a flavor bubble
        const createFlavorBubble = (flavor, score, index) => {
            if (score === undefined) return '';
            const flavorNames = {
                umami: 'Umami',
                sweet: 'Sweet',
                spice: 'Spice',
                sour: 'Sour',
                salty: 'Salty'
            };
            const animationDelay = index * 0.5;
            return `
                <div class="flavor-bubble-wrapper">
                    <div class="flavor-bubble ${flavor} score-${score}" title="${flavorNames[flavor]}: ${score}/5" style="animation-delay: ${animationDelay}s;"></div>
                    <div class="flavor-bubble-label">${flavorNames[flavor]}</div>
                </div>
            `;
        };

        // Build bubbles array with indices
        const bubbles = [];
        let bubbleIndex = 0;
        const flavors = [
            { key: 'umami', name: 'Umami' },
            { key: 'sweet', name: 'Sweet' },
            { key: 'spice', name: 'Spice' },
            { key: 'sour', name: 'Sour' },
            { key: 'salty', name: 'Salty' }
        ];
        
        flavors.forEach(flavor => {
            if (flavorScores[flavor.key] !== undefined) {
                bubbles.push(createFlavorBubble(flavor.key, flavorScores[flavor.key], bubbleIndex++));
            }
        });

        const flavorBubblesDisplay = hasAnyScores ? bubbles.join('') : '';
        
        return `
        <div class="recipe-card">
            <div class="recipe-header">
                <h3>${name}</h3>
            </div>
            <div class="recipe-details">
                <div class="recipe-time-with-bubbles">
                    <div class="recipe-time">
                        <span>⏱️ ${prepTime} min prep</span>
                        <span>🔥 ${cookTime} min cook</span>
                    </div>
                    ${flavorBubblesDisplay ? `<div class="flavor-bubbles-inline">${flavorBubblesDisplay}</div>` : ''}
                </div>
                <div class="recipe-ingredients">
                    <strong>Ingredients:</strong> ${ingredients.length > 0 ? ingredients.join(', ') : 'Not specified'}
                </div>
                <div class="recipe-instructions">
                    <strong>Instructions:</strong>
                    ${steps.length > 0 ? `
                    <ol style="margin-top: 10px; padding-left: 25px; line-height: 1.8;">
                        ${steps.map(step => `<li style="margin-bottom: 10px; padding-left: 5px; color: #555;">${step}</li>`).join('')}
                    </ol>
                    ` : '<p style="margin-top: 10px; color: #666; font-style: italic;">Instructions not provided</p>'}
                </div>
            </div>
        </div>
        `;
    }).join('')}
    `;
}

/**
 * Main function - generate and display recipes
 */
async function generateAndDisplayRecipes() {
    const selectedIngredients = window.clickedIngredients || [];
    
    if (selectedIngredients.length === 0) {
        alert('Please select at least one ingredient first!');
        return;
    }
    
    const flavorPreferences = getFlavorPreferences();
    const dietaryRestrictions = getDietaryRestrictions();
    
    const container = document.getElementById('recipeResults');
    
    // Show loading state with cute domino animation
    container.innerHTML = `
        <h2>Generated Recipes</h2>
        <div class="domino-loader">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
        </div>
        <div style="text-align: center; color: #5a4a42; margin-top: 20px;">
            <p><strong>🍳 Generating recipes with AI...</strong></p>
            <p style="font-size: 14px; opacity: 0.8;">This may take a few seconds.</p>
        </div>
    `;
    
    // Scroll to recipe results at bottom
    const recipeResults = document.getElementById('recipeResults');
    if (recipeResults) {
        setTimeout(() => {
            recipeResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
    
    try {
        const recipes = await generateRecipes(selectedIngredients, flavorPreferences, dietaryRestrictions);
        
        console.log('Recipes received:', recipes);
        console.log('Number of recipes:', recipes ? recipes.length : 0);
        
        if (!recipes || recipes.length === 0) {
            throw new Error('No recipes were generated. Please try again with different ingredients or preferences.');
        }
        
        displayRecipes(recipes);
    } catch (error) {
        console.error('Error:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        
        let helpText = '';
        if (errorMessage.includes('API key')) {
            helpText = '<p>💡 Add your Gemini API key to <code>deploy/config.js</code></p>';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            helpText = '<p>💡 Check your internet connection</p>';
        } else {
            helpText = '<p>💡 Check the browser console (F12) for more details</p>';
        }
        
        container.innerHTML = `
            <h2>Generated Recipes</h2>
            <div class="no-recipes">
                <p><strong>❌ Error generating recipes</strong></p>
                <p><code>${errorMessage}</code></p>
                ${helpText}
            </div>
        `;
    }
}

// Export for use in HTML
window.recipeGenerator = {
    generateAndDisplayRecipes
};
