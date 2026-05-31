import { InfoBlock, InfoPage } from "@/components/info-page"
import { Providers } from "@/components/providers"

export const metadata = {
  title: "Privacy Policy - Ekana Cosmetics",
  description: "How Ekana Cosmetics handles customer information.",
}

export default function PrivacyPolicyPage() {
  return (
    <Providers>
      <InfoPage
        eyebrow="Legal"
        title="Privacy Policy"
        intro="This policy is a startup draft and should be reviewed by a qualified legal professional before public launch."
      >
        <InfoBlock title="Information We Collect">
          <p>
            We collect customer names, contact details, delivery information,
            and payment-related information needed for order fulfillment,
            customer support, and shopping experience improvements.
          </p>
        </InfoBlock>
        <InfoBlock title="How We Use Data">
          <p>
            Customer information is used for order processing, customer
            engagement, support, and service improvement. We do not sell
            customer information.
          </p>
        </InfoBlock>
        <InfoBlock title="Limited Sharing">
          <p>
            Limited sharing may occur only where necessary for service delivery,
            payment processing, logistics, or legal compliance.
          </p>
        </InfoBlock>
      </InfoPage>
    </Providers>
  )
}
