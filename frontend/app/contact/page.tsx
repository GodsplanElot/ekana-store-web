import { ExternalLink, Mail, Instagram } from "lucide-react"
import { InfoPage } from "@/components/info-page"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { publicSiteConfig } from "@/lib/site-config"

export const metadata = {
  title: "Contact - Ekana Cosmetics",
  description: "Contact Ekana Cosmetics support and social channels.",
}

export default function ContactPage() {
  const { supportEmail, instagramUrl, pinterestUrl } = publicSiteConfig
  const hasContactChannel = Boolean(
    supportEmail || instagramUrl || pinterestUrl
  )

  return (
    <Providers>
      <InfoPage
        eyebrow="Support"
        title="Contact Ekana"
        intro="Reach out for delivery questions, product issues, collaborations, or support."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {supportEmail ? (
            <Button asChild size="lg" className="justify-start">
              <a href={`mailto:${supportEmail}`}>
                <Mail className="mr-2 h-4 w-4" />
                Email Support
              </a>
            </Button>
          ) : null}
          {instagramUrl ? (
            <Button asChild size="lg" variant="outline" className="justify-start">
              <a href={instagramUrl} rel="noreferrer" target="_blank">
                <Instagram className="mr-2 h-4 w-4" />
                Instagram
              </a>
            </Button>
          ) : null}
          {pinterestUrl ? (
            <Button asChild size="lg" variant="outline" className="justify-start">
              <a href={pinterestUrl} rel="noreferrer" target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Pinterest
              </a>
            </Button>
          ) : null}
          {!hasContactChannel ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Contact details will be published here soon.
            </p>
          ) : null}
        </div>
      </InfoPage>
    </Providers>
  )
}
