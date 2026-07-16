import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const REQUIRED_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
]

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local")
let failedChecks = 0

function parseEnvValue(rawValue) {
  const value = rawValue.trim()
  const quote = value.at(0)

  if ((quote === '"' || quote === "'") && value.at(-1) === quote) {
    return value.slice(1, -1)
  }

  const commentIndex = value.search(/\s+#/)
  return (commentIndex === -1 ? value : value.slice(0, commentIndex)).trim()
}

function parseSelectedEnv(source) {
  const values = {}

  for (const line of source.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match || !REQUIRED_ENV_NAMES.includes(match[1])) continue
    values[match[1]] = parseEnvValue(match[2])
  }

  return values
}

async function loadSelectedEnv() {
  const source = await readFile(envPath, "utf8")
  const fileValues = parseSelectedEnv(source)

  return Object.fromEntries(
    REQUIRED_ENV_NAMES.map((name) => [
      name,
      process.env[name]?.trim() || fileValues[name],
    ])
  )
}

function requireSupabaseOrigin(value) {
  const url = new URL(value)
  const hasValidProtocol = url.protocol === "https:" || url.protocol === "http:"
  const hasOnlyOrigin = url.pathname === "/" && !url.search && !url.hash

  if (!hasValidProtocol || !hasOnlyOrigin || url.username || url.password) {
    throw new Error("Invalid Supabase URL")
  }

  return url.origin
}

function hasModernKeyFormat(value, prefix) {
  return (
    typeof value === "string" &&
    value.startsWith(prefix) &&
    value.length > prefix.length &&
    !/\s/.test(value)
  )
}

function pass(label) {
  console.log(`PASS  ${label}`)
}

function fail(label) {
  failedChecks += 1
  console.error(`FAIL  ${label}`)
}

async function check(label, operation) {
  try {
    await operation()
    pass(label)
  } catch {
    fail(label)
  }
}

function fetchWithTimeout(input, init) {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  })
}

function createVerificationClient(url, key) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetchWithTimeout,
    },
  })
}

async function requirePermissionDenied(client, table) {
  const { error } = await client.from(table).select("id").limit(1)
  if (!error || error.code !== "42501") {
    throw new Error("Expected permission denial")
  }
}

async function main() {
  let config

  try {
    const env = await loadSelectedEnv()
    const url = requireSupabaseOrigin(env.NEXT_PUBLIC_SUPABASE_URL)
    const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const secretKey = env.SUPABASE_SECRET_KEY

    if (
      !hasModernKeyFormat(publishableKey, "sb_publishable_") ||
      !hasModernKeyFormat(secretKey, "sb_secret_")
    ) {
      throw new Error("Legacy or invalid API key format")
    }

    config = { url, publishableKey, secretKey }
    pass("Modern local Supabase configuration")
  } catch {
    fail("Modern local Supabase configuration")
    console.error("Supabase verification stopped before network checks.")
    process.exitCode = 1
    return
  }

  const publicClient = createVerificationClient(config.url, config.publishableKey)
  const secretClient = createVerificationClient(config.url, config.secretKey)

  await check("Auth API accepts the publishable key", async () => {
    const response = await fetchWithTimeout(
      new URL("/auth/v1/settings", config.url),
      { headers: { apikey: config.publishableKey } }
    )
    if (!response.ok) throw new Error("Auth API request failed")
  })

  await check("Public products query succeeds", async () => {
    const { error } = await publicClient.from("products").select("id").limit(1)
    if (error) throw new Error("Products query failed")
  })

  await check("Public orders read is denied", async () => {
    await requirePermissionDenied(publicClient, "orders")
  })

  await check("Public newsletter read is denied", async () => {
    await requirePermissionDenied(publicClient, "newsletter_subscribers")
  })

  await check("Secret staff query succeeds", async () => {
    const { error } = await secretClient.from("staff_users").select("id").limit(1)
    if (error) throw new Error("Staff query failed")
  })

  await check("Secret Auth admin access succeeds", async () => {
    const { error } = await secretClient.auth.admin.listUsers({ page: 1, perPage: 1 })
    if (error) throw new Error("Auth admin request failed")
  })

  if (failedChecks > 0) {
    console.error(`Supabase verification failed (${failedChecks} check(s)).`)
    process.exitCode = 1
    return
  }

  console.log("Supabase verification passed.")
}

main().catch(() => {
  console.error("FAIL  Unexpected verifier error")
  process.exitCode = 1
})
