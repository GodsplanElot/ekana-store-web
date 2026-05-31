import { InfoBlock, InfoPage } from "@/components/info-page"
import { Providers } from "@/components/providers"

export const metadata = {
  title: "Terms and Conditions - Ekana Cosmetics",
  description: "Terms for using the Ekana Cosmetics platform.",
}

export default function TermsPage() {
  return (
    <Providers>
      <InfoPage
        eyebrow="Legal"
        title="Terms and Conditions"
        intro="These terms are a structured draft and should be reviewed before launch."
      >
        <InfoBlock title="Platform Use">
          <p>
            By accessing the Ekana Cosmetics platform, users agree to interact
            with the platform lawfully and in good faith.
          </p>
        </InfoBlock>
        <InfoBlock title="Product Availability">
          <p>
            Product offerings are subject to availability. Ekana Cosmetics may
            amend product details, pricing, or discontinue items at its
            discretion.
          </p>
        </InfoBlock>
        <InfoBlock title="Intellectual Property and Liability">
          <p>
            Users may not misuse the brand&apos;s intellectual property. To the
            fullest extent permitted by law, Ekana Cosmetics disclaims liability
            for indirect, incidental, or consequential damages arising from use
            of its products or services.
          </p>
        </InfoBlock>
      </InfoPage>
    </Providers>
  )
}
