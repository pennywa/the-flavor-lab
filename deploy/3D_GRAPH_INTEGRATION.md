# 3D Flavor Graph Integration

## Overview
The 3D Flavor Graph has been successfully integrated into The Flavor Lab website as a new tab. This document provides details about the implementation, file structure, and deployment instructions.

## Folder Structure

```
deploy/
├── index.html                    # Main HTML file (updated with tabs)
├── styles.css                    # Styles (updated with tab and 3D graph CSS)
├── flavor-3d-graph.js            # 3D graph module (NEW)
├── ingr_ingr_hub.json           # Graph dataset (COPIED)
├── network_data_hub.json        # Category mapping (existing)
├── config.js                    # API configuration (existing)
├── recipe-generator.js          # Recipe generator (existing)
├── flavor-sliders.js            # Flavor sliders (existing)
└── [other existing files...]
```

## Files Created/Modified

### 1. `index.html` (Modified)
- Added tab navigation system after the header
- Added two tabs: "Network View" (default) and "3D Flavor Graph"
- Added tab content containers
- Added script tags for 3D force graph library and the new module

### 2. `flavor-3d-graph.js` (New)
- Main module for 3D graph initialization and management
- Handles WebGL context lifecycle
- Implements category-based node coloring
- Manages tab switching and visibility
- Uses UnrealBloomPass for bloom effect

### 3. `styles.css` (Modified)
- Added tab navigation styles
- Added 3D graph container styles
- Responsive design for mobile devices

### 4. `ingr_ingr_hub.json` (Copied)
- Graph dataset with nodes and links
- Located in `deploy/` folder for easy access

## Features

### Tab Navigation
- Two tabs: "Network View" and "3D Flavor Graph"
- Smooth transitions between views
- Active tab highlighting with glow effect
- Responsive design (icons only on mobile)

### 3D Graph Features
- **Bloom Effect**: UnrealBloomPass for glowing nodes
- **Category Coloring**: Nodes colored based on categories from `network_data_hub.json`
- **Interactive**: Hover and click support
- **Performance**: Physics paused when tab is hidden
- **WebGL Management**: Proper context cleanup to prevent errors

### Category Color Mapping
Nodes are colored based on their category:
- Seafood: `#4de4ff` (cyan)
- Grains and Legumes: `#8aff80` (lime)
- Condiments and Seasonings: `#ff62c0` (magenta)
- Vegetables: `#ffd93d` (yellow)
- Fruits: `#ff6b6b` (red)
- Meat: `#ff9f43` (orange)
- Dairy: `#a29bfe` (purple)
- Herbs and Spices: `#fd79a8` (pink)
- Beverages: `#00b894` (teal)
- Nuts and Seeds: `#fdcb6e` (light yellow)
- Oils and Fats: `#e17055` (coral)
- Unknown: `#95a5a6` (gray)

## Technical Details

### WebGL Context Management
- Graph is initialized only when the 3D tab is first opened
- Physics is paused when switching away from the tab
- Graph instance is kept alive for faster tab switching
- Proper cleanup on page unload

### Performance Optimizations
- Physics decay adjusted when tab is hidden
- Graph resizes automatically on window resize
- Single THREE.js instance (via CDN)
- Efficient category lookup using pre-loaded map

### Dependencies
- **3d-force-graph**: Loaded from CDN (`https://cdn.jsdelivr.net/npm/3d-force-graph`)
- **UnrealBloomPass**: Loaded from ESM (`https://esm.sh/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js`)

## Deployment Instructions

### For Netlify/Static Hosting

1. **Ensure all files are in the `deploy/` folder:**
   - `index.html`
   - `styles.css`
   - `flavor-3d-graph.js`
   - `ingr_ingr_hub.json`
   - `network_data_hub.json`
   - All other existing files

2. **Set up Netlify:**
   - Point Netlify to the `deploy/` folder
   - Or set publish directory to `deploy/`

3. **Verify paths:**
   - All relative paths in `index.html` should work
   - Dataset files should be accessible at root level
   - CDN scripts will load automatically

### Local Testing

1. Navigate to the `deploy/` folder
2. Run the Python server: `python3 ../run_server.py`
3. Open `http://localhost:8000/index.html`
4. Click the "3D Flavor Graph" tab to test

## Usage

1. **Opening the 3D Graph:**
   - Click the "3D Flavor Graph" tab in the navigation
   - Graph will initialize on first open
   - Subsequent opens will be faster (graph stays initialized)

2. **Interacting with the Graph:**
   - **Rotate**: Click and drag
   - **Zoom**: Scroll wheel
   - **Pan**: Right-click and drag
   - **Hover**: See node names
   - **Click**: Log node info to console

3. **Switching Tabs:**
   - Click "Network View" to return to the 2D network
   - Graph physics will pause automatically
   - No WebGL context errors

## Troubleshooting

### WebGL Context Errors
- **Issue**: "Too many active WebGL contexts"
- **Solution**: The module properly manages context lifecycle. If errors persist, refresh the page.

### Graph Not Loading
- **Check**: Browser console for errors
- **Verify**: `ingr_ingr_hub.json` is in the `deploy/` folder
- **Verify**: `network_data_hub.json` is accessible
- **Check**: CDN scripts are loading (check Network tab)

### Performance Issues
- **Large graphs**: Physics settings are optimized for performance
- **Slow rendering**: Check browser WebGL support
- **Memory**: Graph is destroyed on page unload

## Future Enhancements

Potential improvements:
- Node search/filter functionality
- Category filter integration
- Node detail panel on click
- Export graph as image
- Custom camera presets

## Notes

- The graph uses the same color scheme as the main Flavor Lab theme
- Category colors match the existing network visualization
- All styling matches the Flavor Lab aesthetic
- Responsive design works on mobile devices


