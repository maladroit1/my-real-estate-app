const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Encryption functions
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get the authorization token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    // Parse the request body
    const { apiKey } = JSON.parse(event.body);
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid API key format' }),
      };
    }

    // Encrypt the API key
    const encryptedData = encrypt(apiKey);
    const encryptedKey = JSON.stringify(encryptedData);
    
    // Get the last 4 characters for the hint
    const keyHint = apiKey.slice(-4);

    // Check if user already has an API key
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingKey) {
      // Update existing key
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({
          encrypted_key: encryptedKey,
          key_hint: keyHint,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating API key:', updateError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to update API key' }),
        };
      }
    } else {
      // Insert new key
      const { error: insertError } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          encrypted_key: encryptedKey,
          key_hint: keyHint,
        });

      if (insertError) {
        console.error('Error inserting API key:', insertError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to save API key' }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, keyHint }),
    };
  } catch (error) {
    console.error('Error in save-api-key function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};