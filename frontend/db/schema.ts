import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export type OrderItemSnapshot = {
  productId: string
  name: string
  price: number
  quantity: number
  lineTotal: number
}

export type PaymentAttemptStatus =
  | "created"
  | "initializing"
  | "initialized"
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "abandoned"
  | "cancelled"
  | "released"
  | "review"
  | "refund_pending"
  | "refunded"
  | "partially_refunded"

export type OrderPaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "abandoned"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "refund_pending"
  | "reversed"
  | "review"

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: integer("price").notNull(),
  imageUrl: text("image_url").notNull(),
  shade: text("shade"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  inventoryCount: integer("inventory_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isRestocked: boolean("is_restocked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  reference: text("reference").notNull().unique(),
  customerEmail: text("customer_email").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryCity: text("delivery_city").notNull(),
  orderNotes: text("order_notes"),
  subtotal: integer("subtotal").notNull(),
  deliveryFee: integer("delivery_fee").notNull(),
  total: integer("total").notNull(),
  paymentStatus: text("payment_status").$type<OrderPaymentStatus>().notNull().default("pending"),
  paymentCurrency: text("payment_currency").$type<"NGN">().notNull().default("NGN"),
  fulfillmentStatus: text("fulfillment_status").notNull().default("new"),
  paystackReference: text("paystack_reference"),
  items: jsonb("items").$type<OrderItemSnapshot[]>().notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paymentConfirmedAt: timestamp("payment_confirmed_at", { withTimezone: true }),
  paymentConfirmationSource: text("payment_confirmation_source").$type<"webhook" | "verification" | "reconciliation">(),
  paymentConfirmationQueuedAt: timestamp("payment_confirmation_queued_at", { withTimezone: true }),
  paymentConfirmationSentAt: timestamp("payment_confirmation_sent_at", { withTimezone: true }),
  paymentFailureReason: text("payment_failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const paymentAttempts = pgTable("payment_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  provider: text("provider").$type<"paystack">().notNull().default("paystack"),
  providerDomain: text("provider_domain").$type<"test" | "live">().notNull(),
  reference: text("reference").notNull().unique(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  requestFingerprint: text("request_fingerprint").notNull(),
  expectedAmountKobo: bigint("expected_amount_kobo", { mode: "number" }).notNull(),
  currency: text("currency").$type<"NGN">().notNull().default("NGN"),
  status: text("status").$type<PaymentAttemptStatus>().notNull().default("created"),
  providerStatus: text("provider_status"),
  providerTransactionId: text("provider_transaction_id"),
  initializationClaimToken: text("initialization_claim_token"),
  initializationClaimedAt: timestamp("initialization_claimed_at", { withTimezone: true }),
  initializationClaimExpiresAt: timestamp("initialization_claim_expires_at", { withTimezone: true }),
  authorizationUrl: text("authorization_url"),
  accessCode: text("access_code"),
  gatewayResponse: text("gateway_response"),
  failureCode: text("failure_code"),
  failureMessage: text("failure_message"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  initializedAt: timestamp("initialized_at", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("payment_attempts_order_created_idx").on(table.orderId, table.createdAt),
  index("payment_attempts_status_expiry_idx").on(table.status, table.expiresAt),
])

export const inventoryReservations = pgTable("inventory_reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  paymentAttemptId: uuid("payment_attempt_id").notNull().references(() => paymentAttempts.id, { onDelete: "restrict" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  status: text("status").$type<"reserved" | "captured" | "released">().notNull().default("reserved"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  releaseReason: text("release_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("inventory_reservations_attempt_status_idx").on(table.paymentAttemptId, table.status),
  index("inventory_reservations_expiry_idx").on(table.expiresAt),
])

export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  provider: text("provider").$type<"paystack">().notNull().default("paystack"),
  providerDomain: text("provider_domain").$type<"test" | "live">().notNull(),
  eventKey: text("event_key").notNull().unique(),
  eventType: text("event_type").notNull(),
  eventSource: text("event_source").$type<"webhook" | "verification" | "reconciliation" | "system" | "admin">().notNull(),
  reference: text("reference").notNull(),
  providerTransactionId: text("provider_transaction_id"),
  providerStatus: text("provider_status"),
  amountKobo: bigint("amount_kobo", { mode: "number" }),
  currency: text("currency"),
  outcome: text("outcome").$type<"applied" | "duplicate" | "ignored" | "rejected" | "error">().notNull(),
  outcomeReason: text("outcome_reason"),
  summary: jsonb("summary").$type<Record<string, unknown>>().notNull().default({}),
  occurredAt: timestamp("occurred_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("payment_events_reference_received_idx").on(table.reference, table.receivedAt),
  index("payment_events_attempt_received_idx").on(table.paymentAttemptId, table.receivedAt),
])

export const notificationOutbox = pgTable("notification_outbox", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  paymentAttemptId: uuid("payment_attempt_id").references(() => paymentAttempts.id, { onDelete: "restrict" }),
  channel: text("channel").$type<"email">().notNull().default("email"),
  templateKey: text("template_key").notNull(),
  recipient: text("recipient").notNull(),
  dedupeKey: text("dedupe_key").notNull().unique(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").$type<"pending" | "processing" | "sent" | "failed" | "dead">().notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(5),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  lockedBy: text("locked_by"),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("notification_outbox_delivery_idx").on(table.status, table.nextAttemptAt, table.createdAt),
])

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("website"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const staffUsers = pgTable("staff_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").$type<"owner" | "admin" | "inventory" | "support">().notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  staffUserId: uuid("staff_user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
