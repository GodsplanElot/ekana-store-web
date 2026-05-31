import { Resend } from "resend"
import { getOptionalEnv } from "@/lib/server/env"

export async function sendOrderEmails({
  customerEmail,
  customerName,
  reference,
  total,
}: {
  customerEmail: string
  customerName: string
  reference: string
  total: string
}) {
  const apiKey = getOptionalEnv("RESEND_API_KEY")
  const from = getOptionalEnv("RESEND_FROM_EMAIL")
  const adminEmail = getOptionalEnv("ORDER_NOTIFICATION_EMAIL")

  if (!apiKey || !from) return

  const resend = new Resend(apiKey)
  await resend.emails.send({
    from,
    to: customerEmail,
    subject: `Ekana order received - ${reference}`,
    text: `Hi ${customerName}, your Ekana Cosmetics order ${reference} has been received. Total: ${total}.`,
  })

  if (adminEmail) {
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: `New Ekana order - ${reference}`,
      text: `New order ${reference} from ${customerName} (${customerEmail}). Total: ${total}.`,
    })
  }
}
