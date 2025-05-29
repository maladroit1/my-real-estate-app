const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Decryption functions
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

function decrypt(encryptedData) {
  const { encrypted, iv, authTag } = JSON.parse(encryptedData);
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    Buffer.from(ENCRYPTION_KEY, 'hex'), 
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get the authorization token
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Fallback to x-api-key header for backward compatibility
      const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
      if (apiKey) {
        // Old method - direct API key
        return await handleDirectApiKey(event, apiKey);
      }
      
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Missing authorization token' }),
      };
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid authorization token' }),
      };
    }

    // Get user's encrypted API key
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select('encrypted_key')
      .eq('user_id', user.id)
      .single();

    if (keyError || !apiKeyData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No API key found. Please configure your Claude API key in settings.' }),
      };
    }

    // Decrypt the API key
    let apiKey;
    try {
      apiKey = decrypt(apiKeyData.encrypted_key);
    } catch (decryptError) {
      console.error('Error decrypting API key:', decryptError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to decrypt API key' }),
      };
    }

    // Parse request body
    const { action, data, prompt, systemPrompt, model = 'claude-3-haiku-20240307', maxTokens } = JSON.parse(event.body);

    let messages;
    let finalMaxTokens = maxTokens || 1024;

    // Handle different request formats
    if (action && data) {
      // Legacy format with action
      switch (action) {
        case 'analyzeDeal':
          messages = [{ role: 'user', content: data.prompt }];
          finalMaxTokens = 2000;
          break;
        case 'explainCalculation':
          messages = [{ role: 'user', content: data.explainPrompt }];
          finalMaxTokens = 500;
          break;
        default:
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid action' })
          };
      }
    } else if (prompt) {
      // New format with direct prompt
      messages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ];
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing prompt or action' }),
      };
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: finalMaxTokens,
        temperature: 0.3,
        messages,
      }),
    });

    const responseData = await response.json();

    // Log API usage
    const tokensUsed = responseData.usage?.output_tokens || 0;
    await supabase
      .from('api_key_usage')
      .insert({
        user_id: user.id,
        tokens_used: tokensUsed,
        endpoint: '/claude-api',
        success: response.ok,
      });

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('user_id', user.id);

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
        content: responseData.content[0].text,
        usage: responseData.usage
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message || 'Unknown error occurred'
      })
    };
  }
};

// Handle legacy direct API key method
async function handleDirectApiKey(event, apiKey) {
  if (!apiKey.startsWith('sk-ant-')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid API key format' })
    };
  }

  try {
    const { action, data } = JSON.parse(event.body);
    
    let messages;
    let maxTokens;
    
    switch (action) {
      case 'analyzeDeal':
        messages = [{ role: 'user', content: data.prompt }];
        maxTokens = 2000;
        break;
      case 'explainCalculation':
        messages = [{ role: 'user', content: data.explainPrompt }];
        maxTokens = 500;
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

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
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to process request',
        details: error.message || 'Unknown error occurred'
      })
    };
  }
}