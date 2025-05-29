# Deployment Guide for Real Estate Pro Forma App

## Secure Deployment to Netlify

### Prerequisites
1. A Netlify account (free at netlify.com)
2. Your Claude API key from console.anthropic.com
3. Git repository (GitHub, GitLab, or Bitbucket)

### Step 1: Prepare Your Code

1. **Remove any hardcoded API keys** from your code
   - The app now uses serverless functions to protect your API key
   - API key is only stored in Netlify environment variables

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

### Step 3: Set Environment Variables

1. In Netlify Dashboard, go to your site
2. Navigate to **Site Settings** > **Environment Variables**
3. Add the following variable:
   - Key: `CLAUDE_API_KEY`
   - Value: Your Claude API key (sk-ant-api...)
   - Scopes: Select all (Production, Preview, etc.)

### Step 4: Test Your Deployment

1. Visit your Netlify URL (e.g., https://your-site.netlify.app)
2. The AI features will now work without exposing your API key
3. The API key is securely stored on Netlify's servers

## Local Development

For local development with the serverless function:

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Create `.env` file (already in .gitignore):
   ```
   CLAUDE_API_KEY=your_api_key_here
   ```

3. Run with Netlify Dev:
   ```bash
   netlify dev
   ```

This will start both your React app and the serverless functions locally.

## Security Features

✅ **API Key Protection**: Your Claude API key is never exposed to the client
✅ **Serverless Functions**: All API calls go through secure server-side functions
✅ **Environment Variables**: Sensitive data stored in Netlify's secure environment
✅ **Automatic Detection**: App automatically uses secure mode when deployed
✅ **Local Development**: Can still use direct API for faster development locally

## How It Works

1. **In Production**: 
   - Frontend calls `/api/claude-api`
   - Netlify function receives the request
   - Function uses the API key from environment variables
   - Function calls Claude API and returns results
   - API key never reaches the browser

2. **In Development**:
   - Can use either local API key or Netlify Dev
   - Automatic detection based on hostname

## Troubleshooting

1. **"API key not configured" error**
   - Make sure you've set CLAUDE_API_KEY in Netlify environment variables
   - Redeploy after setting environment variables

2. **Function not found**
   - Check that `netlify/functions/claude-api.js` exists
   - Verify `netlify.toml` is in your root directory

3. **CORS errors**
   - The function is configured to work with Netlify's proxy
   - Make sure you're using relative URLs (`/api/claude-api`)

## Cost Considerations

- **Netlify Free Tier**: 125k function requests/month
- **Claude API**: Pay per token as usual
- Monitor usage in both Netlify and Anthropic dashboards