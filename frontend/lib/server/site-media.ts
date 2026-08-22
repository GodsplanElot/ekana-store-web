import "server-only"

import type { SiteMediaItem, SiteMediaPlacement } from "@/lib/site-media"
import { createSupabasePublicClient } from "@/lib/supabase/public"

type SiteMediaRow = {
  id: string
  placement: SiteMediaPlacement
  title: string | null
  alt_text: string
  caption: string | null
  image_url: string
  storage_path: string | null
  sort_order: number
  is_active: boolean
}

export function mapSiteMedia(row: SiteMediaRow): SiteMediaItem {
  return {
    id: row.id,
    placement: row.placement,
    title: row.title,
    altText: row.alt_text,
    caption: row.caption,
    imageUrl: row.image_url,
    storagePath: row.storage_path,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }
}

export async function getSiteMedia(placement: SiteMediaPlacement) {
  const supabase = createSupabasePublicClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("site_media")
    .select("id,placement,title,alt_text,caption,image_url,storage_path,sort_order,is_active")
    .eq("placement", placement)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Site media query failed", {
      placement,
      error: error.message,
    })
    return []
  }

  return (data ?? []).map((row) => mapSiteMedia(row as SiteMediaRow))
}
