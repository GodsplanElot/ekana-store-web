import { Providers } from "@/components/providers"
import { CheckoutContent } from "@/components/checkout-content"

export const metadata = {
  title: "Checkout - ROSETTE Beauty",
  description: "Complete your order.",
}

export default function CheckoutPage() {
  return (
    <Providers>
      <CheckoutContent />
    </Providers>
  )
}
