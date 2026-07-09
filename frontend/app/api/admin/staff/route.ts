import { NextResponse } from "next/server"
import { z } from "zod"
import { writeAdminAuditLog } from "@/lib/server/admin-audit"
import { getCurrentStaff, staffHasRole, staffRoles } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"

const inviteSchema = z.object({
  email: z.string().trim().email(),
  displayName: z.string().trim().min(2).max(120),
  role: z.enum(["admin", "inventory", "support"]),
})
const updateSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(staffRoles),
  isActive: z.boolean(),
})

export async function POST(request: Request) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, ["owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = inviteSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, email and staff role" }, { status: 400 })

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })

  const email = parsed.data.email.toLowerCase()
  const { data: invite, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: new URL("/auth/callback?next=/admin/set-password", request.url).toString(),
    data: { display_name: parsed.data.displayName },
  })
  if (inviteError || !invite.user) {
    return NextResponse.json({ error: inviteError?.message ?? "Staff invitation failed" }, { status: 400 })
  }

  const { data: created, error: insertError } = await supabase.from("staff_users").insert({
    user_id: invite.user.id,
    email,
    display_name: parsed.data.displayName,
    role: parsed.data.role,
    is_active: true,
  }).select("id").single()

  if (insertError) {
    await supabase.auth.admin.deleteUser(invite.user.id)
    const status = insertError.code === "23505" ? 409 : 500
    return NextResponse.json({ error: status === 409 ? "That email is already a staff member" : insertError.message }, { status })
  }

  await writeAdminAuditLog({ staffUserId: staff.id, action: "staff.invited", entityType: "staff_user", entityId: created.id, metadata: { email, role: parsed.data.role } })
  return NextResponse.json({ ok: true }, { status: 201 })
}

export async function PATCH(request: Request) {
  const staff = await getCurrentStaff()
  if (!staff || !staffHasRole(staff, ["owner"])) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid staff update" }, { status: 400 })
  if (parsed.data.id === staff.id) return NextResponse.json({ error: "You cannot change your own access" }, { status: 409 })

  const supabase = createSupabaseAdmin()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  const { data: target } = await supabase.from("staff_users").select("role,email,is_active").eq("id", parsed.data.id).maybeSingle()
  if (!target) return NextResponse.json({ error: "Staff member not found" }, { status: 404 })

  if (target.role === "owner" && (parsed.data.role !== "owner" || !parsed.data.isActive)) {
    const { count } = await supabase.from("staff_users").select("id", { count: "exact", head: true }).eq("role", "owner").eq("is_active", true)
    if ((count ?? 0) <= 1) return NextResponse.json({ error: "The last active owner cannot be removed" }, { status: 409 })
  }

  const { error } = await supabase.from("staff_users").update({ role: parsed.data.role, is_active: parsed.data.isActive, updated_at: new Date().toISOString() }).eq("id", parsed.data.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAdminAuditLog({ staffUserId: staff.id, action: "staff.access_updated", entityType: "staff_user", entityId: parsed.data.id, metadata: { email: target.email, role: parsed.data.role, isActive: parsed.data.isActive } })
  return NextResponse.json({ ok: true })
}
