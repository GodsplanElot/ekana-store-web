export function getOptionalEnv(name: string) {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

export function isSupabaseConfigured() {
  return Boolean(
    getOptionalEnv("NEXT_PUBLIC_SUPABASE_URL") &&
      getOptionalEnv("SUPABASE_SERVICE_ROLE_KEY")
  )
}

export function isDevAuthBypassEnabled() {
  return (
    getOptionalEnv("EKANA_DEV_AUTH_BYPASS") === "true" &&
    getOptionalEnv("VERCEL_ENV") !== "production"
  )
}
