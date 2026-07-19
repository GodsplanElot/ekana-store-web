import "server-only"

import { randomUUID } from "node:crypto"
import { Resend } from "resend"
import { formatNaira } from "@/lib/money"
import { getOptionalEnv } from "@/lib/server/env"
import {
  ORDER_NOTIFICATION_EMAIL_RECIPIENT,
  PaymentRepository,
  type NotificationOutboxRow,
} from "@/lib/server/payments/repository"

const OUTBOX_LEASE_MS = 5 * 60 * 1_000
const MAX_ROWS_PER_DISPATCH = 5

class PaymentEmailDeliveryError extends Error {
  constructor() {
    super("Payment email delivery failed.")
    this.name = "PaymentEmailDeliveryError"
  }
}

function retryDelayMs(attemptCount: number): number {
  const schedule = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000]
  return schedule[Math.min(Math.max(attemptCount - 1, 0), schedule.length - 1)]
}

function notificationMessage(row: NotificationOutboxRow) {
  const total = formatNaira(row.payload.total)
  if (row.template_key === "admin_payment_review") {
    return {
      subject: `Payment review required - ${row.payload.reference}`,
      text: `Payment for order ${row.payload.reference} from ${row.payload.customerName} requires review. Total: ${total}. Reason: ${row.payload.reviewReason ?? "unspecified"}. Do not fulfil this order until the payment evidence is reconciled.`,
    }
  }
  if (row.template_key === "admin_payment_confirmation") {
    return {
      subject: `Paid Ekana order - ${row.payload.reference}`,
      text: `Payment is confirmed for order ${row.payload.reference} from ${row.payload.customerName}. Total: ${total}.`,
    }
  }

  if (row.template_key === "payment_review") {
    return {
      subject: `Ekana payment under review - ${row.payload.reference}`,
      text: `Hi ${row.payload.customerName}, we received a payment update for order ${row.payload.reference}, but it needs a manual review before fulfillment. Total: ${total}. Please do not pay again. Our team will contact you if any action is required.`,
    }
  }

  return {
    subject: `Ekana payment confirmed - ${row.payload.reference}`,
    text: `Hi ${row.payload.customerName}, payment for your Ekana Cosmetics order ${row.payload.reference} is confirmed. Total: ${total}. Orders are processed within 1-3 business days. If an item arrives damaged, defective, or incorrect, please contact support within 48 hours with verifiable evidence.`,
  }
}

async function sendOutboxEmail(row: NotificationOutboxRow): Promise<void> {
  const apiKey = getOptionalEnv("RESEND_API_KEY")
  const from = getOptionalEnv("RESEND_FROM_EMAIL")
  if (!apiKey || !from) throw new PaymentEmailDeliveryError()

  const recipient =
    row.template_key.startsWith("admin_")
      ? getOptionalEnv("ORDER_NOTIFICATION_EMAIL")
      : row.recipient
  if (
    !recipient ||
    (row.template_key.startsWith("admin_") &&
      row.recipient !== ORDER_NOTIFICATION_EMAIL_RECIPIENT)
  ) {
    throw new PaymentEmailDeliveryError()
  }

  const resend = new Resend(apiKey)
  const message = notificationMessage(row)
  const result = await resend.emails.send(
    {
      from,
      to: recipient,
      subject: message.subject,
      text: message.text,
    },
    { idempotencyKey: row.dedupe_key }
  )
  if (result.error) throw new PaymentEmailDeliveryError()
}

export async function dispatchPaymentNotificationsBestEffort(
  paymentAttemptId: string
): Promise<void> {
  try {
    const repository = new PaymentRepository()
    const workerId = randomUUID()

    for (let index = 0; index < MAX_ROWS_PER_DISPATCH; index += 1) {
      const now = new Date()
      const row = await repository.claimNotificationForAttempt(
        paymentAttemptId,
        workerId,
        now,
        new Date(now.getTime() - OUTBOX_LEASE_MS)
      )
      if (!row) return

      try {
        await sendOutboxEmail(row)
        await repository.markNotificationSent(row, workerId, new Date())
      } catch {
        await repository.markNotificationFailed(
          row,
          workerId,
          new Date(Date.now() + retryDelayMs(row.attempt_count))
        )
      }
    }
  } catch {
    // Payment state is already durable. Notification retries must never undo it.
  }
}

export async function dispatchDuePaymentNotifications(
  limit = 20
): Promise<number> {
  const repository = new PaymentRepository()
  const now = new Date()
  const paymentAttemptIds =
    await repository.listDueNotificationAttemptIds(
      now,
      new Date(now.getTime() - OUTBOX_LEASE_MS),
      limit
    )

  for (const paymentAttemptId of paymentAttemptIds) {
    await dispatchPaymentNotificationsBestEffort(paymentAttemptId)
  }

  return paymentAttemptIds.length
}
