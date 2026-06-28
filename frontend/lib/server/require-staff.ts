import "server-only"

import { redirect } from "next/navigation"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const staffRoles = ["owner", "admin", "inventory", "support"] as const

export type StaffRole = (typeof staffRoles)[number]

export type StaffUser = {
  id: string
  userId: string
  email: string
  displayName: string
  role: StaffRole
  isActive: boolean
}

type StaffUserRow = {
  id: string
  user_id: string
  email: string
  display_name: string
  role: StaffRole
  is_active: boolean
}

function mapStaffUser(row: StaffUserRow): StaffUser {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active,
  }
}

export async function getCurrentStaff(): Promise<StaffUser | null> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) return null

  const admin = createSupabaseAdmin()
  if (!admin) return null

  const { data, error } = await admin
    .from("staff_users")
    .select("id,user_id,email,display_name,role,is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle<StaffUserRow>()

  if (error || !data) return null

  return mapStaffUser(data)
}

export function staffHasRole(staff: StaffUser, allowedRoles: readonly StaffRole[]) {
  return allowedRoles.includes(staff.role)
}

export async function requireStaff(allowedRoles?: readonly StaffRole[]) {
  const staff = await getCurrentStaff()

  if (!staff) {
    redirect("/admin/login")
  }

  if (allowedRoles && !staffHasRole(staff, allowedRoles)) {
    redirect("/admin/access-denied")
  }

  return staff
}
