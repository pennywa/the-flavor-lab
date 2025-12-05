/**
 * Recipe Generator - Simple AI-Powered Recipe Generation
 * Takes selected ingredients, flavor preferences, and dietary restrictions
 * Generates recipes using OpenAI API and displays them in the UI
 * 
 * SECURITY: All API calls are made through secure backend endpoints.
 * API keys are never exposed to the client-side code.
 */

/**
 * Build the prompt for OpenAI
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
6. Generate EXACTLY 3 COMPLETE recipes with ALL fields

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
]

REMEMBER: Close every array with ] before starting the next field. Use ], "fieldName": format.`;
}

/**
 * Get the API endpoint URL (supports both local dev and Netlify)
 */
function getApiEndpoint(path) {
    // Try Netlify function first (for production)
    if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com')) {
        return `/.netlify/functions${path}`;
    }
    // Fallback to local server endpoint for development
    return `/api${path}`;
}

/**
 * List available models (removed - no longer needed with backend API)
 */
async function listAvailableModels() {
    // This function is no longer needed as we use backend endpoints
    console.log('Model listing not available - using backend API');
    return null;
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
 * Generate recipes using OpenAI API (via secure backend endpoint)
 */
async function generateRecipes(selectedIngredients, flavorPreferences, dietaryRestrictions) {
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
    
    try {
        // Call secure backend endpoint (API keys stay in backend)
        const apiEndpoint = getApiEndpoint('/generate-recipes');
        console.log('🔒 Calling secure backend endpoint:', apiEndpoint);
        console.log('📤 Request payload:', {
            selectedIngredients,
            flavorPreferences,
            dietaryRestrictions,
            promptLength: prompt.length
        });
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                selectedIngredients,
                flavorPreferences,
                dietaryRestrictions,
                prompt
            })
        });
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                const text = await response.text();
                console.error('❌ Response error (non-JSON):', text);
                errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
            
            const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            console.error('❌ API Error:', errorMsg);
            console.error('❌ Full error data:', errorData);
            
            if (errorMsg.includes('API key') || errorMsg.includes('not configured')) {
                throw new Error(`OpenAI API key error: ${errorMsg}\n\n💡 Please check:\n1. Your API key is set in .env file (OPENAI_API_KEY)\n2. The server is running\n3. The API key has proper permissions\n4. Get a new key at: https://platform.openai.com/api-keys`);
            }
            
            throw new Error(`OpenAI API error: ${errorMsg}`);
        }
        
        const data = await response.json();
        console.log('📥 Response received:', data);
        
        if (!data.recipes || !Array.isArray(data.recipes)) {
            console.error('❌ Invalid response format:', data);
            throw new Error('Invalid response from backend - expected recipes array');
        }
        
        console.log(`✅ Received ${data.recipes.length} recipes from backend`);
        
        let recipes = data.recipes;
        
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
        console.log('✅ RECIPE GENERATION COMPLETE');
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
 * Fetch recipe image from Pexels API (via secure backend endpoint)
 * @param {string} recipeName - Name of the recipe
 * @param {Array} ingredients - Array of ingredient strings
 * @param {number} recipeIndex - Index of the recipe (to vary search queries and avoid duplicates)
 */
async function fetchRecipeImage(recipeName, ingredients, recipeIndex = 0) {
    try {
        // Build search query from recipe name and ingredients
        // Vary the query based on recipe index to avoid duplicate images
        const nameWords = recipeName.toLowerCase()
            .split(/\s+/)
            .slice(0, 5)  // Use first 5 words
            .join(' ');
        
        // Vary ingredient selection based on recipe index to get different images
        // This helps avoid getting the same image for similar recipes
        const startIndex = recipeIndex % Math.max(1, ingredients.length);
        const ingredientCount = Math.min(3 + (recipeIndex % 2), ingredients.length); // 3 or 4 ingredients
        const selectedIngredients = ingredients.slice(startIndex, startIndex + ingredientCount)
            .concat(ingredients.slice(0, Math.max(0, ingredientCount - (ingredients.length - startIndex))));
        
        const ingredientWords = selectedIngredients.map(ing => {
            // Clean up ingredient strings (remove measurements, numbers, etc.)
            return ing.replace(/_/g, ' ')
                .toLowerCase()
                .replace(/\d+/g, '')  // Remove numbers
                .replace(/[()]/g, '') // Remove parentheses
                .replace(/\b(tbsp|tsp|cup|cups|oz|lb|lbs|g|kg|ml|l|can|cans|cloves?|pieces?|slices?|diced?|chopped?|minced?|fresh|dried|ground|whole|large|small|medium)\b/gi, '') // Remove common measurement words
                .trim();
        })
        .filter(ing => ing.length > 2) // Filter out very short words
        .join(' ');
        
        // Add variation terms based on index to further differentiate queries
        const variationTerms = ['dish', 'meal', 'cuisine', 'cooking', 'recipe'];
        const variationTerm = variationTerms[recipeIndex % variationTerms.length];
        
        const query = `${nameWords} ${ingredientWords} ${variationTerm} food`.trim().replace(/\s+/g, ' ');
        console.log(`🖼️ Fetching image for: "${recipeName}" (recipe ${recipeIndex + 1})`);
        console.log(`   Search query: "${query}"`);
        
        // Use different page numbers to get different results for similar queries
        const page = 1 + (recipeIndex % 3); // Try pages 1, 2, or 3
        
        // Call secure backend endpoint (API keys stay in backend)
        const apiEndpoint = getApiEndpoint(`/fetch-image?query=${encodeURIComponent(query)}&page=${page}`);
        console.log('🔒 Calling secure backend endpoint:', apiEndpoint);
        
        const response = await fetch(apiEndpoint);
        
        if (!response.ok) {
            console.warn(`❌ Backend error: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        if (data.imageUrl) {
            console.log(`✅ Found image for "${recipeName}":`, data.imageUrl);
            return data.imageUrl;
        }
        
        console.log(`⚠️ No images found for "${recipeName}"`);
        return null;
    } catch (error) {
        console.warn('❌ Error fetching recipe image:', error);
        return null;
    }
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
                    <span><i class="fas fa-clock"></i> ${prepTime} min prep</span>
                    <span><i class="fas fa-fire"></i> ${cookTime} min cook</span>
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
    
    if (typeof window !== 'undefined' && typeof window.openRecipeDrawer === 'function') {
        window.openRecipeDrawer();
    }
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
    
    const container = document.getElementById('recipeContent');
    
    if (typeof window !== 'undefined' && typeof window.openRecipeDrawer === 'function') {
        window.openRecipeDrawer();
    }
    
    if (container) {
        container.innerHTML = `
            <div class="lab-loader">
                <div class="food-loading-container">
                    <img src="fruits.gif" alt="Loading recipes..." class="food-loading-gif" />
                </div>
            </div>
            <div class="no-recipes" style="font-style: normal;">
                <p><strong>Generating recipes with AI…</strong></p>
                <p>The Experimental Kitchen is assembling your tasting menu.</p>
            </div>
        `;
    }
    
    try {
        const recipes = await generateRecipes(selectedIngredients, flavorPreferences, dietaryRestrictions);
        
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
        if (errorMessage.includes('API key')) {
            helpText = '<p>💡 Make sure your OpenAI API key is set in the .env file (OPENAI_API_KEY)</p>';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            helpText = '<p>💡 Check your internet connection</p>';
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
