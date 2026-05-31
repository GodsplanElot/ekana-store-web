import type { NextRequest } from "next/server"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { getOptionalEnv } from "@/lib/server/env"

export async function isAdminRequest(request: NextRequest) {
  const configuredToken = getOptionalEnv("ADMIN_API_TOKEN")
  const authorization = request.headers.get("authorization")
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined

  if (configuredToken && bearerToken === configuredToken) {
    return true
  }

  const allowedEmails = getOptionalEnv("ADMIN_EMAILS")
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (!bearerToken || !allowedEmails?.length) {
    return false
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) return false

  const { data, error } = await supabase.auth.getUser(bearerToken)
  if (error || !data.user.email) return false

  return allowedEmails.includes(data.user.email.toLowerCase())
}
