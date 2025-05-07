import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Try to get environment variables from different sources
let SUPABASE_URL;
let SUPABASE_ANON_KEY;

try {
  // First try to get from @env
  const env = require('@env');
  SUPABASE_URL = env.SUPABASE_URL;
  SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
} catch (error) {
  console.log('Could not load environment variables from @env, using fallback');

  // Fallback to hardcoded values from .env file
  SUPABASE_URL = 'https://njeniplcxcjrshjchmjb.supabase.co';
  SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZW5pcGxjeGNqcnNoamNobWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NTAzNzEsImV4cCI6MjA1NzAyNjM3MX0.DADfq5-0nbGI_qO-LrojwkqUo9ua1anyS1YQUsLr3KM';
}

// Initialize the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
