import Image from 'next/image'
import { ArrowUpRight, Instagram } from 'lucide-react'

import { LaunchCountdown } from '@/components/launch-countdown'

export function LaunchScreen({ launchAt }: { launchAt: string }) {
  return (
    <main className='launch-page relative min-h-svh overflow-hidden bg-[#f1e9e4] text-[#29161b]'>
      <div className='launch-grain pointer-events-none fixed inset-0 z-30 opacity-35' />

      <div className='grid min-h-svh lg:grid-cols-[minmax(22rem,0.82fr)_minmax(38rem,1.18fr)]'>
        <section className='relative min-h-[34svh] overflow-hidden lg:min-h-svh'>
          <Image
            src='/images/hero.jpg'
            alt='Ekana Cosmetics beauty collection'
            fill
            priority
            sizes='(min-width: 1024px) 42vw, 100vw'
            className='object-cover object-center'
          />
          <div className='absolute inset-0 bg-[linear-gradient(180deg,rgba(38,13,21,0.06),rgba(38,13,21,0.52))]' />

          <div className='absolute inset-x-0 top-0 flex items-center justify-between p-5 text-[#fff9f4] sm:p-8 lg:p-10'>
            <p className='launch-wordmark text-xl tracking-[-0.03em] sm:text-2xl'>
              Ekana Cosmetics
            </p>
            <p className='text-[0.62rem] font-semibold uppercase tracking-[0.28em]'>
              Lagos · Nigeria
            </p>
          </div>

          <div className='absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-[#fff9f4] sm:p-8 lg:p-10'>
            <p className='max-w-xs text-xs leading-5 text-white/80'>
              Glosses, liners and lashes shaped by detail, comfort and quiet
              confidence.
            </p>
            <span className='hidden size-12 place-items-center rounded-full border border-white/40 sm:grid'>
              <ArrowUpRight className='size-4' aria-hidden='true' />
            </span>
          </div>
        </section>

        <section className='relative flex min-h-[66svh] flex-col justify-between px-5 py-8 sm:px-10 sm:py-10 lg:min-h-svh lg:px-[clamp(3rem,7vw,7rem)] lg:py-12'>
          <div
            className='launch-orb pointer-events-none absolute -right-40 -top-44 size-[34rem] rounded-full'
            aria-hidden='true'
          />

          <div className='relative flex items-center justify-between border-b border-[#4f2730]/15 pb-5'>
            <p className='text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-[#824c57]'>
              The new beauty ritual
            </p>
            <time
              dateTime={launchAt}
              className='text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#824c57]'
            >
              12 · 07 · 26
            </time>
          </div>

          <div className='relative mx-auto w-full max-w-3xl py-12 sm:py-16 lg:py-10'>
            <p className='launch-reveal text-xs font-semibold uppercase tracking-[0.3em] text-[#a35765]'>
              Opening next Sunday
            </p>
            <h1 className='launch-display launch-reveal launch-delay-1 mt-5 max-w-3xl text-[clamp(3.3rem,8vw,7.5rem)] leading-[0.84] tracking-[-0.055em]'>
              Beauty,
              <br />
              considered.
            </h1>
            <p className='launch-reveal launch-delay-2 mt-7 max-w-lg text-sm leading-6 text-[#69454d] sm:text-base sm:leading-7'>
              Something refined is taking shape. Join us when Ekana opens its
              doors on Sunday, 12 July at midnight WAT.
            </p>

            <LaunchCountdown launchAt={launchAt} />
          </div>

          <div className='relative flex items-center justify-between border-t border-[#4f2730]/15 pt-5 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-[#824c57]'>
            <p>© 2026 Ekana</p>
            <a
              href='https://instagram.com'
              rel='noreferrer'
              target='_blank'
              className='flex items-center gap-2 transition-colors hover:text-[#29161b]'
              aria-label='Ekana Cosmetics on Instagram'
            >
              <Instagram className='size-3.5' aria-hidden='true' />
              Instagram
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
