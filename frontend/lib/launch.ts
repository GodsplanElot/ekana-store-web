export const DEFAULT_LAUNCH_AT = '2026-07-12T00:00:00+01:00'

export interface RemainingTime {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMilliseconds: number
}

export function resolveLaunchTimestamp(value = process.env.LAUNCH_AT) {
  const configuredValue = value?.trim() || DEFAULT_LAUNCH_AT
  const configuredTimestamp = Date.parse(configuredValue)

  if (Number.isFinite(configuredTimestamp)) {
    return configuredTimestamp
  }

  return Date.parse(DEFAULT_LAUNCH_AT)
}

export function resolveLaunchAt(value = process.env.LAUNCH_AT) {
  return new Date(resolveLaunchTimestamp(value)).toISOString()
}

export function isLaunchGateActive({
  enabled = process.env.LAUNCH_GATE_ENABLED,
  launchAt = process.env.LAUNCH_AT,
  now = Date.now(),
}: {
  enabled?: string
  launchAt?: string
  now?: number
} = {}) {
  const gateEnabled = enabled?.trim().toLowerCase() !== 'false'
  return gateEnabled && now < resolveLaunchTimestamp(launchAt)
}

export function getRemainingTime(
  launchTimestamp: number,
  now = Date.now(),
): RemainingTime {
  const totalMilliseconds = Math.max(0, launchTimestamp - now)
  const totalSeconds = Math.floor(totalMilliseconds / 1_000)

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    totalMilliseconds,
  }
}
