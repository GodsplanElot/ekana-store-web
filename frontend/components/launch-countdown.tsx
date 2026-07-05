'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'

import { getRemainingTime, type RemainingTime } from '@/lib/launch'

const UNITS: Array<{
  key: keyof Pick<RemainingTime, 'days' | 'hours' | 'minutes' | 'seconds'>
  label: string
}> = [
  { key: 'days', label: 'Days' },
  { key: 'hours', label: 'Hours' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'seconds', label: 'Seconds' },
]

type SignupStatus = 'idle' | 'loading' | 'success' | 'error'

export function LaunchCountdown({ launchAt }: { launchAt: string }) {
  const launchTimestamp = Date.parse(launchAt)
  const [remaining, setRemaining] = useState<RemainingTime | null>(null)
  const [status, setStatus] = useState<SignupStatus>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const update = () => {
      const next = getRemainingTime(launchTimestamp)
      setRemaining(next)
      if (next.totalMilliseconds === 0) window.location.reload()
    }

    update()
    const interval = window.setInterval(update, 1_000)
    return () => window.clearInterval(interval)
  }, [launchTimestamp])

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.get('email'),
          source: 'countdown',
        }),
      })

      if (!response.ok) throw new Error('Unable to join the list')
      form.reset()
      setStatus('success')
      setMessage('You are on the list. Watch your inbox.')
    } catch {
      setStatus('error')
      setMessage('Please check your email and try again.')
    }
  }

  return (
    <>
      <div
        className='launch-reveal launch-delay-3 mt-10 grid grid-cols-4 border-y border-[#4f2730]/15 py-5 sm:mt-12 sm:py-7'
        aria-label='Time remaining until launch'
      >
        {UNITS.map(({ key, label }, index) => (
          <div
            className={
              index === 0
                ? 'pr-3'
                : 'border-l border-[#4f2730]/15 px-3 sm:px-5'
            }
            key={key}
          >
            <span className='launch-display block text-3xl tabular-nums tracking-[-0.04em] sm:text-5xl lg:text-6xl'>
              {remaining ? String(remaining[key]).padStart(2, '0') : '—'}
            </span>
            <span className='mt-1 block text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-[#94616b] sm:mt-2 sm:text-[0.62rem]'>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className='launch-reveal launch-delay-4 mt-9 sm:mt-11'>
        {status === 'success' ? (
          <div className='flex min-h-12 items-center gap-3 border-b border-[#4f2730]/30 pb-3 text-sm text-[#4f2730]'>
            <span className='grid size-7 place-items-center rounded-full bg-[#4f2730] text-[#f8f1ec]'>
              <Check className='size-3.5' aria-hidden='true' />
            </span>
            {message}
          </div>
        ) : (
          <>
            <p className='mb-3 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#824c57]'>
              Be first through the door
            </p>
            <form
              className='flex border-b border-[#4f2730]/35'
              onSubmit={handleSignup}
            >
              <label className='sr-only' htmlFor='launch-email'>
                Email address
              </label>
              <input
                required
                id='launch-email'
                name='email'
                type='email'
                autoComplete='email'
                placeholder='Your email address'
                className='h-12 min-w-0 flex-1 bg-transparent pr-4 text-sm outline-none placeholder:text-[#8d6971]'
              />
              <button
                type='submit'
                disabled={status === 'loading'}
                className='group inline-flex h-12 items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] transition-opacity hover:opacity-60 disabled:cursor-wait disabled:opacity-50'
              >
                {status === 'loading' ? 'Joining' : 'Notify me'}
                <ArrowUpRight
                  className='size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5'
                  aria-hidden='true'
                />
              </button>
            </form>
            {message ? (
              <p className='mt-3 text-xs text-[#a33f50]' role='alert'>
                {message}
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}
