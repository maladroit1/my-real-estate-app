const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key from environment variable
  const apiKey = process.env.CLAUDE_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { action, data } = JSON.parse(event.body);
    
    const anthropic = new Anthropic({
      apiKey: apiKey
    });

    let response;

    switch (action) {
      case 'analyzeDeal':
        const { prompt } = data;
        response = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
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
          model: 'claude-3-sonnet-20240229',
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
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message 
      })
    };
  }
};