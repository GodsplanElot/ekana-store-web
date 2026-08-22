"use client"

import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { SiteMediaItem } from "@/lib/site-media"
import { cn } from "@/lib/utils"

const fallbackSlide: Pick<SiteMediaItem, "id" | "altText" | "caption" | "imageUrl" | "title"> = {
  id: "fallback-hero",
  title: "Signature intro",
  altText: "Ekana Cosmetics beauty products arranged on pink silk",
  caption: "A mobile-first beauty counter for shades, restocks, and daily essentials.",
  imageUrl: "/images/hero.jpg",
}

type HeroCarouselProps = {
  slides: SiteMediaItem[]
}

function shouldBypassOptimizer(src: string) {
  return src.includes("/storage/v1/object/public/")
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const preparedSlides = useMemo(() => (slides.length ? slides : [fallbackSlide]), [slides])
  const [activeIndex, setActiveIndex] = useState(0)
  const pointerStartX = useRef<number | null>(null)
  const hasMultipleSlides = preparedSlides.length > 1
  const visibleIndex = Math.min(activeIndex, preparedSlides.length - 1)

  const goTo = useCallback(
    (nextIndex: number) => {
      const boundedIndex = (nextIndex + preparedSlides.length) % preparedSlides.length
      setActiveIndex(boundedIndex)
    },
    [preparedSlides.length],
  )

  const goNext = useCallback(() => goTo(visibleIndex + 1), [goTo, visibleIndex])
  const goPrevious = useCallback(() => goTo(visibleIndex - 1), [goTo, visibleIndex])

  useEffect(() => {
    if (!hasMultipleSlides) return
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % preparedSlides.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [hasMultipleSlides, preparedSlides.length])

  function handlePointerEnd(clientX: number) {
    if (pointerStartX.current === null || !hasMultipleSlides) return
    const distance = clientX - pointerStartX.current
    pointerStartX.current = null
    if (Math.abs(distance) < 48) return
    if (distance < 0) goNext()
    else goPrevious()
  }

  const activeSlide = preparedSlides[visibleIndex]

  return (
    <div
      className="relative min-h-[420px] touch-pan-y overflow-hidden rounded-md border border-foreground/10 bg-card shadow-[0_30px_90px_rgba(58,35,29,0.14)] lg:min-h-[620px]"
      onPointerDown={(event) => {
        pointerStartX.current = event.clientX
      }}
      onPointerCancel={() => {
        pointerStartX.current = null
      }}
      onPointerUp={(event) => handlePointerEnd(event.clientX)}
    >
      {preparedSlides.map((slide, index) => (
        <Image
          key={slide.id}
          src={slide.imageUrl}
          alt={slide.altText}
          fill
          className={cn(
            "object-cover transition duration-700 ease-out",
            index === visibleIndex ? "scale-100 opacity-100" : "scale-[1.03] opacity-0",
          )}
          priority={index === 0}
          sizes="(max-width: 1024px) 100vw, 54vw"
          unoptimized={shouldBypassOptimizer(slide.imageUrl)}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,22,18,0)_38%,rgba(35,22,18,0.62)_100%)]" />

      {hasMultipleSlides ? (
        <div className="absolute left-4 right-4 top-4 flex justify-between">
          <button
            aria-label="Previous intro image"
            className="grid size-10 place-items-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur transition hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={goPrevious}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Next intro image"
            className="grid size-10 place-items-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur transition hover:bg-black/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={goNext}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}

      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 md:bottom-7 md:left-7 md:right-7">
        <div className="flex gap-2" aria-label="Intro image position">
          {preparedSlides.map((slide, index) => (
            <button
              key={slide.id}
              aria-label={`Show intro image ${index + 1}`}
              aria-current={index === visibleIndex ? "true" : undefined}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === visibleIndex ? "w-8 bg-white" : "w-2 bg-white/45",
                !hasMultipleSlides && "hidden",
              )}
              onClick={() => goTo(index)}
              type="button"
            />
          ))}
        </div>
        <p className="hidden max-w-[240px] text-right text-xs leading-5 text-white/85 sm:block">
          {activeSlide.caption || activeSlide.title || fallbackSlide.caption}
        </p>
      </div>
    </div>
  )
}
