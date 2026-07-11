import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden border-b border-foreground/10">
      <BrandLogo
        variant="watermark"
        priority
        sizes="620px"
        className="absolute -left-40 top-8 size-[560px] opacity-[0.055] md:-left-24 md:size-[660px]"
      />
      <div className="absolute inset-x-0 top-0 h-px bg-primary/20" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid min-h-[calc(100svh-72px)] grid-cols-1 items-center gap-10 py-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 lg:py-14">
          <div className="relative z-10 flex flex-col gap-6">
            <BrandLogo
              variant="seal"
              priority
              sizes="36px"
              markClassName="size-9 p-1"
              className="w-fit border-primary/20 bg-background/80"
            />
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                Ekana Cosmetics
              </p>
              <h1 className="max-w-2xl font-serif text-5xl leading-[0.98] text-foreground text-balance md:text-6xl lg:text-7xl">
                Beauty that feels composed, soft, and unmistakably yours.
              </h1>
            </div>
            <p className="max-w-xl text-base leading-8 text-muted-foreground md:text-lg">
              Glosses, liners, and lashes with a polished finish, built for fast mobile shopping and confident everyday wear.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="bg-primary text-primary-foreground shadow-[0_18px_34px_rgba(107,57,72,0.22)] hover:bg-primary/90"
                asChild
              >
                <Link href="/shop?category=Glosses">
                  Shop Glosses
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop?category=Lashes">Shop Lashes</Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/about">The Standard</Link>
              </Button>
            </div>
            <div className="grid max-w-xl grid-cols-3 gap-3 pt-2">
              {[
                ["Gloss", "glass shine"],
                ["Line", "soft detail"],
                ["Lash", "light drama"],
              ].map(([label, copy]) => (
                <div key={label} className="border-l border-primary/25 pl-3">
                  <p className="font-serif text-2xl text-foreground">{label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded-md border border-foreground/10 bg-card shadow-[0_30px_90px_rgba(58,35,29,0.14)] lg:min-h-[620px]">
            <Image
              src="/images/hero.jpg"
              alt="Ekana Cosmetics glosses, liners, and beauty products arranged on pink silk"
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 54vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,22,18,0)_42%,rgba(35,22,18,0.54)_100%)]" />
            <div className="absolute left-4 top-4 rounded-full border border-white/30 bg-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur md:left-6 md:top-6">
              <Sparkles className="mr-2 inline h-3.5 w-3.5" />
              New finish
            </div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 md:bottom-7 md:left-7 md:right-7">
              <div>
                {/*                 <BrandLogo
                  variant="lockup"
                  surface="ink"
                  sizes="46px"
                  markClassName="size-12"
                  textClassName="[&_span:first-child]:text-primary-foreground [&_span:last-child]:text-primary-foreground/65"
                /> */}
              </div>
              <p className="hidden max-w-[210px] text-right text-xs leading-5 text-white/80 sm:block">
                A mobile-first beauty counter for shades, restocks, and daily essentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
