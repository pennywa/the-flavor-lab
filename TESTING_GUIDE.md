# Recipe Generation Testing Guide

## Quick Test Steps

1. **Start the server:**
   ```bash
   python run_server.py
   ```
   You should see:
   - "Server running at http://localhost:8000/"
   - "✅ Loading API keys from: [path to .env]"

2. **Open the app:**
   - Go to http://localhost:8000/index.html
   - Open browser DevTools (F12) and check the Console tab

3. **Test recipe generation:**
   - Click on some ingredients in the 3D graph
   - Adjust flavor sliders if desired
   - Click "Generate Recipes" button

4. **Check for errors:**
   - **Browser Console (F12):** Look for error messages starting with ❌
   - **Server Terminal:** Look for error messages or success messages

## Common Issues and Fixes

### Issue: "OpenAI API key not configured"
**Fix:** Make sure your `.env` file exists in the project root with:
```
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4o-mini
PEXELS_API_KEY=your-key-here
```

### Issue: "Failed to parse JSON"
**Fix:** Check server terminal for the actual OpenAI response. The server now logs more details.

### Issue: No recipes appear
**Check:**
1. Browser console for JavaScript errors
2. Server terminal for API errors
3. Network tab in DevTools to see if the request reached the server

## Debugging

The code now includes extensive logging:
- 🔒 = Secure API call
- ✅ = Success
- ❌ = Error
- ⚠️ = Warning

Check both browser console and server terminal for these indicators.

