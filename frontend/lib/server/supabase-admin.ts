import { createClient } from "@supabase/supabase-js"
import { getOptionalEnv } from "@/lib/server/env"

export function createSupabaseAdmin() {
  const url = getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL")
  const key = getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY")

  if (!url || !key) {
    return null
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
