# AI Features Setup Instructions

## What I've Found

The AI insights feature is fully implemented but requires running the app with Netlify Dev to work locally. Here's what's happening:

1. **API Key Storage**: Your Claude API key is being stored correctly in localStorage
2. **API Endpoint**: The app tries to call `/api/claude-api` which is a Netlify serverless function
3. **Local Development Issue**: When running with `npm start`, the API calls fail because there's no server to handle the `/api/claude-api` endpoint

## Solution: Use Netlify Dev

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Run with Netlify Dev
```bash
netlify dev
```

This will:
- Start the React app on http://localhost:3000
- Start Netlify functions server on http://localhost:8888
- Proxy API requests from the React app to the functions server

### Step 3: Test AI Features
1. Click the "AI Insights" button in the AI Analysis section
2. Click "Get AI Insights" in the modal that appears
3. Use the "Test API Connection" button to verify your API key is working

## Production Deployment

When deployed to Netlify, the AI features will work automatically because:
- Netlify serves the functions at `/.netlify/functions/*`
- The `netlify.toml` redirects `/api/*` to `/.netlify/functions/*`
- No additional configuration needed

## Troubleshooting

If AI insights still don't work:
1. Check browser console for errors
2. Verify your API key starts with `sk-ant-`
3. Make sure you're running `netlify dev` not `npm start`
4. Check Network tab in browser DevTools to see if API calls are being made

## Remove Test Button

Once AI features are working, you can remove the test button by deleting the TestAPIButton import and usage from RealEstateProFormaV2.tsx