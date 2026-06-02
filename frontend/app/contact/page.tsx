import { Mail, Instagram } from "lucide-react"
import { InfoPage } from "@/components/info-page"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Contact - Ekana Cosmetics",
  description: "Contact Ekana Cosmetics support and social channels.",
}

export default function ContactPage() {
  return (
    <Providers>
      <InfoPage
        eyebrow="Support"
        title="Contact Ekana"
        intro="Reach out for delivery questions, product issues, collaborations, or support."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="justify-start">
            <a href="mailto:support@ekanacosmetics.com">
              <Mail className="mr-2 h-4 w-4" />
              Email Support
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="justify-start">
            <a href="https://instagram.com" rel="noreferrer" target="_blank">
              <Instagram className="mr-2 h-4 w-4" />
              Instagram
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="justify-start">
            <a href="https://pinterest.com" rel="noreferrer" target="_blank">
              Pinterest
            </a>
          </Button>
        </div>
      </InfoPage>
    </Providers>
  )
}
