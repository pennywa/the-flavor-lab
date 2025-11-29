/**
 * Recipe Generator - Simple AI-Powered Recipe Generation
 * Takes selected ingredients, flavor preferences, and dietary restrictions
 * Generates recipes using Google Gemini AI and displays them in the UI
 */

// Configuration from config.js
// We only load non-secret, client-side configuration variables.

// API management start
// The only variable needed from CONFIG is the model name.
const CONFIG_LOADED = typeof CONFIG !== 'undefined' ? CONFIG : {
    GEMINI_MODEL: 'gemini-2.5-flash' 
};

// Define the non-secret model variable.
const GEMINI_MODEL = CONFIG_LOADED.GEMINI_MODEL || 'gemini-2.5-flash';

// All logic related to GEMINI_API_KEY and PEXELS_API_KEY has been removed 
// API management end

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

CRITICAL JSON STRUCTURE RULES:
1. Every array MUST be properly closed with ]
2. Every object MUST be properly closed with }
3. After closing an array, use a comma before the next field: ], "fieldName":
4. Field names must be exact: "ingredients", "steps", "prepTime", "cookTime", "flavorScores", "name"
5. Do NOT write any text between closing an array and starting the next field
6. Generate EXACTLY 4 COMPLETE recipes with ALL fields

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

EXACT JSON FORMAT (copy this structure exactly):
[
  {
    "name": "Recipe Name",
    "ingredients": [
      "ingredient 1",
      "ingredient 2",
      "ingredient 3"
    ],
    "steps": [
      "Step 1 description",
      "Step 2 description",
      "Step 3 description"
    ],
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
    "name": "Recipe Name 2",
    "ingredients": [
      "ingredient 1",
      "ingredient 2"
    ],
    "steps": [
      "Step 1",
      "Step 2"
    ],
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
    "name": "Recipe Name 3",
    "ingredients": [
      "ingredient 1",
      "ingredient 2"
    ],
    "steps": [
      "Step 1",
      "Step 2"
    ],
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
    "name": "Recipe Name 4",
    "ingredients": [
      "ingredient 1",
      "ingredient 2"
    ],
    "steps": [
      "Step 1",
      "Step 2"
    ],
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
]

REMEMBER: Close every array with ] before starting the next field. Use ], "fieldName": format.`;
}

// ----------------------------------------------------------------------
// REMOVED: The listAvailableModels function was removed because it 
//          used and exposed the GEMINI_API_KEY directly in the client.
// ----------------------------------------------------------------------

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
 * Generate recipes using the secure Python Server Proxy.
 * NOTE: This function's sole job is to call the server and return the parsed recipe array.
 */
async function generateRecipe(selectedIngredients, flavorPreferences, dietaryRestrictions) {
    
    // 1. Combine all inputs into a single prompt string that the server will use
    // The buildRecipePrompt function is assumed to be defined elsewhere and is secure.
    const prompt = buildRecipePrompt(selectedIngredients, flavorPreferences, dietaryRestrictions);

    // 2. Prepare the data payload for your Python server
    const payload = {
        // We send the full, custom prompt to the server
        prompt_text: prompt,
        
        // We also send the model name (which is safe) to the server
        model: GEMINI_MODEL 
    };

    // --- REMOVED UI CALLS: displayRecipe('Generating recipe...', 'Loading'); displayError(''); ---
    
    console.log('🍳 RECIPE GENERATION - Sending request to secure Python server...');

    // 3. Make a secure POST request to your Python server's recipe endpoint
    try {
        const response = await fetch('/api/generate_recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the required data payload to the server
            body: JSON.stringify(payload) 
        });

        if (!response.ok) {
            // Read and handle errors returned by the Python server
            const errorData = await response.json().catch(() => ({ error: { message: `Server error: ${response.status} ${response.statusText}` } }));
            // Re-throw the error so the main orchestrator (generateAndDisplayRecipes) handles the display
            throw new Error(`Server Error: ${errorData.error || errorData.message || response.statusText}`);
        }

        const data = await response.json();
        const recipeText = data.recipe; // Expecting the raw JSON string from the server
        
        if (!recipeText) {
            throw new Error('Server returned empty recipe content.');
        }

        // --- Start Response Processing (Parsing the AI's JSON output) ---
        
        // Remove markdown code blocks if present
        let content = recipeText.trim();
        if (content.startsWith('```')) {
            content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        // Find the JSON array part
        const firstBracket = content.indexOf('[');
        let lastBracket = content.lastIndexOf(']');
        
        if (firstBracket === -1 || lastBracket === -1 || lastBracket <= firstBracket) {
            throw new Error('AI response does not contain a valid JSON array.');
        }

        // Extract and clean the JSON array part (using robust methods from your old logic)
        content = content.substring(firstBracket, lastBracket + 1);
        content = content.replace(/,(\s*[}\]])/g, '$1');
        
        // Parse the JSON
        let recipes = JSON.parse(content);

        if (!Array.isArray(recipes)) {
            throw new Error('AI did not return an array of recipes');
        }
        
        // Validate and fix incomplete recipes (using your existing function)
        recipes = validateAndFixRecipes(recipes);
        
        // --- REMOVED: displayRecipesList(recipes); ---
        // --- REMOVED: await searchRecipeImage(firstRecipeTitle); ---

        console.log('✅ Recipe generation complete via secure proxy.');
        
        // Return the recipes to the main orchestrator function
        return recipes;
        
    } catch (error) {
        // Log the detailed error but re-throw it so the main orchestrator handles the display
        console.error('Error in generateRecipe (Proxy):', error);
        throw error; // Re-throw the error
    }
}

