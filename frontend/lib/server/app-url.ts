import "server-only"

export function getConfiguredAppOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!configuredUrl) return null

  try {
    const url = new URL(configuredUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.origin
  } catch {
    return null
  }
}
