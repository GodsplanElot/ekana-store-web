import "server-only"

import { createClient } from "@supabase/supabase-js"
import { getOptionalEnv } from "@/lib/server/env"

export function createSupabaseAdmin() {
  const url = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL")
  const key = getOptionalEnv("SUPABASE_SECRET_KEY")

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
