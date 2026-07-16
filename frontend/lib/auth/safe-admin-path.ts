const defaultAdminPath = '/admin'
const adminPathOrigin = 'https://admin-path.invalid'
const encodedPathSeparatorPattern = /%(?:25)*(?:2f|5c)/i
const controlCharacterPattern = /[\u0000-\u001f\u007f]/

function isAdminPath(pathname: string) {
  return pathname === defaultAdminPath || pathname.startsWith(defaultAdminPath + '/')
}

export function getSafeAdminPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    controlCharacterPattern.test(value)
  ) {
    return defaultAdminPath
  }

  const pathEnd = value.search(/[?#]/)
  const rawPath = pathEnd === -1 ? value : value.slice(0, pathEnd)

  if (encodedPathSeparatorPattern.test(rawPath)) {
    return defaultAdminPath
  }

  try {
    const decodedPath = decodeURIComponent(rawPath)
    const target = new URL(value, adminPathOrigin)
    const decodedTarget = new URL(decodedPath, adminPathOrigin)

    if (
      target.origin !== adminPathOrigin ||
      decodedTarget.origin !== adminPathOrigin ||
      !isAdminPath(target.pathname) ||
      !isAdminPath(decodedTarget.pathname)
    ) {
      return defaultAdminPath
    }

    return target.pathname + target.search + target.hash
  } catch {
    return defaultAdminPath
  }
}
