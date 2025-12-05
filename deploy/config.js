/**
 * Configuration file for FlavorGraph Recipe Generator
 * 
 * NOTE: API keys are now handled securely in the backend.
 * This file is kept for backwards compatibility but is no longer used.
 * All API calls are made through secure backend endpoints.
 */

// Empty config - API keys are handled in backend
const CONFIG = {};

// No-op loadConfig function for backwards compatibility
async function loadConfig() {
    // API keys are now handled in backend - no need to load them here
    return CONFIG;
}
