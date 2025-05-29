// Test function to verify Netlify Functions are working
exports.handler = async (event, context) => {
  // Check if environment variables are accessible
  const hasSupabaseUrl = !!process.env.REACT_APP_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasEncryptionKey = !!process.env.ENCRYPTION_KEY;
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Enable CORS
    },
    body: JSON.stringify({
      message: "Netlify Functions are working!",
      environment: {
        hasSupabaseUrl,
        hasServiceKey,
        hasEncryptionKey,
        // Never expose actual keys, just confirm they exist
      },
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      path: event.path,
    })
  };
};