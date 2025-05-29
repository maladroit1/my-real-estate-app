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
    
    let messages;
    let maxTokens;
    
    switch (action) {
      case 'analyzeDeal':
        const { prompt } = data;
        messages = [{ role: 'user', content: prompt }];
        maxTokens = 2000;
        break;
        
      case 'explainCalculation':
        const { explainPrompt } = data;
        messages = [{ role: 'user', content: explainPrompt }];
        maxTokens = 500;
        break;
        
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    // Make direct HTTP request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        temperature: 0.3,
        messages: messages
      })
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Anthropic API error:', responseData);
      
      if (response.status === 401) {
        return {
          statusCode: 401,
          body: JSON.stringify({ 
            error: 'Authentication failed. Please check your API key.',
            details: responseData.error?.message || 'Invalid API key'
          })
        };
      }
      
      if (response.status === 429) {
        return {
          statusCode: 429,
          body: JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again later.',
            details: responseData.error?.message || 'Too many requests'
          })
        };
      }
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: 'API request failed',
          details: responseData.error?.message || 'Unknown error'
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: responseData.content[0].text
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message || 'Unknown error occurred'
      })
    };
  }
};