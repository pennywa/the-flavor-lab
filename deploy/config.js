/**
 * Configuration file for FlavorGraph Recipe Generator
 * 
 * SECURITY: API keys are loaded from the server at runtime.
 * Keys are stored in .env file on the server and never exposed in client code.
 * 
 * The server endpoint /api/config returns the keys securely.
 */

const CONFIG = {
    // API keys are loaded from server at runtime
    GEMINI_API_KEY: '',
    GEMINI_MODEL: 'gemini-2.5-flash',
    PEXELS_API_KEY: ''
};

// Flag to track if config has been loaded
let configLoaded = false;
let configLoadPromise = null;

/**
 * Load API keys from server endpoint at runtime
 * This is the most secure approach - keys never exist in client-side code
 */
async function loadConfig() {
    // Return existing promise if already loading
    if (configLoadPromise) {
        return configLoadPromise;
    }
    
    configLoadPromise = (async () => {
        try {
            const res = await fetch('/api/config');
            
            if (!res.ok) {
                throw new Error(`Failed to load config: ${res.status} ${res.statusText}`);
            }
            
            const data = await res.json();
            
            // Update CONFIG object with keys from server
            CONFIG.GEMINI_API_KEY = data.GEMINI_API_KEY || '';
            CONFIG.GEMINI_MODEL = data.GEMINI_MODEL || 'gemini-2.5-flash';
            CONFIG.PEXELS_API_KEY = data.PEXELS_API_KEY || '';
            
            configLoaded = true;
            
            console.log('✅ API keys loaded from server');
            console.log(`   GEMINI_API_KEY: ${CONFIG.GEMINI_API_KEY ? 'Set (' + CONFIG.GEMINI_API_KEY.substring(0, 10) + '...)' : 'NOT SET'}`);
            console.log(`   GEMINI_MODEL: ${CONFIG.GEMINI_MODEL}`);
            console.log(`   PEXELS_API_KEY: ${CONFIG.PEXELS_API_KEY ? 'Set (' + CONFIG.PEXELS_API_KEY.substring(0, 10) + '...)' : 'NOT SET'}`);
            
            return CONFIG;
        } catch (error) {
            console.error('❌ Failed to load API keys from server:', error);
            console.warn('⚠️  API keys not loaded. Recipe generation will not work.');
            console.warn('   Make sure the server is running and .env file exists with API keys.');
            configLoaded = false;
            throw error;
        }
    })();
    
    return configLoadPromise;
}

// Automatically load config when this file is loaded
// This ensures keys are available before recipe-generator.js runs
loadConfig().catch(err => {
    // Error already logged in loadConfig
});

