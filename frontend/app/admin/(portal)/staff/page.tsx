import { InviteStaffForm } from "@/components/admin/invite-staff-form"
import { StaffAccessControls } from "@/components/admin/staff-access-controls"
import { requireStaff, type StaffRole } from "@/lib/server/require-staff"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type StaffRow = {
  id: string
  email: string
  display_name: string
  role: StaffRole
  is_active: boolean
  created_at: string
}

export default async function StaffPage() {
  const currentStaff = await requireStaff(["owner"])
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.from("staff_users").select("id,email,display_name,role,is_active,created_at").order("created_at", { ascending: true })
  const staff = (data ?? []) as StaffRow[]

  return <section className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12"><div className="mx-auto max-w-6xl"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Access control</p><h1 className="mt-3 font-serif text-4xl">Staff</h1><p className="mt-2 text-sm text-stone-600">Invite staff and assign only the access required for their work.</p></div><div className="mt-8"><InviteStaffForm /></div>{error ? <div className="mt-6 border-l-2 border-red-700 bg-red-50 p-4 text-sm text-red-800">Staff accounts could not be loaded.</div> : null}<div className="mt-5 overflow-hidden border border-stone-900/15 bg-[#fffdf9]"><div className="hidden grid-cols-[minmax(250px,1fr)_150px_320px] border-b border-stone-900/10 bg-stone-100/70 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500 md:grid"><span>Staff member</span><span>Joined</span><span className="text-right">Access</span></div>{staff.map((member) => <article className="grid gap-4 border-b border-stone-900/10 p-4 last:border-0 md:grid-cols-[minmax(250px,1fr)_150px_320px] md:items-center md:px-5" key={member.id}><div className="min-w-0"><div className="flex items-center gap-2"><span className={`size-2 rounded-full ${member.is_active ? "bg-emerald-600" : "bg-stone-400"}`} /><h2 className="truncate text-sm font-semibold">{member.display_name}</h2></div><p className="mt-1 truncate pl-4 text-xs text-stone-500">{member.email}</p></div><p className="text-xs text-stone-500">{new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(member.created_at))}</p><StaffAccessControls id={member.id} initialActive={member.is_active} initialRole={member.role} isCurrentUser={member.id === currentStaff.id} /></article>)}</div></div></section>
}
