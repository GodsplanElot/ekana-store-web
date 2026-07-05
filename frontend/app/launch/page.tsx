import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { LaunchScreen } from '@/components/launch-screen'
import { isLaunchGateActive, resolveLaunchAt } from '@/lib/launch'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Launching Soon — Ekana Cosmetics',
  description:
    'Ekana Cosmetics opens Sunday, 12 July 2026. Join the list and count down with us.',
}

export default function LaunchPage() {
  if (!isLaunchGateActive()) redirect('/')
  return <LaunchScreen launchAt={resolveLaunchAt()} />
}
