/**
 * 3D Flavor Graph - Bloom Effect Implementation
 * Based on bloom-effect/index.html
 */

import { UnrealBloomPass } from 'https://esm.sh/three/examples/jsm/postprocessing/UnrealBloomPass.js';

let graphInstance = null;
let isInitialized = false;
let categoryMap = null;

// Category color mapping - matches Flavor Lab theme
function getCategoryColor(category) {
    const colorMap = {
        'Seafood': '#4de4ff',
        'Grains and Legumes': '#8aff80',
        'Condiments and Seasonings': '#ff62c0',
        'Vegetables': '#ffd93d',
        'Vegetables and Herbs': '#ffd93d',
        'Fruits': '#ff6b6b',
        'Meat': '#ff9f43',
        'Dairy': '#a29bfe',
        'Herbs and Spices': '#fd79a8',
        'Beverages': '#00b894',
        'Nuts and Seeds': '#fdcb6e',
        'Oils and Fats': '#e17055',
        'Grains': '#74b9ff',
        'Legumes': '#55efc4',
        'Unknown': '#95a5a6'
    };
    return colorMap[category] || colorMap['Unknown'];
}

/**
 * Load category mapping from network_data_hub.json
 */
async function loadCategoryMap() {
    if (categoryMap) return categoryMap;
    
    try {
        const response = await fetch('network_data_hub.json');
        const data = await response.json();
        categoryMap = data.categories || {};
        return categoryMap;
    } catch (error) {
        console.error('Error loading category map:', error);
        return {};
    }
}

/**
 * Initialize the 3D graph
 */
async function initializeGraph() {
    if (isInitialized && graphInstance) {
        console.log('Graph already initialized');
        return;
    }
    
    const container = document.getElementById('flavor-3d-graph-container');
    if (!container) {
        console.error('3D graph container not found');
        return;
    }
    
    try {
        // Load category map
        await loadCategoryMap();
        
        // Load graph data
        const response = await fetch('ingr_ingr_hub.json');
        const graphData = await response.json();
        
        // Create graph instance
        graphInstance = ForceGraph3D()
            .nodeLabel('name')
            .nodeVal(node => {
                // Set node size to 40
                return 40;
            })
            .nodeColor(node => {
                // Match node by name to categoryMap
                const nodeName = node.name || node.id;
                const categoryInfo = categoryMap[nodeName];
                
                if (categoryInfo) {
                    // Use color from network_data_hub.json if available, otherwise use category color
                    if (categoryInfo.color) {
                        return categoryInfo.color;
                    } else if (categoryInfo.category) {
                        return getCategoryColor(categoryInfo.category);
                    }
                }
                
                // Unknown category - use distinct gray color
                return '#95a5a6';
            })
            .linkWidth(1)
            .linkDirectionalParticles(2)
            .linkDirectionalParticleWidth(2)
            .linkDirectionalParticleSpeed(0.01)
            .onNodeClick(node => {
                console.log('Clicked node:', node);
            })
            (container);
        
        // Add bloom effect
        const bloomPass = new UnrealBloomPass();
        bloomPass.strength = 1.5;
        bloomPass.radius = 1;
        bloomPass.threshold = 0.6;
        
        // Set graph data
        graphInstance.graphData(graphData);
        
        // Configure physics
        graphInstance.d3Force('charge').strength(-300);
        graphInstance.d3Force('link').distance(50);
        
        isInitialized = true;
        console.log('✓ 3D graph initialized');
        
    } catch (error) {
        console.error('Error initializing 3D graph:', error);
    }
}

/**
 * Show the 3D graph popout
 */
async function showGraphPanel() {
    const popout = document.getElementById('3d-graph-popout');
    const overlay = document.getElementById('3d-graph-overlay');
    
    if (!popout || !overlay) {
        console.error('3D graph popout elements not found');
        return;
    }
    
    // Show header and close button
    const header = popout.querySelector('.graph-popout-header');
    const closeBtn = document.getElementById('close3DGraphBtn');
    if (header) header.style.display = 'flex';
    if (closeBtn) closeBtn.style.display = 'inline-flex';
    
    // Show overlay and popout
    overlay.classList.add('active');
    popout.classList.add('active');
    
    // Wait a bit for popout animation, then initialize graph
    setTimeout(async () => {
        // Initialize graph if not already done
        if (!isInitialized) {
            await initializeGraph();
        }
        
        // Resize graph when popout opens
        if (graphInstance) {
            const container = document.getElementById('flavor-3d-graph-container');
            if (container) {
                const width = container.offsetWidth;
                const height = container.offsetHeight;
                if (width > 0 && height > 0) {
                    graphInstance.width(width);
                    graphInstance.height(height);
                }
            }
        }
    }, 100);
}

/**
 * Destroy the graph instance completely
 */
function destroyGraph() {
    if (graphInstance) {
        try {
            // Stop physics immediately
            if (graphInstance.d3AlphaDecay) {
                graphInstance.d3AlphaDecay(1); // Stop animation
            }
            
            // Pause rendering
            if (graphInstance.pauseAnimation) {
                graphInstance.pauseAnimation();
            }
            
            // Clear the container
            const container = document.getElementById('flavor-3d-graph-container');
            if (container) {
                // Remove all child elements
                while (container.firstChild) {
                    container.removeChild(container.firstChild);
                }
            }
            
            // Destroy the graph instance if method exists
            if (typeof graphInstance._destructor === 'function') {
                graphInstance._destructor();
            } else if (typeof graphInstance.destroy === 'function') {
                graphInstance.destroy();
            }
            
            graphInstance = null;
            isInitialized = false;
            console.log('✓ 3D graph destroyed and stopped');
        } catch (error) {
            console.error('Error destroying graph:', error);
            // Force cleanup even if there's an error
            graphInstance = null;
            isInitialized = false;
        }
    }
}

/**
 * Hide the 3D graph popout and stop the graph
 */
function hideGraphPanel() {
    const popout = document.getElementById('3d-graph-popout');
    const overlay = document.getElementById('3d-graph-overlay');
    
    // Destroy graph when closing
    destroyGraph();
    
    // Hide header and close button
    const header = popout.querySelector('.graph-popout-header');
    const closeBtn = document.getElementById('close3DGraphBtn');
    if (header) header.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';
    
    if (popout) popout.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Handle window resize
 */
function handleResize() {
    if (graphInstance) {
        const container = document.getElementById('flavor-3d-graph-container');
        if (container) {
            graphInstance.width(container.offsetWidth);
            graphInstance.height(container.offsetHeight);
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for ForceGraph3D to load
        const checkForceGraph = setInterval(() => {
            if (typeof ForceGraph3D !== 'undefined') {
                clearInterval(checkForceGraph);
                setupEventListeners();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkForceGraph);
            setupEventListeners();
        }, 5000);
    });
} else {
    setupEventListeners();
}

function setupEventListeners() {
    // Open button
    const openBtn = document.getElementById('open3DGraphBtn');
    if (openBtn) {
        openBtn.addEventListener('click', showGraphPanel);
    }
    
    // Close button
    const closeBtn = document.getElementById('close3DGraphBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hideGraphPanel);
    }
    
    // Overlay click to close
    const overlay = document.getElementById('3d-graph-overlay');
    if (overlay) {
        overlay.addEventListener('click', hideGraphPanel);
    }
    
    window.addEventListener('resize', handleResize);
}