/**
 * Fetch recipe image by proxying the request through the Python server.
 * The server handles the PEXELS_API_KEY securely.
 * @param {string} recipeName - Name of the recipe
 * @param {Array} ingredients - Array of ingredient strings
 * @param {number} recipeIndex - Index of the recipe (to vary search queries and avoid duplicates)
 */
async function fetchRecipeImage(recipeName, ingredients, recipeIndex = 0) {
    // -----------------------------------------------------------
    // NOTE: All API Key checks and direct key usage have been removed for security.
    // The query building logic remains the same.
    // -----------------------------------------------------------
    
    // Build search query from recipe name and ingredients (same logic as before)
    const nameWords = recipeName.toLowerCase()
        .split(/\s+/)
        .slice(0, 5)
        .join(' ');
    
    // Logic to select ingredients based on recipe index
    const startIndex = recipeIndex % Math.max(1, ingredients.length);
    const ingredientCount = Math.min(3 + (recipeIndex % 2), ingredients.length); 
    const selectedIngredients = ingredients.slice(startIndex, startIndex + ingredientCount)
        .concat(ingredients.slice(0, Math.max(0, ingredientCount - (ingredients.length - startIndex))));
    
    const ingredientWords = selectedIngredients.map(ing => {
        return ing.replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\d+/g, '') // Remove numbers
            .replace(/[()]/g, '') // Remove parentheses
            // Remove common measurement words (same logic as before)
            .replace(/\b(tbsp|tsp|cup|cups|oz|lb|lbs|g|kg|ml|l|can|cans|cloves?|pieces?|slices?|diced?|chopped?|minced?|fresh|dried|ground|whole|large|small|medium)\b/gi, '')
            .trim();
    })
    .filter(ing => ing.length > 2)
    .join(' ');
    
    // Add variation terms based on index
    const variationTerms = ['dish', 'meal', 'cuisine', 'cooking', 'recipe'];
    const variationTerm = variationTerms[recipeIndex % variationTerms.length];
    
    const baseQuery = `${nameWords} ${ingredientWords} ${variationTerm} food`.trim().replace(/\s+/g, ' ');

    // Use different page numbers to get different results for similar queries
    const page = 1 + (recipeIndex % 3); 
    
    console.log(`🖼️ Fetching image for: "${recipeName}" (recipe ${recipeIndex + 1})`);
    console.log(`   Search query sent to server: "${baseQuery}"`);
    
    // -----------------------------------------------------------
    // SECURE PROXY CALL: Send the query to your server endpoint
    // -----------------------------------------------------------
    
    try {
        const response = await fetch('/api/search_image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send query and page number to the Python server
            body: JSON.stringify({ query: baseQuery, page: page }) 
        });
        
        if (!response.ok) {
            // Read and log errors returned by the Python server
            const errorData = await response.json().catch(() => ({ error: { message: `Server error: ${response.status} ${response.statusText}` } }));
            console.warn(`❌ Image Proxy Error: ${errorData.error || errorData.message}`);
            return null;
        }
        
        const data = await response.json();
        const imageUrl = data.image_url; // Expected image URL from the server
        
        if (imageUrl) {
            console.log(`✅ Found image for "${recipeName}":`, imageUrl);
            return imageUrl;
        }
        
        console.log(`⚠️ No images found for "${recipeName}"`);
        return null;
    } catch (error) {
        console.warn('❌ Error fetching recipe image (network/proxy):', error);
        return null;
    }
}

