import { requireStaff } from "@/lib/server/require-staff"

export default async function StaffPage() {
  await requireStaff(["owner"])
  return <section className="px-4 py-10 sm:px-7 lg:px-10"><div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Access control</p><h1 className="mt-3 font-serif text-4xl">Staff</h1><p className="mt-3 text-sm text-stone-600">Staff invitations and role management will be available to store owners.</p></div></section>
}
