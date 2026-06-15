/**
 * supabaseClient.js
 * Initializes and exports the Supabase client for use throughout the app.
 * Uses environment variables set in .env (VITE_ prefix for Vite to expose them).
 */
import { createClient } from '@supabase/supabase-js'

// Supabase project URL and anonymous key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

/**
 * Supabase client instance.
 * Import this wherever you need to interact with Supabase Auth, Database, or Storage.
 *
 * Usage:
 *   import { supabase } from '../supabaseClient'
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
