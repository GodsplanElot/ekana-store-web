import "server-only"

import { createClient } from "@supabase/supabase-js"
import { getOptionalEnv } from "@/lib/server/env"

/**
 * Creates a cookie-free Supabase client that always uses the public API role.
 * Use this for server-side catalogue reads that must be constrained by RLS.
 */
export function createSupabasePublicClient() {
  const url = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL")
  const key = getOptionalEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")

  if (!url || !key) {
    return null
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