/**
 * Get flavor preferences from sliders
 * Returns values on a 1-5 scale (3 is neutral/standard)
 */
function getFlavorPreferences() {
    const getValue = (sliderId) => {
        const slider = document.getElementById(sliderId);
        // Ensure the data-value attribute is used, or default to 3
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
    // Access the global selectedDietaryRestrictions array
    if (typeof window !== 'undefined' && window.selectedDietaryRestrictions) {
        return window.selectedDietaryRestrictions;
    }
    // Fallback: read from dropdown if it exists
    const select = document.getElementById('dietarySelect');
    if (select) {
        const selected = Array.from(select.selectedOptions).map(opt => opt.value);
        return selected.filter(v => v !== '');
    }
    return [];
}

/**
 * Display recipes in the UI
 */
async function displayRecipes(recipes) {
    const container = document.getElementById('recipeContent');
    if (!container) return;
    
    if (!recipes || recipes.length === 0) {
        console.error('displayRecipes called with empty or null recipes:', recipes);
        container.innerHTML = `
            <div class="no-recipes">
                <p><strong>No recipes generated.</strong></p>
                <p>Please try again or check the browser console for details.</p>
            </div>
        `;
        return;
    }
    
    console.log('Displaying', recipes.length, 'recipes');
    
    // Fetch images for all recipes in parallel
    // NOTE: fetchRecipeImage now calls the secure server proxy.
    console.log('🖼️ Fetching images for recipes...');
    const recipesWithImages = await Promise.all(
        recipes.map(async (recipe, index) => {
            const imageUrl = await fetchRecipeImage(
                recipe.name || recipe.recipe_name || '',
                recipe.ingredients || [],
                index  // Pass index to make each query unique
            );
            return { ...recipe, imageUrl };
        })
    );
    
    const imagesFound = recipesWithImages.filter(r => r.imageUrl).length;
    console.log(`📸 Images fetched: ${imagesFound}/${recipes.length} recipes have images`);
    
    container.innerHTML = `
        ${recipesWithImages.map((recipe, index) => {
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
        
        // Debug: log flavor scores (SAFE to keep)
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
            ${recipe.imageUrl ? `
            <div class="recipe-image-container">
                <img src="${recipe.imageUrl}" alt="${name}" class="recipe-image" loading="lazy" onerror="this.style.display='none'">
            </div>
            ` : ''}
            <div class="recipe-header">
                <h3>${name}</h3>
            </div>
            <div class="recipe-details">
                <div class="recipe-time">
                    <span>⏱️ ${prepTime} min prep</span>
                    <span>🔥 ${cookTime} min cook</span>
                    ${flavorBubblesDisplay ? `<div class="flavor-bubbles-inline">${flavorBubblesDisplay}</div>` : ''}
                </div>
                <div class="recipe-ingredients">
                    <strong>Ingredients:</strong> ${ingredients.length > 0 ? ingredients.join(', ') : 'Not specified'}
                </div>
                <div class="recipe-instructions">
                    <strong>Instructions:</strong>
                    ${steps.length > 0 ? `
                    <ol class="recipe-step-list">
                        ${steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                    ` : '<p class="recipe-empty-text">Instructions not provided</p>'}
                </div>
            </div>
        </div>
        `;
    }).join('')}
    `;
    
    // This is safe: it calls a UI function and does not deal with keys.
    if (typeof window !== 'undefined' && typeof window.openRecipeDrawer === 'function') {
        window.openRecipeDrawer();
    }
}

/**
 * Main function - generate and display recipes
 */
async function generateAndDisplayRecipes() {
    const selectedIngredients = window.clickedIngredients || [];
    const container = document.getElementById('recipeContent');

    if (selectedIngredients.length === 0) {
        // FIX 1: Replace alert() with a visible UI message
        if (container) {
            container.innerHTML = `
                <div class="no-recipes error-message">
                    <p><strong>Please select at least one ingredient first!</strong></p>
                    <p>Click on the ingredients in the flavor wheel to select them.</p>
                </div>
            `;
        } else {
            // Fallback for missing container, although we try to avoid alerts
            console.error('Please select at least one ingredient first!');
        }
        return;
    }
    
    const flavorPreferences = getFlavorPreferences();
    const dietaryRestrictions = getDietaryRestrictions();
    
    // Show loading spinner and open drawer
    if (typeof window !== 'undefined' && typeof window.openRecipeDrawer === 'function') {
        window.openRecipeDrawer();
    }
    
    if (container) {
        container.innerHTML = `
            <div class="lab-loader">
                <div class="flask-container">
                    <svg class="flask-svg" viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="liquidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#4de4ff;stop-opacity:0.8" />
                                <stop offset="100%" style="stop-color:#00a8cc;stop-opacity:0.9" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <!-- Flask body -->
                        <path d="M 60 50 L 60 250 Q 60 270 80 270 L 120 270 Q 140 270 140 250 L 140 50 Z" 
                                fill="#2a2a3a" stroke="#4de4ff" stroke-width="2" opacity="0.8"/>
                        <!-- Liquid -->
                        <ellipse cx="100" cy="200" rx="35" ry="8" fill="url(#liquidGrad)" class="liquid-surface"/>
                        <rect x="65" y="200" width="70" height="60" fill="url(#liquidGrad)" class="liquid-body"/>
                        <!-- Bubbles -->
                        <circle cx="85" cy="220" r="4" fill="#7fffd4" opacity="0.7" class="bubble bubble-1"/>
                        <circle cx="105" cy="235" r="3" fill="#7fffd4" opacity="0.6" class="bubble bubble-2"/>
                        <circle cx="115" cy="215" r="5" fill="#7fffd4" opacity="0.8" class="bubble bubble-3"/>
                        <circle cx="95" cy="245" r="3.5" fill="#7fffd4" opacity="0.7" class="bubble bubble-4"/>
                        <circle cx="75" cy="230" r="4.5" fill="#7fffd4" opacity="0.6" class="bubble bubble-5"/>
                        <!-- Neck -->
                        <rect x="95" y="30" width="10" height="20" fill="#2a2a3a" stroke="#4de4ff" stroke-width="2" opacity="0.8"/>
                        <!-- Whisking motion indicator -->
                        <path d="M 100 20 L 100 30 M 95 25 L 105 25" stroke="#4de4ff" stroke-width="2" class="whisk"/>
                    </svg>
                </div>
            </div>
            <div class="no-recipes" style="font-style: normal;">
                <p><strong>Generating recipes with AI…</strong></p>
                <p>The Experimental Kitchen is assembling your tasting menu.</p>
            </div>
        `;
    }
    
    try {
        // FIX 2: Call the new, secure, singular function name
        const recipes = await generateRecipe(selectedIngredients, flavorPreferences, dietaryRestrictions);
        
        console.log('Recipes received:', recipes);
        console.log('Number of recipes:', recipes ? recipes.length : 0);
        
        if (!recipes || recipes.length === 0) {
            throw new Error('No recipes were generated. Please try again with different ingredients or preferences.');
        }
        
        await displayRecipes(recipes);
    } catch (error) {
        console.error('Error:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        
        let helpText = '';
        if (errorMessage.includes('API key') || errorMessage.includes('Server-side API Key not configured')) {
            // FIX 3: Corrected error message points to the secure location (.env file on the server)
            helpText = '<p>💡 Your Python server is missing the API key.</p><p>Check your <strong>.env</strong> file and ensure the server is running correctly.</p>';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            helpText = '<p>💡 Check your internet connection, or verify your Python server is running on <code>http://localhost:8000/</code>.</p>';
        } else {
            helpText = '<p>💡 Check the browser console (F12) for more details</p>';
        }
        
        if (container) {
            container.innerHTML = `
                <div class="no-recipes" style="font-style: normal;">
                    <p><strong>❌ Error generating recipes</strong></p>
                    <p><code>${errorMessage}</code></p>
                    ${helpText}
                </div>
            `;
        }
    }
}

// Export for use in HTML
window.recipeGenerator = {
    generateAndDisplayRecipes
};