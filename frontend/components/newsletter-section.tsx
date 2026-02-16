"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function NewsletterSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="bg-primary rounded-xl px-6 py-12 md:px-12 md:py-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-primary-foreground mb-3">
            Join the Rosette Club
          </h2>
          <p className="text-sm text-primary-foreground/70 max-w-md mx-auto mb-8 leading-relaxed">
            Be the first to know about new launches, exclusive beauty tips, and members-only offers.
          </p>
          <form
            className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <Input
              type="email"
              placeholder="Your email address"
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-primary-foreground/30"
              aria-label="Email address"
            />
            <Button
              type="submit"
              variant="secondary"
              className="w-full sm:w-auto flex-shrink-0"
            >
              Subscribe
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
