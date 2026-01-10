import { createClient } from '@supabase/supabase-js'

// Check if we're in build phase (environment variables may not be available)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                     process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (isBuildPhase ? 'https://placeholder.supabase.co' : '')
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || (isBuildPhase ? 'placeholder-key' : '')

// Only throw error if not in build phase
if (!isBuildPhase && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

