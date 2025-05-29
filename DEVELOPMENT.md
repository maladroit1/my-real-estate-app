# Development Setup

## Running Locally with AI Features

To run the app locally with AI features working, you need to use Netlify Dev:

1. Install Netlify CLI (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

2. Run the development server:
   ```bash
   netlify dev
   ```

This will start:
- React app on http://localhost:3000
- Netlify functions on http://localhost:8888

The Netlify Dev server handles the routing between the React app and the serverless functions.

## Alternative: Run without AI features

If you just want to run the React app without AI features:
```bash
npm start
```

## Debugging AI Features

1. Open browser console (F12)
2. Look for console logs when clicking "AI Insights" button
3. Check the Network tab for API calls to `/api/claude-api`
4. Use the "Test API Connection" button in the AI Analysis section to verify your API key is working

## Common Issues

- **API calls failing locally**: Make sure you're running `netlify dev` not `npm start`
- **401 Unauthorized**: Check that your Claude API key is correctly entered and starts with `sk-ant-`
- **Network errors**: Ensure the Netlify Dev server is running on port 8888