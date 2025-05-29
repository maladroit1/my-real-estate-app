let Anthropic;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (error) {
  console.error('Failed to load Anthropic SDK:', error);
  exports.handler = async (event, context) => {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Server configuration error',
        details: 'Anthropic SDK not found. Please ensure @anthropic-ai/sdk is installed.'
      })
    };
  };
  return;
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key from request headers
  const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
  
  if (!apiKey) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'API key required. Please provide your Claude API key.' })
    };
  }
  
  if (!apiKey.startsWith('sk-ant-')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid API key format' })
    };
  }

  try {
    const { action, data } = JSON.parse(event.body);
    
    console.log('Received action:', action);
    console.log('API key length:', apiKey.length);
    
    const anthropic = new Anthropic({
      apiKey: apiKey
    });

    let response;

    switch (action) {
      case 'analyzeDeal':
        const { prompt } = data;
        response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 2000,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: prompt
          }]
        });
        break;
        
      case 'explainCalculation':
        const { explainPrompt } = data;
        response = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: explainPrompt
          }]
        });
        break;
        
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: response.content[0].text
      })
    };

  } catch (error) {
    console.error('Claude API error:', error);
    console.error('Error stack:', error.stack);
    
    // Check for specific error types
    if (error.status === 401) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          error: 'Authentication failed. Please check your API key.',
          details: error.message 
        })
      };
    }
    
    if (error.status === 429) {
      return {
        statusCode: 429,
        body: JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          details: error.message 
        })
      };
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message || 'Unknown error occurred'
      })
    };
  }
};