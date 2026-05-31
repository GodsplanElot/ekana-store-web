import { getOptionalEnv } from "@/lib/server/env"

interface InitializePaystackPaymentInput {
  email: string
  amount: number
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}

export async function initializePaystackPayment(input: InitializePaystackPaymentInput) {
  const secretKey = getOptionalEnv("PAYSTACK_SECRET_KEY")
  if (!secretKey) {
    return { authorizationUrl: null, accessCode: null, configured: false }
  }

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  })

  const payload = await response.json()
  if (!response.ok || !payload.status) {
    throw new Error(payload.message ?? "Unable to initialize Paystack payment")
  }

  return {
    authorizationUrl: payload.data.authorization_url as string,
    accessCode: payload.data.access_code as string,
    configured: true,
  }
}

export async function verifyPaystackPayment(reference: string) {
  const secretKey = getOptionalEnv("PAYSTACK_SECRET_KEY")
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured")
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  )

  const payload = await response.json()
  if (!response.ok || !payload.status) {
    throw new Error(payload.message ?? "Unable to verify Paystack payment")
  }

  return payload.data as { status: string; reference: string; amount: number }
}
