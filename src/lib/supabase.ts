import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Database types based on the schema
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  encrypted_key: string;
  key_hint?: string;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  type: 'office' | 'retail' | 'apartment' | 'forSale' | 'mixedUse';
  data: any; // JSONB data
  tags?: string[];
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

export interface Scenario {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description?: string;
  data: any; // JSONB data
  results?: any; // JSONB data
  version: number;
  is_active: boolean;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyUsage {
  id: string;
  user_id: string;
  timestamp: string;
  tokens_used?: number;
  endpoint?: string;
  success?: boolean;
}