import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/server/admin-audit"
import { getCurrentStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { siteMediaUpdateSchema } from "@/lib/validation/site-media"

const mediaRoles = ["owner", "admin", "inventory"] as const

type MediaRouteProps = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: MediaRouteProps) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, mediaRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = siteMediaUpdateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid media payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const media = parsed.data
  const update: Record<string, unknown> = {
    updated_by: staff.id,
    updated_at: new Date().toISOString(),
  }

  if (media.placement) update.placement = media.placement
  if ("title" in media) update.title = media.title || null
  if (media.altText) update.alt_text = media.altText
  if ("caption" in media) update.caption = media.caption || null
  if (media.imageUrl) update.image_url = media.imageUrl
  if ("storagePath" in media) update.storage_path = media.storagePath || null
  if (typeof media.sortOrder === "number") update.sort_order = media.sortOrder
  if (typeof media.isActive === "boolean") update.is_active = media.isActive

  const { error } = await supabase.from("site_media").update(update).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAdminAuditLog({
    staffUserId: staff.id,
    action: "site_media.updated",
    entityType: "site_media",
    entityId: id,
    metadata: { fields: Object.keys(update).filter((key) => !["updated_by", "updated_at"].includes(key)) },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: Request, { params }: MediaRouteProps) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, mediaRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const { error } = await supabase.from("site_media").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAdminAuditLog({
    staffUserId: staff.id,
    action: "site_media.deleted",
    entityType: "site_media",
    entityId: id,
  })
  return NextResponse.json({ ok: true })
}
