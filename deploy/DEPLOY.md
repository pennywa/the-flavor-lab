# Deployment Guide

## Quick Deploy to Netlify (Easiest - 2 minutes)

1. Go to https://app.netlify.com/drop
2. Drag and drop the entire `deploy` folder
3. Wait for deployment (usually 10-30 seconds)
4. You'll get a public URL like: `https://random-name-123.netlify.app`
5. Share this URL with anyone!

**Important:** After deployment, you'll need to create a `config.js` file on Netlify with your Gemini API key:
- Go to Netlify dashboard > Site settings > Build & deploy > Environment variables
- Or create `config.js` directly in the deployed site (if Netlify supports file editing)

## Deploy to GitHub Pages (Free, Permanent)

1. Create a new GitHub repository
2. Upload all files from the `deploy` folder to the repository
3. Go to Settings > Pages
4. Select the main branch and `/ (root)` folder
5. Your site will be available at: `https://yourusername.github.io/repository-name/`

**Note:** Make sure to create `config.js` with your API key (it's gitignored, so you'll need to add it manually after deployment)

## Deploy to Vercel (Also Easy)

1. Install Vercel CLI: `npm i -g vercel`
2. In the `deploy` folder, run: `vercel`
3. Follow the prompts
4. Get your public URL
5. Add your `config.js` file with API key via Vercel dashboard or CLI

## Files to Deploy

Required files:
- `index.html` - Main application file
- `styles.css` - All CSS styles
- `network_data_hub.json` - Ingredient network data (~8MB)
- `recipe-generator.js` - AI recipe generation logic
- `flavor-sliders.js` - Flavor slider UI logic
- `config.js` - API configuration (create this with your Gemini API key)

## Setting Up config.js

Create a `config.js` file in the `deploy` folder with:

```javascript
const CONFIG = {
    GEMINI_API_KEY: 'your-api-key-here',
    GEMINI_MODEL: 'gemini-2.5-flash'
};
```

Replace `'your-api-key-here'` with your actual Gemini API key.

## Notes

- The site is completely static (no server needed)
- Works on any static hosting service
- **API key required** for recipe generation feature
- All dependencies are loaded from CDN
- The `config.js` file is gitignored for security

