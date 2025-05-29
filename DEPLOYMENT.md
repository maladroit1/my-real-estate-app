# Deployment Guide for Real Estate Pro Forma App

## Overview

This app now uses a user-provided API key system for Claude AI features. Users will be prompted to enter their own Claude API key when they first use AI features. The key is stored securely in their browser's local storage.

## Deployment to Netlify

### Prerequisites
1. A Netlify account (free at netlify.com)
2. Git repository (GitHub, GitLab, or Bitbucket)
3. Users will need their own Claude API key from console.anthropic.com

### Step 1: Prepare Your Code

1. **No API keys needed in environment**
   - Users provide their own API keys
   - Keys are stored in browser local storage
   - Serverless function validates user-provided keys

2. **Commit your code** (API key is already protected)
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

### Step 2: Deploy to Netlify

#### Option A: Deploy via Netlify UI
1. Log in to [Netlify](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Connect your Git provider and select your repository
4. Build settings will be auto-detected from `netlify.toml`
5. Click "Deploy site"

#### Option B: Deploy via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Step 3: No Environment Variables Needed

The app no longer requires environment variables for API keys. Users will provide their own keys through the UI.

### Step 4: Test Your Deployment

1. Visit your Netlify URL (e.g., https://your-site.netlify.app)
2. Click on any AI feature (AI Insights or Error Detection)
3. You'll be prompted to enter your Claude API key
4. The key is stored in your browser and sent securely with each request

## Local Development

For local development:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm start
   ```

3. For testing serverless functions locally:
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

This will start both your React app and the serverless functions locally.

## Security Features

✅ **User-Owned Keys**: Each user provides and manages their own API key
✅ **Local Storage**: Keys are stored in the user's browser
✅ **Serverless Validation**: Backend validates key format before API calls
✅ **No Shared Keys**: No risk of exposing a shared API key
✅ **Per-User Billing**: Each user's API usage is billed to their own account

## How It Works

1. **First Use**: 
   - User clicks on AI feature
   - Modal prompts for Claude API key
   - Key is validated and stored in localStorage
   - Future sessions remember the key

2. **API Calls**:
   - Frontend sends requests to `/api/claude-api`
   - User's API key included in request headers
   - Serverless function validates and forwards to Claude
   - Results returned to user

## Troubleshooting

1. **"API key required" error**
   - User needs to enter their Claude API key
   - Keys must start with "sk-ant-"
   - Get keys from console.anthropic.com

2. **Function not found**
   - Check that `netlify/functions/claude-api.js` exists
   - Verify `netlify.toml` is in your root directory

3. **CORS errors**
   - The function is configured to work with Netlify's proxy
   - Make sure you're using relative URLs (`/api/claude-api`)

## Cost Considerations

- **Netlify Free Tier**: 125k function requests/month
- **Claude API**: Each user pays for their own usage
- Users can monitor usage in their Anthropic dashboard

## User Instructions

### For End Users:
1. Get your Claude API key from [console.anthropic.com](https://console.anthropic.com)
2. When prompted in the app, enter your API key
3. Your key is stored locally and never shared
4. You're responsible for your own API usage and costs