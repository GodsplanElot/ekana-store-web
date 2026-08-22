import type { Metadata } from "next"
import { SiteMediaManager } from "@/components/admin/site-media-manager"
import { requireStaff } from "@/lib/server/require-staff"
import { createSupabaseAdmin } from "@/lib/server/supabase-admin"
import { mapSiteMedia } from "@/lib/server/site-media"

export const metadata: Metadata = {
  title: "Media",
}

type SiteMediaAdminRow = {
  id: string
  placement: "home_hero"
  title: string | null
  alt_text: string
  caption: string | null
  image_url: string
  storage_path: string | null
  sort_order: number
  is_active: boolean
}

export default async function AdminMediaPage() {
  await requireStaff(["owner", "admin", "inventory"])
  const supabase = createSupabaseAdmin()

  const { data, error } = supabase
    ? await supabase
        .from("site_media")
        .select("id,placement,title,alt_text,caption,image_url,storage_path,sort_order,is_active")
        .eq("placement", "home_hero")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: null, error: { message: "Supabase is not configured" } }

  const items = error ? [] : (data ?? []).map((row) => mapSiteMedia(row as SiteMediaAdminRow))

  return (
    <section className="px-4 py-8 sm:px-7 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 border-b border-stone-900/15 pb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b5552]">Storefront media</p>
          <h1 className="mt-3 font-serif text-4xl">Media</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Manage homepage intro images without changing code.
          </p>
        </div>

        {error ? <div className="mb-6 border-l-2 border-red-700 bg-red-50 p-4 text-sm text-red-800">Media could not be loaded.</div> : null}
        <SiteMediaManager initialItems={items} />
      </div>
    </section>
  )
}
