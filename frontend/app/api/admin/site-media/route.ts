import { NextResponse } from "next/server"
import { writeAdminAuditLog } from "@/lib/server/admin-audit"
import { getCurrentStaff, staffHasRole } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { siteMediaMutationSchema } from "@/lib/validation/site-media"

const mediaRoles = ["owner", "admin", "inventory"] as const

export async function POST(request: Request) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, mediaRoles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const parsed = siteMediaMutationSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid media payload", issues: parsed.error.flatten() }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const media = parsed.data
  const sortOrder = media.sortOrder ?? (await nextSortOrder(media.placement))
  const { data, error } = await supabase.from("site_media").insert({
    placement: media.placement,
    title: media.title || null,
    alt_text: media.altText,
    caption: media.caption || null,
    image_url: media.imageUrl,
    storage_path: media.storagePath || null,
    sort_order: sortOrder,
    is_active: media.isActive,
    created_by: staff.id,
    updated_by: staff.id,
  }).select("id").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAdminAuditLog({
    staffUserId: staff.id,
    action: "site_media.created",
    entityType: "site_media",
    entityId: data.id,
    metadata: { placement: media.placement, title: media.title },
  })
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}

async function nextSortOrder(placement: string) {
  const supabase = createSupabaseAdmin()
  if (!supabase) return 0

  const { data } = await supabase
    .from("site_media")
    .select("sort_order")
    .eq("placement", placement)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>()

  return typeof data?.sort_order === "number" ? data.sort_order + 1 : 0
}
