"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trackNewsletterSignup } from "@/lib/analytics"

export function NewsletterSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="bg-primary rounded-xl px-6 py-12 md:px-12 md:py-16 text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-primary-foreground mb-3">
            Join the Ekana Circle
          </h2>
          <p className="text-sm text-primary-foreground/70 max-w-md mx-auto mb-8 leading-relaxed">
            Be the first to know about new shades, restocks, and exclusive launches.
          </p>
          <form
            className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
            onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              setStatus("loading")

              const response = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: formData.get("email"),
                  source: "home",
                }),
              })

              if (!response.ok) {
                setStatus("error")
                setMessage("Enter a valid email address.")
                return
              }

              e.currentTarget.reset()
              setStatus("success")
              setMessage("You're on the list.")
              trackNewsletterSignup("home")
            }}
          >
            <Input
              name="email"
              type="email"
              placeholder="Your email address"
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-primary-foreground/30"
              aria-label="Email address"
            />
            <Button
              type="submit"
              variant="secondary"
              className="w-full sm:w-auto flex-shrink-0"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Subscribing" : "Subscribe"}
            </Button>
          </form>
          {message && (
            <p className="mt-4 text-sm text-primary-foreground/80">{message}</p>
          )}
        </div>
      </div>
    </section>
  )
}
