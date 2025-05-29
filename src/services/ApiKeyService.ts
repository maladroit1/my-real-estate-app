import { supabase } from '../lib/supabase';

export class ApiKeyService {
  /**
   * Save or update user's API key (encrypted on server side)
   */
  static async saveApiKey(apiKey: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Call Netlify function to encrypt and save the API key
    const response = await fetch('/.netlify/functions/save-api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ apiKey }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save API key');
    }
  }

  /**
   * Get the user's API key hint (last 4 characters)
   */
  static async getApiKeyHint(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('api_keys')
      .select('key_hint')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data?.key_hint || null;
  }

  /**
   * Check if user has an API key configured
   */
  static async hasApiKey(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { count, error } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error checking API key:', error);
      return false;
    }

    return (count || 0) > 0;
  }

  /**
   * Delete user's API key
   */
  static async deleteApiKey(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Call Claude API through Netlify function (which decrypts the API key)
   */
  static async callClaudeAPI(prompt: string, systemPrompt?: string): Promise<any> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('User not authenticated');

    const response = await fetch('/.netlify/functions/claude-api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ prompt, systemPrompt }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to call Claude API');
    }

    return response.json();
  }

  /**
   * Log API usage
   */
  static async logApiUsage(tokensUsed: number, endpoint: string, success: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // This will be called from the Netlify function with service role
    await supabase
      .from('api_key_usage')
      .insert({
        user_id: user.id,
        tokens_used: tokensUsed,
        endpoint,
        success,
      });
  }

  /**
   * Get API usage statistics
   */
  static async getApiUsage(days: number = 30): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('api_key_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Calculate statistics
    const totalTokens = data.reduce((sum, usage) => sum + (usage.tokens_used || 0), 0);
    const totalCalls = data.length;
    const successfulCalls = data.filter(usage => usage.success).length;

    return {
      usage: data,
      statistics: {
        totalTokens,
        totalCalls,
        successfulCalls,
        failedCalls: totalCalls - successfulCalls,
        successRate: totalCalls > 0 ? (successfulCalls / totalCalls * 100).toFixed(1) : 0,
      },
    };
  }
}