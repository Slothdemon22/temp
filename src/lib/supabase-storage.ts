/**
 * Supabase Storage Server Client
 * 
 * This module provides secure server-side access to Supabase Storage.
 * 
 * CRITICAL SECURITY:
 * - Uses SUPABASE_SERVICE_ROLE_KEY (never exposed to client)
 * - All uploads happen on the server
 * - Client never sees service role key
 * 
 * Why server-side uploads:
 * - Service role key has admin access - must stay on server
 * - Prevents unauthorized access to storage
 * - Allows server-side validation and security checks
 * - Enables proper error handling and logging
 */

import { createClient } from '@supabase/supabase-js'

// Check if we're in build phase (environment variables may not be available)
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                     (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SUPABASE_URL)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || (isBuildPhase ? 'https://placeholder.supabase.co' : '')
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (isBuildPhase ? 'placeholder-key' : '')

// Only throw error if not in build phase
if (!isBuildPhase) {
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
      'This is required for server-side storage operations.'
    )
  }
}

/**
 * Create Supabase client with service role key
 * 
 * Service role key bypasses RLS (Row Level Security) and has admin access.
 * This is safe because it's ONLY used on the server, never exposed to clients.
 * 
 * Note: Environment variables are checked at runtime, not build time,
 * allowing the build to complete even if env vars are missing.
 */
export function createStorageClient() {
  // Re-check at runtime if we used placeholders during build
  const runtimeUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const runtimeKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!runtimeUrl || !runtimeKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(runtimeUrl, runtimeKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

