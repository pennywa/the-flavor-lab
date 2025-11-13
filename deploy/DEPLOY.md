# Deployment Guide

## Quick Deploy to Netlify (Easiest - 2 minutes)

1. Go to https://app.netlify.com/drop
2. Drag and drop the `deploy` folder (or just the two files: `index.html` and `network_data.json`)
3. Wait for deployment (usually 10-30 seconds)
4. You'll get a public URL like: `https://random-name-123.netlify.app`
5. Share this URL with anyone!

## Deploy to GitHub Pages (Free, Permanent)

1. Create a new GitHub repository
2. Upload the files from the `deploy` folder to the repository
3. Go to Settings > Pages
4. Select the main branch and `/ (root)` folder
5. Your site will be available at: `https://yourusername.github.io/repository-name/`

## Deploy to Vercel (Also Easy)

1. Install Vercel CLI: `npm i -g vercel`
2. In the `deploy` folder, run: `vercel`
3. Follow the prompts
4. Get your public URL

## Files Included

- `index.html` - The main interactive network visualization
- `network_data.json` - The ingredient network data (2MB)

## Notes

- The site is completely static (no server needed)
- Works on any static hosting service
- No API keys or configuration needed
- All dependencies are loaded from CDN

