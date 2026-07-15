function getPublicEmail(value: string | undefined) {
  const email = value?.trim()
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? email
    : null
}

function getPublicUrl(value: string | undefined) {
  if (!value) return null

  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export const publicSiteConfig = {
  supportEmail: getPublicEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL),
  instagramUrl: getPublicUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL),
  pinterestUrl: getPublicUrl(process.env.NEXT_PUBLIC_PINTEREST_URL),
}
