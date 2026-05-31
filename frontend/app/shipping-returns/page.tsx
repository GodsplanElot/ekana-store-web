import { InfoBlock, InfoPage } from "@/components/info-page"
import { Providers } from "@/components/providers"

export const metadata = {
  title: "Shipping & Returns - Ekana Cosmetics",
  description: "Shipping timelines, final-sale policy, and support guidance.",
}

export default function ShippingReturnsPage() {
  return (
    <Providers>
      <InfoPage
        eyebrow="Support"
        title="Shipping & Returns"
        intro="Orders are carefully processed within 1-3 business days before delivery handoff."
      >
        <InfoBlock title="Delivery">
          <p>
            Orders are typically delivered within 2-5 business days in major
            cities, with slight variations for other locations and logistics
            conditions.
          </p>
        </InfoBlock>
        <InfoBlock title="Final Sale Policy">
          <p>
            In line with hygiene standards and product integrity, all purchases
            are final. We do not accept returns or exchanges unless an item is
            defective, damaged, or incorrect.
          </p>
        </InfoBlock>
        <InfoBlock title="Damaged or Incorrect Items">
          <p>
            Notify support within 48 hours of receipt with verifiable evidence.
            After assessment, Ekana Cosmetics may provide a replacement or store
            credit at its discretion.
          </p>
        </InfoBlock>
      </InfoPage>
    </Providers>
  )
}
