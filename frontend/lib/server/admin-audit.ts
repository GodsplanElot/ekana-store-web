import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

type AuditEvent = {
  staffUserId: string
  action: string
  entityType: string
  entityId: string
  metadata?: Record<string, unknown>
}

export async function writeAdminAuditLog(event: AuditEvent) {
  const supabase = createSupabaseAdmin()
  if (!supabase) return

  const { error } = await supabase.from("admin_audit_logs").insert({
    staff_user_id: event.staffUserId,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    metadata: event.metadata ?? {},
  })

  if (error) {
    console.error("Admin audit log write failed", {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      error: error.message,
    })
  }
}
